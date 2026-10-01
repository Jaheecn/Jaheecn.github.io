'use strict'
/* 阶段3 · 3.1 单元测试: scripts/lib/project-date.js 的 projectUpdated
   逐级锁定 5 级判定链(阶段2 批次F 加固后的实现):
     ① 显式 updated → ② git 最后提交日 → ③ 资产目录内文件 mtime → ④ 目录 mtime → ⑤ date
   注: ② 的断言动态读取 git log 结果做对比, 不写死日期, 换机器/重新 clone 也不会误报。 */
const { test } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')
const fs = require('node:fs')
const { execFileSync } = require('node:child_process')

const ROOT = path.join(__dirname, '..')
const ASSETS = path.join(ROOT, 'source', 'assets', 'projects')
const { projectUpdated } = require(path.join(ROOT, 'scripts', 'lib', 'project-date.js'))

const linkOf = dir => '/assets/projects/' + dir + '/f.zip'
const hasGit = () => {
  try { execFileSync('git', ['rev-parse', '--git-dir'], { cwd: ROOT, stdio: 'ignore' }); return true } catch (e) { return false }
}
const gitDateOf = rel => {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', rel], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
    return out ? out.slice(0, 10) : ''
  } catch (e) { return '' }
}
const withTmpDir = (name, fn) => {
  const dir = path.join(ASSETS, name)
  fs.rmSync(dir, { recursive: true, force: true })   // 幂等清理上次残留
  try {
    fs.mkdirSync(dir, { recursive: true })
    fn(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
    assert.strictEqual(fs.existsSync(dir), false, '临时资产目录必须清理干净(否则会被复制进产物)')
  }
}

test('① 显式 updated 优先于一切(即使资产目录存在)', () => {
  assert.strictEqual(
    projectUpdated({ updated: '2020-01-01', downloads: [{ url: linkOf('琛光无人机') }] }),
    '2020-01-01'
  )
})

test('⑤ 无 downloads -> date 兜底', () => {
  assert.strictEqual(projectUpdated({ date: '2026' }), '2026')
})

test('⑤ downloads 为空数组 -> date 兜底', () => {
  assert.strictEqual(projectUpdated({ date: '2025', downloads: [] }), '2025')
})

test('⑤ url 不含 assets/projects 前缀 -> date 兜底', () => {
  assert.strictEqual(
    projectUpdated({ date: '2025', downloads: [{ url: 'https://example.com/x.zip' }] }),
    '2025'
  )
})

test('目录不存在 -> date 兜底且不抛错', () => {
  assert.strictEqual(
    projectUpdated({ date: '2025', downloads: [{ url: linkOf('__这个目录不存在__') }] }),
    '2025'
  )
})

test('下载项用 href 字段(而非 url)同样可解析', () => {
  assert.strictEqual(projectUpdated({ updated: '2019-09-09', downloads: [{ href: linkOf('琛光无人机') }] }), '2019-09-09')
})

test('② git 最后提交日生效(与 git log 动态对比)', { skip: hasGit() ? false : '当前目录不是 git 仓库' }, () => {
  const rel = 'source/assets/projects/琛光无人机'
  const expected = gitDateOf(rel)
  if (!expected) return   // 该路径无提交记录时, 由 ③/④/⑤ 接管, 本用例无意义
  const got = projectUpdated({ downloads: [{ url: linkOf('琛光无人机') }] })
  assert.strictEqual(got, expected)
  assert.match(got, /^\d{4}-\d{2}-\d{2}$/)
})

test('③ 未纳入版本控制的目录 -> 回退到文件 mtime', () => {
  withTmpDir('__unit_test_tmp__', dir => {
    const f = path.join(dir, 'sample.bin')
    fs.writeFileSync(f, 'x')
    const d = new Date(2021, 2, 4, 12, 0, 0)   // 用正午, 避免 UTC 转换跨日
    fs.utimesSync(f, d, d)
    assert.strictEqual(projectUpdated({ downloads: [{ url: linkOf('__unit_test_tmp__') }] }), '2021-03-04')
  })
})

test('③ 目录内取"最新"文件的 mtime', () => {
  withTmpDir('__unit_test_tmp2__', dir => {
    const older = path.join(dir, 'a.bin')
    const newer = path.join(dir, 'b.bin')
    fs.writeFileSync(older, 'x')
    fs.writeFileSync(newer, 'y')
    fs.utimesSync(older, new Date(2020, 0, 1, 12), new Date(2020, 0, 1, 12))
    fs.utimesSync(newer, new Date(2022, 5, 6, 12), new Date(2022, 5, 6, 12))
    assert.strictEqual(projectUpdated({ downloads: [{ url: linkOf('__unit_test_tmp2__') }] }), '2022-06-06')
  })
})

test('④ 目录为空(仅目录 mtime) -> 不抛错且返回日期格式', () => {
  withTmpDir('__unit_test_tmp3__', dir => {
    const got = projectUpdated({ downloads: [{ url: linkOf('__unit_test_tmp3__') }], date: '2025' })
    assert.match(got, /^\d{4}-\d{2}-\d{2}$/)
  })
})

test('返回值必须是 YYYY-MM-DD 或原样 date(供模板做 datetime 属性)', () => {
  const got = projectUpdated({ downloads: [{ url: linkOf('琛光无人机') }] })
  assert.match(got, /^\d{4}-\d{2}-\d{2}$/)
  assert.strictEqual(got.length, 10)
})
