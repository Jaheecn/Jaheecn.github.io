'use strict'
/* 阶段3 · 3.1 单元测试: renderAtom
   重点: 空数组回归(阶段2 2.6 修复前会抛 TypeError 导致构建失败)
   阶段4 · 4.8: renderAtom 已迁至 scripts/lib/feeds.js(纯函数, 不再需要 hexo 桩),
   fmtDate 单一来源 scripts/lib/date.js */
const { test } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')

const { renderAtom } = require(path.join(__dirname, '..', 'scripts', 'lib', 'feeds.js'))
const { fmtDate } = require(path.join(__dirname, '..', 'scripts', 'lib', 'date.js'))

const post = (over) => Object.assign({
  title: 'T',
  date: new Date(2026, 0, 2),
  path: 'posts/t/',
  tags: { toArray: () => [{ name: 'Tag' }] },
  content: '<p>body</p>',
  excerpt: 'body'
}, over || {})

const countEntries = xml => (xml.match(/<entry>/g) || []).length
const feedUpdated = xml => (xml.match(/<updated>([^<]*)<\/updated>/) || [])[1]

test('renderAtom: 空数组 -> 不抛错, updated 用纪元兜底, 0 条目', () => {
  const xml = renderAtom([])
  assert.ok(xml.includes('<feed'))
  assert.strictEqual(countEntries(xml), 0)
  assert.strictEqual(feedUpdated(xml), '1970-01-01T00:00:00.000Z')
})

test('renderAtom: 单篇 -> 1 条目, updated = 该篇日期', () => {
  const xml = renderAtom([post({ date: new Date(2026, 0, 2) })])
  assert.strictEqual(countEntries(xml), 1)
  assert.strictEqual(feedUpdated(xml), '2026-01-02T00:00:00.000Z')
})

test('renderAtom: 多篇 -> 按日期倒序, updated 取最新', () => {
  const older = post({ title: 'Older', date: new Date(2025, 4, 5) })
  const newer = post({ title: 'Newer', date: new Date(2026, 8, 3) })
  const xml = renderAtom([older, newer])
  assert.strictEqual(countEntries(xml), 2)
  assert.strictEqual(feedUpdated(xml), '2026-09-03T00:00:00.000Z')
  assert.ok(xml.indexOf('<title>Newer</title>') < xml.indexOf('<title>Older</title>'))
})

test('renderAtom: 标题与分类做 XML 转义', () => {
  const xml = renderAtom([post({ title: 'A & B <c>', tags: { toArray: () => [{ name: 'x&y' }] } })]);
  assert.ok(xml.includes('<title>A &amp; B &lt;c&gt;</title>'))
  assert.ok(xml.includes('term="x&amp;y"'))
})

test('renderAtom: tags 为纯数组也能处理(无 toArray)', () => {
  const xml = renderAtom([post({ tags: [{ name: 'plain' }] })])
  assert.ok(xml.includes('term="plain"'))
})

test('renderAtom: 缺 tags 字段不抛错', () => {
  const xml = renderAtom([post({ tags: undefined })])
  assert.strictEqual(countEntries(xml), 1)
})

test('renderAtom: published 用该篇日期', () => {
  const xml = renderAtom([post({ date: new Date(2026, 5, 15) })])
  assert.ok(xml.includes('<published>2026-06-15T00:00:00.000Z</published>'))
})

test('renderAtom: fmtDate 导出一致性(供其它模块复用)', () => {
  assert.strictEqual(fmtDate(new Date(2026, 8, 3)), '2026-09-03')
})
