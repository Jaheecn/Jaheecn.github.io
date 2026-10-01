'use strict'

/* ============================================================================
   layout-guard —— 布局与图片拉伸守卫（只读检查，不改产品）
   ----------------------------------------------------------------------------
   把"图片有没有被拉伸""布局有没有坏"从主观观感变成可复现的数值。

   三项检查：
     1. 可滚动溢出  页面是否真的能横向滚动
     2. 图片真拉伸  object-fit 为 fill(或未设) 且 元素比例偏离图片固有比例 > 2%
                    cover/contain 属正常裁剪/留白, 不计为拉伸
     3. 容器尺寸    记录到基线, 与上次对比, 变化 > 1% 时提示(不判失败)

   判定"可滚动溢出"而非 scrollWidth 之差的原因:
     scrollWidth>clientWidth 常由视口外定位元素造成 —— 如关闭态侧边栏
     #sidebar-menus{right:-330px}, 而 body{overflow-x:hidden} 让它完全不可滚动。
     实测: 说说页 375px 差 18px, 但横向滚动量为 0。用户看不到, 不构成布局问题。
     实现上不用 window.scrollTo 试探(会有真实滚动副作用), 而是读 CSS 判定:
     只有横向滚动未被隐藏(html 与 body 的 overflow-x 都不是 hidden/clip)时,
     scrollWidth 之差才算可滚动溢出。

   用法：
     node tools/layout-guard.js --url http://127.0.0.1:4011            检查
     node tools/layout-guard.js --url https://yibao11.github.io       检查线上
     node tools/layout-guard.js --baseline                            把当前结果写入基线
     node tools/layout-guard.js --help                                查看用法
     不带 --url 时默认检查 http://127.0.0.1:4011 (需自行启动服务)

   退出码：0 通过；1 存在失败项(可滚动溢出或真拉伸)
   基线文件：data/layout-baseline.json
   ============================================================================ */

const { spawn } = require('child_process')
const os = require('os')
const path = require('path')
const fs = require('fs')

const ROOT = path.join(__dirname, '..')
const BASELINE_FILE = path.join(ROOT, 'data', 'layout-baseline.json')
const DEFAULT_BASE = 'http://127.0.0.1:4011'
const CDP_PORT = 10300 + (process.pid % 500)

// 用英文标签: 中文在控制台按字符数 padEnd 会错位(中文占 2 列)
const PAGES = [
  ['/', 'home'],
  ['/articles/', 'articles'],
  ['/articles/AI/', 'tag'],
  ['/projects/', 'projects'],
  ['/projects/drone/', 'project-detail'],
  ['/music/', 'music'],
  ['/moments/', 'moments'],
  ['/about/', 'about'],
  ['/404.html', '404']
]

const VIEWPORTS = [[1440, 900], [375, 812]]

// 布局稳定性如何度量(踩过两次坑, 记录在此避免回退):
//   坑1: 记录关键容器 "宽x高" —— 页面有持续动画(如加载图标 fa-spin 旋转),
//        其瞬时尺寸逐帧变化会带动容器高度。实测同一份 HTML/CSS 的两个副本
//        高度差达 10.8%, 全是误报。
//   坑2: 改用"静态元素指纹哈希"(跳过含动画的祖先链) —— 仍误报 9 处,
//        因为指纹里含 x/y 坐标, 而字体加载/懒加载/渐入动画会让元素位置微移,
//        采集时机不同结果就不同。
// 结论: 只比【宽度】。宽度不受动画、字体加载、渐入时机影响, 却对真正的
//       布局变化(列宽/容器尺寸/断点/栅格)高度敏感 —— 稳定且有效。
const WIDTH_SELECTORS = ['#body-wrap', '#page-header', 'main', '#content-inner', '.nova-music-card', '.post-content', 'article', 'footer', '#nav']

// 文章页样例: 取"含正文插图"的 —— 纯诗词类文章是 0 张图, 校验不到图片逻辑。
// 用路径而非标题判断, 若该文被删则视为 404(仍会跑, 只是 imgTotal 变 0)。
const POST_SAMPLE = ['/posts/Markdown 入门指南/', 'post']

