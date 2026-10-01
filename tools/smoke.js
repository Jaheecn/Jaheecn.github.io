'use strict'
/* 构建后冒烟检查(阶段3 · 批次J)
   用途: 把"交接单第三节的验证判据"变成可执行断言, 让"改完 → 构建 → 验收"闭环。
   三种模式:
     node tools/smoke.js                    默认: 结构断言(不会误报, 适合每次构建)
     node tools/smoke.js --strict           基线比对(与 test/baseline.json 精确对比)
     node tools/smoke.js --update-baseline  用当前产物刷新基线
   任一断言失败 → 非零退出(与 minify.js 的"失败必须可察觉"一致)。

   ⚠️ 本文件必须留在 scripts/ 之外(现位于 tools/)。
   hexo 会把 scripts/ 下的所有 .js 当作插件脚本自动加载执行 —— 实测把本文件放在
   scripts/ 时: `hexo clean` 与 `hexo generate` 一启动就触发本检查, 失败时
   process.exit(1) 直接中断 hexo 自身(表现为 clean 没删成、generate 半途而废且不报错)。
   同理 scripts/minify.js 也在被 hexo 加载(每次 hexo server/generate 启动都会跑一遍压缩),
   属既有行为, 已列入待办。 */

const fs = require('fs')
const path = require('path')
const { ROOT, PUBLIC_DIR } = require('./lib/public-dir')

const POSTS_SRC = path.join(ROOT, 'source', '_posts')
const BASELINE_FILE = path.join(ROOT, 'test', 'baseline.json')

const args = process.argv.slice(2)
const STRICT = args.includes('--strict')
const UPDATE = args.includes('--update-baseline')

const rel = p => path.relative(PUBLIC_DIR, p)
const sizeOf = name => {
  const p = path.join(PUBLIC_DIR, name)
  try { return fs.statSync(p).size } catch (e) { return -1 }
}
const readIf = p => { try { return fs.readFileSync(p, 'utf8') } catch (e) { return '' } }

// 跳过版本控制与部署残留目录: 产物目录 public/ 就在本仓内, .git 是同一个仓库的(位于仓库根,
// 不在 public/ 下); 保留 .git/.deploy_git 的排除是为了兜底 —— 一旦产物目录里出现这类残留,
// 其中的内部文件会被算进"产物文件数"。
const SKIP_DIRS = new Set(['.git', '.deploy_git', 'node_modules'])

function walkFiles(dir, base, out) {
  out = out || []
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = path.join(dir, name)
    let st
    try { st = fs.statSync(full) } catch (e) { continue }   // 忽略检查期间消失的文件
    if (st.isDirectory()) walkFiles(full, base, out)
    else out.push(path.relative(base, full))
  }
  return out
}

/* ---------- 采集指标 ---------- */
function collect() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    throw new Error('public/ 不存在 —— 请先运行 npm run build')
  }
  const files = walkFiles(PUBLIC_DIR, PUBLIC_DIR)
  const home = readIf(path.join(PUBLIC_DIR, 'index.html'))

  const sig = home.match(/nova-signal-kind">\[([^\]]*)\]<\/em>([^<]*)<\/strong><time[^>]*>([^<]*)<\/time>/)
  const featured = [...home.matchAll(/data-href="\/projects\/([^"/]+)\/"/g)].map(m => m[1]).slice(0, 3)

  const postsDir = path.join(PUBLIC_DIR, 'posts')
  const postDirs = fs.existsSync(postsDir)
    ? fs.readdirSync(postsDir).filter(n => {
        try { return fs.statSync(path.join(postsDir, n)).isDirectory() } catch (e) { return false }
      }).length
    : 0
  const sourcePosts = fs.existsSync(POSTS_SRC)
    ? fs.readdirSync(POSTS_SRC).filter(n => n.endsWith('.md')).length
    : 0

  return {
    metrics: {
      publicFiles: files.length,
      postDirs,
      sourcePosts,
      searchXml: sizeOf('search.xml'),
      sitemapXml: sizeOf('sitemap.xml'),
      atomXml: sizeOf('atom.xml'),
      latestSignal: sig ? '[' + sig[1] + '] ' + sig[2] + ' @ ' + sig[3] : '',
      featuredProjects: featured
    },
    home,
    files
  }
}

