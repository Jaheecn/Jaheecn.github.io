'use strict'
/* 阶段3 · 3.1 单元测试(收编阶段2 批次G 的验证脚本):
   PJAX 幂等性 —— 本站在自制 PJAX 下会"重新执行"带 data-pjax 的脚本,
   若脚本在顶层无条件 addEventListener, 监听器会随进出页面次数线性累积。
   这里用 vm + 轻量 DOM 桩模拟"同一页面被反复执行 N 次", 断言监听器仍是 1 个。
   (无需 jsdom: 被测脚本在缺 DOM 时都会提前 return, 只有顶层注册逻辑会被执行到。) */
const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

const JS_DIR = path.join(__dirname, '..', 'source', 'rose-galaxy', 'js')

const noop = () => {}
const makeEl = () => ({
  dataset: {}, style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener: noop, removeEventListener: noop,
  appendChild: noop, insertBefore: noop, remove: noop,
  setAttribute: noop, removeAttribute: noop, getAttribute: () => null,
  closest: () => null, matches: () => false, contains: () => false,
  isConnected: true, textContent: '', innerHTML: '', hidden: false, offsetWidth: 0, offsetHeight: 0,
  getBoundingClientRect: () => ({ width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 }),
  focus: noop, blur: noop, click: noop, load: noop
})

function runScriptTimes(file, times) {
  const winL = [], docL = []
  const doc = {
    readyState: 'complete', documentElement: makeEl(), body: makeEl(), head: makeEl(),
    addEventListener: t => docL.push(t), removeEventListener: noop,
    querySelector: () => null, querySelectorAll: () => [],
    createElement: () => makeEl(), getElementById: () => null, createTextNode: () => makeEl()
  }
  const win = {
    addEventListener: t => winL.push(t), removeEventListener: noop,
    document: doc,
    matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop, removeEventListener: noop }),
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop, clear: noop },
    sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    location: { search: '', pathname: '/', href: 'http://localhost/' },
    navigator: { userAgent: 'node' },
    NOVA_SITE: { bili: { proxy: 'https://example.invalid', uid: '1', folder: 'f' } },
    NOVA_UTILS: { formatTime: () => '', songName: () => '', songArtist: () => '', clamp: v => v },
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: () => 0, cancelAnimationFrame: noop,
    performance: { now: () => 0 }, devicePixelRatio: 1, innerWidth: 1440, innerHeight: 900,
    console
  }
  win.window = win
  win.self = win

  const code = fs.readFileSync(path.join(JS_DIR, file), 'utf8')
  for (let i = 0; i < times; i++) {
    const sandbox = {
      window: win, self: win, document: doc, globalThis: undefined,
      localStorage: win.localStorage, sessionStorage: win.sessionStorage, location: win.location,
      navigator: win.navigator,
      fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { data: [], totalPages: 0 } }) }),
      setTimeout, clearTimeout, setInterval, clearInterval,
      requestAnimationFrame: win.requestAnimationFrame, cancelAnimationFrame: noop,
      performance: win.performance, console, URLSearchParams, AbortController,
      Map, Set, Promise, JSON, Math, Date, Array, Object, String, Number, Boolean, RegExp, Error,
      isNaN, parseInt, parseFloat,
      MutationObserver: class { observe() {} disconnect() {} },
      IntersectionObserver: class { observe() {} disconnect() {} },
      ResizeObserver: class { observe() {} disconnect() {} }
    }
    sandbox.globalThis = sandbox
    vm.createContext(sandbox)
    vm.runInContext(code, sandbox)
  }
  const count = (arr, t) => arr.filter(x => x === t).length
  return { winL, docL, count: t => count(docL, t), countWin: t => count(winL, t) }
}

test('moments-feed.js: 执行 3 次后 pjax:complete 与 resize 监听仍各为 1(请求放大回归)', () => {
  const r = runScriptTimes('moments-feed.js', 3)
  assert.strictEqual(r.count('pjax:complete'), 1, 'pjax:complete 不得累积(否则 init/loadFeed 会被并发调用)')
  assert.strictEqual(r.countWin('resize'), 1, 'resize 不得累积')
})

test('music-page.js: 执行 3 次后 pjax:send / pjax:complete 仍各为 1(监听泄漏回归)', () => {
  const r = runScriptTimes('music-page.js', 3)
  assert.strictEqual(r.count('pjax:complete'), 1)
  assert.strictEqual(r.count('pjax:send'), 1)
})

test('moments-page.js: 正面对照(原本就正确的实现)', () => {
  const r = runScriptTimes('moments-page.js', 3)
  assert.strictEqual(r.count('pjax:complete'), 1)
})

test('执行 5 次同样不累积(不是"少注册一次"的巧合)', () => {
  const r = runScriptTimes('moments-feed.js', 5)
  assert.strictEqual(r.count('pjax:complete'), 1)
  assert.strictEqual(r.countWin('resize'), 1)
  const m = runScriptTimes('music-page.js', 5)
  assert.strictEqual(m.count('pjax:complete'), 1)
  assert.strictEqual(m.count('pjax:send'), 1)
})