function findChrome () {
  const cands = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
  ]
  return cands.find(p => { try { return fs.existsSync(p) } catch (e) { return false } })
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// 页面内探针: 纯读取, 不做任何滚动
const PROBE = `(function(){
  var de = document.documentElement;
  var htmlOX = getComputedStyle(de).overflowX;
  var bodyOX = getComputedStyle(document.body).overflowX;
  var blocked = function(v){ return v === 'hidden' || v === 'clip'; };
  var overflowBlocked = blocked(htmlOX) || blocked(bodyOX);
  var delta = de.scrollWidth - de.clientWidth;
  var canScroll = delta > 1 && !overflowBlocked;

  var worst = null, mr = 0;
  if (delta > 1) {
    document.querySelectorAll('body *').forEach(function(el){
      var b = el.getBoundingClientRect();
      if (b.width > 0 && b.right > mr) {
        mr = b.right;
        var cls = String(el.className || '').split(' ')[0];
        worst = el.tagName + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '');
      }
    });
  }

  var out = {
    overflow: { sw: de.scrollWidth, cw: de.clientWidth, delta: delta,
      canScroll: canScroll, blockedBy: overflowBlocked ? (blocked(htmlOX) ? 'html' : 'body') : '',
      htmlOX: htmlOX, bodyOX: bodyOX, worst: worst, worstRight: Math.round(mr), bad: canScroll },
    stretched: [], widths: {}, imgTotal: 0
  };

  document.querySelectorAll('img').forEach(function(im){
    var b = im.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) return;
    if (!im.naturalWidth || !im.naturalHeight) return;
    out.imgTotal++;
    var fit = getComputedStyle(im).objectFit;
    if (fit && fit !== 'fill') return;
    var er = b.width / b.height, nr = im.naturalWidth / im.naturalHeight;
    var dev = Math.abs(er - nr) / nr * 100;
    if (dev > 2) {
      out.stretched.push({
        src: (im.getAttribute('src') || '').split('/').slice(-1)[0].slice(0, 44),
        dw: Math.round(b.width), dh: Math.round(b.height),
        nw: im.naturalWidth, nh: im.naturalHeight,
        dev: +dev.toFixed(1), fit: fit || '(unset)'
      });
    }
  });

  ${JSON.stringify(WIDTH_SELECTORS)}.forEach(function(sel){
    var el = document.querySelector(sel);
    if (!el) return;
    var b = el.getBoundingClientRect();
    if (b.width < 1) return;
    out.widths[sel] = Math.round(b.width);
  });

  return JSON.stringify(out);
})()`

async function openBrowser () {
  const chromePath = findChrome()
  if (!chromePath) throw new Error('未找到 Chrome')
  const profileDir = path.join(os.tmpdir(), 'layout-guard-' + Date.now())
  const proc = spawn(chromePath, ['--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + profileDir,
    '--no-first-run', 'about:blank'], { stdio: 'ignore' })

  let wsUrl = null
  for (let i = 0; i < 120 && !wsUrl; i++) {
    await sleep(500)
    try {
      const r = await fetch('http://127.0.0.1:' + CDP_PORT + '/json/version')
      wsUrl = (await r.json()).webSocketDebuggerUrl
    } catch (e) { /* Chrome 还没起来, 继续等 */ }
  }
  if (!wsUrl) { proc.kill(); throw new Error('Chrome 未就绪') }

  const ws = new WebSocket(wsUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

  let id = 0
  const pend = new Map()
  ws.onmessage = e => {
    const m = JSON.parse(e.data)
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  }
  const send = (method, params, sessionId) => new Promise(res => {
    const i = ++id
    pend.set(i, res)
    ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) }))
  })

  const target = await send('Target.createTarget', { url: 'about:blank' })
  const attached = await send('Target.attachToTarget', { targetId: target.result.targetId, flatten: true })
  const sid = attached.result.sessionId
  await send('Page.enable', {}, sid)
  await send('Runtime.enable', {}, sid)

  return {
    sid, send,
    cleanup: async () => {
      try { ws.close() } catch (e) {}
      try { proc.kill() } catch (e) {}
      await sleep(300)
      try { fs.rmSync(profileDir, { recursive: true, force: true }) } catch (e) {}
    }
  }
}

async function check (baseUrl) {
  const browser = await openBrowser()
  const pages = PAGES.concat([POST_SAMPLE])
  const result = {}
  try {
    for (const [w, h] of VIEWPORTS) {
      await browser.send('Emulation.setDeviceMetricsOverride',
        { width: w, height: h, deviceScaleFactor: 1, mobile: w < 800 }, browser.sid)
      for (const [p, name] of pages) {
        try { await browser.send('Page.navigate', { url: baseUrl + encodeURI(p) }, browser.sid) } catch (e) {}
        await sleep(4500)
        try {
          const r = await browser.send('Runtime.evaluate',
            { expression: PROBE, returnByValue: true }, browser.sid)
          const v = r.result && r.result.result ? r.result.result.value : null
          if (v) result[w + '|' + name] = JSON.parse(v)
        } catch (e) { /* 单页失败不影响其余 */ }
      }
    }
  } finally {
    await browser.cleanup()
  }
  return result
}