/* ---------- 断言收集器 ---------- */
const checks = []
const ok = (name, detail) => checks.push({ pass: true, name, detail })
const bad = (name, detail) => checks.push({ pass: false, name, detail })
const eq = (name, actual, expected) => {
  if (actual === expected) ok(name, actual)
  else bad(name, '实际 ' + actual + ' ≠ 期望 ' + expected)
}

/* ---------- 结构断言(默认模式) ---------- */
function structural(m, home, files) {
  // 1. 文章页数量与源文章数一致
  eq('文章目录数 = source/_posts 文章数', m.postDirs, m.sourcePosts)

  // 2. 三个生成物存在且结构完整
  const xmlSpecs = [
    ['search.xml', '<search>', '</search>'],
    ['sitemap.xml', '<urlset', '</urlset>'],
    ['atom.xml', '<feed', '</feed>']
  ]
  for (const [name, openTag, closeTag] of xmlSpecs) {
    const p = path.join(PUBLIC_DIR, name)
    if (!fs.existsSync(p)) { bad(name + ' 存在', '缺失'); continue }
    const txt = readIf(p)
    const size = sizeOf(name)
    if (size <= 0) { bad(name + ' 非空', size + ' 字节'); continue }
    if (!txt.startsWith('<?xml')) { bad(name + ' XML 声明', '未以 <?xml 开头'); continue }
    if (!txt.includes(openTag) || !txt.trimEnd().endsWith(closeTag)) {
      bad(name + ' 根标签闭合', '缺 ' + openTag + ' 或 ' + closeTag)
      continue
    }
    if (name !== 'sitemap.xml') {
      const opens = (txt.match(/<entry>/g) || []).length
      const closes = (txt.match(/<\/entry>/g) || []).length
      if (opens !== closes) { bad(name + ' entry 配对', opens + ' 开 vs ' + closes + ' 闭'); continue }
    }
    ok(name + ' 结构完整', size + ' 字节')
  }

  // 3. 首页 LATEST SIGNAL 可解析
  if (m.latestSignal) ok('首页 LATEST SIGNAL', m.latestSignal)
  else bad('首页 LATEST SIGNAL', '未能从 index.html 解析出 SIGNAL')

  // 4. 精选工程 3 张卡
  eq('首页精选工程卡数', m.featuredProjects.length, 3)
  if (m.featuredProjects.length === 3) ok('精选工程顺序', m.featuredProjects.join(' → '))

  // 5. 无 /tags/ 断链(本站标签页在 /articles/)
  const htmlFiles = files.filter(f => f.endsWith('.html'))
  let tagLinks = 0
  for (const f of htmlFiles) {
    const txt = readIf(path.join(PUBLIC_DIR, f))
    tagLinks += (txt.match(/href="\/tags\//g) || []).length
  }
  eq('产物中 /tags/ 断链数', tagLinks, 0)

  // 6. 工程详情页"更新于"必须是完整日期(阶段2 修复固化的不变量)
  let badDates = []
  const projDir = path.join(PUBLIC_DIR, 'projects')
  if (fs.existsSync(projDir)) {
    for (const id of fs.readdirSync(projDir)) {
      const p = path.join(projDir, id, 'index.html')
      if (!fs.existsSync(p)) continue
      const txt = readIf(p)
      const mm = txt.match(/更新于<\/span><time[^>]*>([^<]*)<\/time>/)
      if (mm && !/^\d{4}-\d{2}-\d{2}$/.test(mm[1])) badDates.push(id + '=' + mm[1])
    }
  }
  eq('工程详情页「更新于」均为 YYYY-MM-DD', badDates.length === 0 ? 0 : 1, 0)
  if (badDates.length) bad('  异常值', badDates.join(', '))

  // 7. <time> 必须带 datetime 属性(阶段2 2.10a)
  const homeNoDt = (home.match(/<time(?![^>]*datetime=)[^>]*>/g) || []).length
  eq('首页无 datetime 的 <time> 数', homeNoDt, 0)

  // 8. 产物不得从 jsDelivr 直接加载资源(阶段6 本地化不变量)
  //    背景: 站点有两套 head(定制 _partials / 原版 includes), 全站改动曾只覆盖其中一套,
  //    导致"文章页仍走 CDN"长期无人察觉。此处把"漏网"变成构建失败。
  //    只匹配 <script src=..> / <link href=..> 这类**直接加载**; 懒加载字符串
  //    (theme 里 mermaid 的 btf.getScript('https://cdn.jsdelivr.net/...')) 属已知待办, 不在此断言内。
  const cdnLoader = []
  for (const f of htmlFiles) {
    const txt = readIf(path.join(PUBLIC_DIR, f))
    const hits = [
      ...txt.matchAll(/<script[^>]*\ssrc="(https?:\/\/cdn\.jsdelivr\.net\/[^"]*)"/gi),
      ...txt.matchAll(/<link[^>]*\shref="(https?:\/\/cdn\.jsdelivr\.net\/[^"]*)"/gi)
    ]
    if (hits.length) cdnLoader.push(rel(path.join(PUBLIC_DIR, f)) + ' → ' + hits[0][1].slice(0, 72))
  }
  eq('产物中 jsDelivr 直接加载数', cdnLoader.length, 0)
  for (const d of cdnLoader.slice(0, 5)) bad('  ' + d, '应改为站内自托管')
}

