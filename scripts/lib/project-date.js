'use strict'
/* 工程更新日期(唯一实现, A1 2026-09-02; 2026-09-11 加固 git 提交日优先)。
   判定链:
     ① 显式 updated 字段(人工覆盖, 最高优先)
     ② 资产路径的 git 最后提交日(仓库内稳定: git clone / 换机 / 重装后不失真)
     ③ 资产目录内最新文件的 mtime(未纳入版本控制, 或构建环境无 git 时)
     ④ 资产目录自身的 mtime
     ⑤ date 兜底
   ②为何优先于③: 检出会刷新 mtime, 所以 mtime 不能作为跨机器的真值;
   而 git 提交时间随仓库历史走。注意: 改完资产需 commit, 日期才会前进
   —— 与"改 → 提交 → 部署"的工作流一致。
   无 git / 该路径无提交记录时自动回退 ③, 不抛错。 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { fmtDate } = require('./date')

const REPO_ROOT = path.join(__dirname, '..', '..')

/* 资产目录的 git 最后提交日(YYYY-MM-DD); 无 git 或无记录时返回 '' */
function gitLastCommitDate(dirKey) {
  try {
    const rel = path.posix.join('source', 'assets', 'projects', dirKey)
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', rel], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000
    }).trim()
    return out ? out.slice(0, 10) : ''
  } catch (e) {
    return ''
  }
}

/* 资产目录的 mtime 日期: 目录内最新文件优先, 否则目录自身; 都不行返回 '' */
function mtimeDate(dir) {
  try {
    if (fs.existsSync(dir)) {
      let maxM = 0
      for (const f of fs.readdirSync(dir)) {
        try { maxM = Math.max(maxM, fs.statSync(path.join(dir, f)).mtime.getTime()) } catch (e) {}
      }
      if (maxM) return new Date(maxM).toISOString().slice(0, 10)
    }
  } catch (e) { /* 继续兜底 */ }
  try { return fmtDate(fs.statSync(dir).mtime) } catch (e) { /* 目录缺失 */ }
  return ''
}

function projectUpdated(p) {
  if (p.updated) return String(p.updated)
  const dl = (p.downloads && p.downloads[0] && (p.downloads[0].href || p.downloads[0].url)) || ''
  const d = decodeURIComponent(String(dl).replace(/^https?:\/\/[^/]+/, ''))
  const m = d.match(/^\/assets\/projects\/([^/]+)\//)
  if (m) {
    const gitDate = gitLastCommitDate(m[1])
    if (gitDate) return gitDate
    const mt = mtimeDate(path.join(REPO_ROOT, 'source', 'assets', 'projects', m[1]))
    if (mt) return mt
  }
  return p.date || ''
}

module.exports = { projectUpdated }