function report (data) {
  let fail = 0
  let noted = 0
  console.log('page            | vp   | scrollable-overflow | delta/worst                | stretched | imgs')
  console.log('-'.repeat(104))
  for (const key of Object.keys(data)) {
    const [vp, name] = key.split('|')
    const d = data[key]
    const ov = d.overflow.bad ? 'YES ' + d.overflow.sw + '>' + d.overflow.cw : 'no'
    const delta = d.overflow.delta > 1
      ? (d.overflow.delta + 'px blocked-by:' + d.overflow.blockedBy + ' ' + (d.overflow.worst || ''))
      : '-'
    if (d.overflow.bad || d.stretched.length) fail++
    else if (d.overflow.delta > 1) noted++
    console.log('  ' + name.padEnd(14) + '| ' + String(vp).padEnd(5) + '| ' +
      ov.padEnd(20) + '| ' + delta.slice(0, 27).padEnd(27) + '| ' +
      String(d.stretched.length).padEnd(10) + '| ' + d.imgTotal)
    d.stretched.forEach(s => {
      console.log('      STRETCHED ' + s.src.padEnd(34) + ' shown ' + s.dw + 'x' + s.dh +
        ' natural ' + s.nw + 'x' + s.nh + ' dev ' + s.dev + '% object-fit=' + s.fit)
    })
  }
  console.log('\n  failures (scrollable overflow / stretched image): ' + fail +
    (fail === 0 ? '  -> PASS' : ''))
  if (noted > 0) {
    console.log('  note: ' + noted + ' metered delta(s) blocked by overflow-x:hidden on the element')
    console.log('        below (e.g. closed sidebar #sidebar-menus{right:-330px}). Not reachable')
    console.log('        by the user, so not a layout defect -- recorded only.')
  }
  return fail
}

function diffBaseline (data) {
  if (!fs.existsSync(BASELINE_FILE)) return 0
  let base
  try { base = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) } catch (e) { return 0 }
  let changed = 0
  const lines = []
  for (const key of Object.keys(data)) {
    const b = base[key]
    if (!b || !b.widths || !data[key].widths) continue
    for (const sel of Object.keys(data[key].widths)) {
      const now = data[key].widths[sel]
      const was = b.widths[sel]
      if (was === undefined || was === now) continue
      const dev = Math.abs(now - was) / Math.max(1, was) * 100
      if (dev > 1) {
        changed++
        lines.push('  ! ' + key + '  ' + sel + '  width ' + was + ' -> ' + now + '  (' + dev.toFixed(1) + '%)')
      }
    }
  }
  console.log('\nlayout widths vs baseline:')
  if (lines.length === 0) console.log('  (no change)')
  else lines.forEach(l => console.log(l))
  return changed
}

function usage () {
  console.log('用法: node tools/layout-guard.js [--url <base>] [--baseline]')
  console.log('  --url <base>   要检查的站点, 默认 ' + DEFAULT_BASE + ' (需自行启动服务)')
  console.log('  --baseline     把当前检查结果写入 ' + path.relative(ROOT, BASELINE_FILE))
  console.log('  退出码 0 = 通过, 1 = 存在可滚动溢出或图片真拉伸')
}

async function main () {
  const argv = process.argv.slice(2)
  if (argv.includes('--help') || argv.includes('-h')) { usage(); return }

  const wantBaseline = argv.includes('--baseline')
  let baseUrl = DEFAULT_BASE
  const urlIdx = argv.indexOf('--url')
  if (urlIdx >= 0) {
    if (!argv[urlIdx + 1]) throw new Error('--url 缺少参数')
    baseUrl = argv[urlIdx + 1].replace(/\/+$/, '')
  }

  let up = false
  try { const r = await fetch(baseUrl + '/'); up = r.status === 200 } catch (e) {}
  if (!up) throw new Error('站点不可达: ' + baseUrl + ' (请先启动服务, 或用 --url 指定)')

  console.log('[layout-guard] check ' + baseUrl + '\n')
  const data = await check(baseUrl)
  const fail = report(data)
  const changed = wantBaseline ? 0 : diffBaseline(data)

  if (wantBaseline) {
    fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true })
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(data, null, 1))
    console.log('\n  baseline written: ' + path.relative(ROOT, BASELINE_FILE))
  }

  if (fail > 0) {
    console.log('\n[layout-guard] FAIL: ' + fail + ' item(s)')
    process.exit(1)
  }
  if (changed > 0) console.log('\n[layout-guard] note: ' + changed + ' container size change(s), review above')
  console.log('\n[layout-guard] PASS')
}

if (require.main === module) {
  main().catch(e => { console.error('[layout-guard] error: ' + e.message); process.exit(1) })
}

module.exports = {}