/* ---------- 基线比对(--strict) ---------- */
function baseline(m) {
  if (!fs.existsSync(BASELINE_FILE)) {
    bad('基线文件存在', BASELINE_FILE + ' 不存在 —— 先跑 npm run verify -- --update-baseline')
    return
  }
  const base = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'))
  const keys = ['publicFiles', 'postDirs', 'searchXml', 'sitemapXml', 'atomXml', 'latestSignal']
  for (const k of keys) {
    if (base[k] === undefined) { bad('基线含 ' + k, '缺失'); continue }
    eq('[基线] ' + k, m[k], base[k])
  }
  const bf = JSON.stringify(base.featuredProjects)
  const mf = JSON.stringify(m.featuredProjects)
  eq('[基线] 精选工程顺序', mf, bf)
  if (base.note) ok('基线备注', base.note)
}

/* ---------- 主流程 ---------- */
let data
try {
  data = collect()
} catch (e) {
  console.error('[smoke] ❌ ' + e.message)
  process.exit(1)
}

const { metrics, home, files } = data

if (UPDATE) {
  fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true })
  const out = Object.assign({}, metrics, {
    note: '阶段3 批次J 建立; 新增文章/工程或有意改版后, 用 npm run verify -- --update-baseline 刷新',
    updatedAt: new Date().toISOString().slice(0, 10)
  })
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(out, null, 2) + '\n')
  console.log('[smoke] 基线已写入 ' + path.relative(ROOT, BASELINE_FILE))
  console.log(JSON.stringify(metrics, null, 2))
  process.exit(0)
}

console.log('[smoke] 模式: ' + (STRICT ? '基线比对(--strict)' : '结构断言'))
structural(metrics, home, files)
if (STRICT) baseline(metrics)

const pass = checks.filter(c => c.pass).length
const fail = checks.filter(c => !c.pass)
for (const c of checks) {
  console.log((c.pass ? '  ✅ ' : '  ❌ ') + c.name + (c.detail !== undefined && c.detail !== '' ? '  ' + c.detail : ''))
}
console.log('')
if (fail.length) {
  console.error('[smoke] ' + fail.length + ' 项失败 / 共 ' + checks.length + ' 项 → 非零退出')
  process.exit(1)
}
console.log('[smoke] 全部通过 (' + pass + ' 项)')
