'use strict'
/* 阶段3 · 3.1 单元测试: renderSitemap / postUrl
   覆盖: 空数组安全 / 中文路径编码 / lastmod / postUrl 归一化
   阶段4 · 4.8: 两者已迁至 scripts/lib/feeds.js(纯函数, 不再需要 hexo 桩) */
const { test } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')

const { renderSitemap, postUrl } = require(path.join(__dirname, '..', 'scripts', 'lib', 'feeds.js'))

const post = (over) => Object.assign({ title: 'T', date: new Date(2026, 0, 2), path: 'posts/t/' }, over || {})
const countUrls = xml => (xml.match(/<url>/g) || []).length

test('renderSitemap: 空数组 -> 合法空 urlset', () => {
  const xml = renderSitemap([])
  assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'))
  assert.ok(xml.trim().endsWith('</urlset>'))
  assert.strictEqual(countUrls(xml), 0)
})

test('renderSitemap: 单篇 -> 1 个 url, lastmod 用 fmtDate', () => {
  const xml = renderSitemap([post({ date: new Date(2026, 8, 3) })])
  assert.strictEqual(countUrls(xml), 1)
  assert.ok(xml.includes('<lastmod>2026-09-03</lastmod>'))
})

test('renderSitemap: 中文路径做百分号编码', () => {
  const xml = renderSitemap([post({ path: 'posts/月下小令/' })])
  assert.ok(xml.includes('%E6%9C%88%E4%B8%8B%E5%B0%8F%E4%BB%A4'), '应含"月下小令"的 UTF-8 百分号编码')
  assert.ok(!/[\u4e00-\u9fa5]/.test(xml), 'XML 中不应出现裸中文(路径必须已编码)')
})

test('renderSitemap: 多篇按日期倒序', () => {
  const xml = renderSitemap([
    post({ path: 'posts/old/', date: new Date(2025, 0, 1) }),
    post({ path: 'posts/new/', date: new Date(2026, 0, 1) })
  ])
  assert.ok(xml.indexOf('posts/new') < xml.indexOf('posts/old'))
})

test('postUrl: index.html 归一化为目录', () => {
  assert.strictEqual(postUrl({ path: 'posts/a/index.html' }), '/posts/a/')
})

test('postUrl: 已带斜杠保持不变', () => {
  assert.strictEqual(postUrl({ path: 'posts/a/' }), '/posts/a/')
})

test('postUrl: 缺前导斜杠时补上', () => {
  assert.strictEqual(postUrl({ path: 'a' }), '/a')
})

test('postUrl: path 缺失 -> 根路径', () => {
  assert.strictEqual(postUrl({}), '/')
})

test('postUrl: 中文路径不做编码(编码交给调用方的 encodeURI)', () => {
  assert.strictEqual(postUrl({ path: 'posts/月下小令/' }), '/posts/月下小令/')
})
