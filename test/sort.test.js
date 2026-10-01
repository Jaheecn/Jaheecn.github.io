'use strict'
/* 阶段4 批次N · 4.4 等价性护栏: scripts/lib/sort.js 必须与它取代的旧内联比较器
   产生完全相同的排序结果 —— 用"逐字复现的旧实现"作为参照基准, 覆盖边界与随机数据。
   之所以不用产物哈希验证: 实测本工程 hexo 全量生成两次即产生 19 项产物差异
   (三个 xml 与若干 HTML 的条目顺序), 属既有的非确定性, 拿它判等价会误判。 */
const { test } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')

const { toMs, byKeys, byTitle } = require(path.join(__dirname, '..', 'scripts', 'lib', 'sort.js'))

/* ---------- 旧实现(逐字复现, 作为基准) ---------- */
const oldToMs = s => { const d = new Date(s); return isNaN(d.getTime()) ? 0 : d.getTime() }
const oldByUpdatedPvTitle = (a, b) =>
  oldToMs(b.updatedAt) - oldToMs(a.updatedAt) || (b.pv - a.pv) || a.title.localeCompare(b.title, 'zh')
const oldByPvUpdatedTitle = (a, b) =>
  (b.pv - a.pv) || oldToMs(b.updatedAt) - oldToMs(a.updatedAt) || a.title.localeCompare(b.title, 'zh')
const oldByUpd = (updFn) => (a, b) => (updFn(b) - updFn(a)) || a.title.localeCompare(b.title, 'zh')

/* ---------- 新实现 ---------- */
const newByUpdatedPvTitle = byKeys([[r => toMs(r.updatedAt), 'desc'], [r => r.pv, 'desc']])
const newByPvUpdatedTitle = byKeys([[r => r.pv, 'desc'], [r => toMs(r.updatedAt), 'desc']])
const updOf = r => toMs(r.updatedAt)
const newByUpd = byKeys([[r => updOf(r), 'desc']])

const orderOf = (rows, cmp) => rows.slice().sort(cmp).map(r => r.id)

const SAMPLE = [
  { id: 'a', title: '绘世 Stable Diffusion', updatedAt: '2026-09-03', pv: 10 },
  { id: 'b', title: 'Markdown 入门指南', updatedAt: '2026-09-03', pv: 10 },   // 与 a 完全同级 -> 比标题
  { id: 'c', title: '别赋', updatedAt: '2026-08-27', pv: 25 },
  { id: 'd', title: '月下小令', updatedAt: '2026-08-27', pv: 10 },
  { id: 'e', title: 'LED点阵屏', updatedAt: '2026-08-27', pv: 25 },           // 与 c 同级 -> 比标题
  { id: 'f', title: 'A', updatedAt: '', pv: 0 },                              // 空日期 -> toMs 回退 0
  { id: 'g', title: 'B', updatedAt: 'not-a-date', pv: 0 },                    // 非法日期 -> 回退 0
  { id: 'h', title: 'C', updatedAt: '2025-01-01', pv: 0 }
]

test('等价性: byUpdatedPvTitle 与旧实现顺序完全一致', () => {
  assert.deepStrictEqual(orderOf(SAMPLE, newByUpdatedPvTitle), orderOf(SAMPLE, oldByUpdatedPvTitle))
})

test('等价性: byPvUpdatedTitle 与旧实现顺序完全一致', () => {
  assert.deepStrictEqual(orderOf(SAMPLE, newByPvUpdatedTitle), orderOf(SAMPLE, oldByPvUpdatedTitle))
})

test('等价性: byUpd(工程侧) 与旧实现顺序完全一致', () => {
  assert.deepStrictEqual(orderOf(SAMPLE, newByUpd), orderOf(SAMPLE, oldByUpd(updOf)))
})

test('等价性: 50 组随机数据三套比较器均一致', () => {
  const pool = ['2025-01-01', '2026-08-27', '2026-09-03', '', 'bad', undefined]
  const names = ['绘世', 'Markdown', '别赋', '月下小令', 'LED点阵屏', '琛光无人机', 'A', 'B']
  for (let seed = 0; seed < 50; seed++) {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      id: 'r' + i,
      title: names[(seed * 7 + i * 3) % names.length],
      updatedAt: pool[(seed + i * 5) % pool.length],
      pv: (seed * 3 + i * 11) % 30
    }))
    assert.deepStrictEqual(orderOf(rows, newByUpdatedPvTitle), orderOf(rows, oldByUpdatedPvTitle), 'byUpdatedPvTitle seed=' + seed)
    assert.deepStrictEqual(orderOf(rows, newByPvUpdatedTitle), orderOf(rows, oldByPvUpdatedTitle), 'byPvUpdatedTitle seed=' + seed)
    assert.deepStrictEqual(orderOf(rows, newByUpd), orderOf(rows, oldByUpd(updOf)), 'byUpd seed=' + seed)
  }
})

test('toMs: 合法/非法/空值', () => {
  assert.strictEqual(toMs('2026-09-03'), new Date('2026-09-03').getTime())
  assert.strictEqual(toMs(''), 0)
  assert.strictEqual(toMs('bad'), 0)
  assert.strictEqual(toMs(undefined), 0)
  assert.strictEqual(toMs(new Date('2025-01-01')), new Date('2025-01-01').getTime())
})

test('修复点: 工程侧旧实现遇非法日期会产生 NaN, 新实现回退 0(排序仍确定)', () => {
  const bad = [{ id: 'x', title: 'X', updatedAt: 'bad' }, { id: 'y', title: 'Y', updatedAt: '2026-01-01' }]
  const oldUpd = r => new Date(r.updatedAt || 0).getTime()          // 旧 updMs 的写法
  const oldCmp = (a, b) => (oldUpd(b) - oldUpd(a)) || a.title.localeCompare(b.title, 'zh')
  assert.ok(Number.isNaN(oldUpd(bad[0])), '旧实现确实产生 NaN')
  const sorted = bad.slice().sort(byKeys([[r => toMs(r.updatedAt), 'desc']]))
  assert.strictEqual(sorted[0].id, 'y', '新实现把非法日期当作最早(0), 顺序确定')
  assert.strictEqual(oldCmp(bad[0], bad[1]) !== 0, true, '旧实现在 NaN 时退化为按标题')
})

test('byTitle: title 缺失不抛错(旧实现会崩)', () => {
  assert.doesNotThrow(() => byTitle({}, {}))
  assert.strictEqual(byTitle({ title: 'A' }, { title: 'A' }), 0)
})
