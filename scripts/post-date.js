'use strict'
/* 文章更新日期(唯一实现, 2026-09-13)。
   判定链(与 lib/project-date.js 同构 —— 工程侧早已如此, 这里补齐文章侧):
     ① front matter 显式 `updated`(人工覆盖, 最高优先)
     ② 文章源文件路径的 git 最后提交日
     ③ 文件系统 mtime
     ④ front matter 的 date 兜底

   为什么②必须优先于③: hexo 的 `updated_option: mtime` 会把"文件最后修改时间"当成文章更新时间,
   而 mtime 记录的是**文件被复制/检出**的时刻, 不是内容改动的时刻。实测证据(2026-09-13):
     - `LM-Studio-OpenCode 接入指南` 的文件 mtime = 09-13 15:02, 而它真实的最后提交是 08-31 07:29
       —— 偏晚 13 天, 结构化数据里 dateModified 因此谎报"这篇文章今天被改过";
     - 15 篇文章的 mtime 只落在 3 个值上(09-13 15:02×9 / 08-31 07:29×4 / 09-13 17:29×2),
       这种成批聚集正是"被复制/检出"的特征, 而非各自内容改动的时刻;
     - 换机器、重新 clone、或 CI 里干净检出后, 全部文章的 mtime 会一起重置为检出时间,
       dateModified 会集体漂到同一天。
   git 提交时间随仓库历史走, 因此跨机器稳定, 且与"改 → 提交 → 部署"的工作流一致
   (改完文章要 commit, 日期才会前进 —— 这是有意为之)。

   为什么用 after_post_render 过滤器而不是 hexo 的 updated_option 配置:
   hexo 的 `updated_option` 只支持 mtime / date / empty 三种取值, 无法使用 git 提交时间;
   本文件把 `updated` 统一改写成"内容真实更新时间", 于是所有读取 `page.updated` 的地方
   (文章页 head 的 dateModified / article:modified_time、首页 LATEST SIGNAL 与"最新文章"排序、
   feed)自动得到同一个正确值, 不需要各自打补丁。

   无 git / 该文件无提交记录时自动回退 mtime, 不抛错 —— 与工程侧行为一致。 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { fmtDate } = require('./lib/date')

const REPO_ROOT = path.join(__dirname, '..')

/* 源文件路径的 git 最后提交日(YYYY-MM-DD); 无 git 或无记录时返回 '' */
function gitLastCommitDate(relPath) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', relPath], {
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

/* 文件 mtime 日期(YYYY-MM-DD); 取不到返回 '' */
function mtimeDate(absPath) {
  try { return fmtDate(fs.statSync(absPath).mtime) } catch (e) { return '' }
}

/* post.source 形如 `_posts/xxx.md`, 相对 source/ */
function sourceRelPath(post) {
  return post.source ? path.posix.join('source', post.source) : ''
}

function postUpdated(post) {
  // ① 显式覆盖: front matter 自带 updated 时不动它(hexo 已赋好值)
  const raw = post.raw || ''
  if (/^updated\s*:/m.test(raw)) return post.updated
  // ② git 提交日
  const rel = sourceRelPath(post)
  if (rel) {
    const g = gitLastCommitDate(rel)
    if (g) return new Date(g)
  }
  // ③ mtime(hexo 的默认行为, 已在 post.updated 上)
  if (post.updated) return post.updated
  // ④ date 兜底
  const mt = rel ? mtimeDate(path.join(REPO_ROOT, rel)) : ''
  return mt ? new Date(mt) : post.date
}

hexo.extend.filter.register('after_post_render', function (post) {
  try {
    const next = postUpdated(post)
    if (next) post.updated = next
  } catch (e) { /* 任何异常都保持 hexo 原值, 不让构建因日期失败 */ }
  return post
})
