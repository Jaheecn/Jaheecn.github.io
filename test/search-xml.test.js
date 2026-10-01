'use strict'
/* 阶段3 · 3.1 单元测试: renderSearchXml / htmlToText / escXml
   覆盖: ]]> 转义 / style·h1·pre·highlight 剥离 / 空 songs / 歌曲条目过滤
   阶段4 · 4.8: 三者已迁至 scripts/lib/feeds.js(纯函数, 不再需要 hexo 桩) */
const { test } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')

const { renderSearchXml, htmlToText, escXml } = require(path.join(__dirname, '..', 'scripts', 'lib', 'feeds.js'))

const post = (over) => Object.assign({
  title: 'T', date: new Date(2026, 0, 2), path: 'posts/t/', content: '<p>body</p>'
}, over || {})
const countEntries = xml => (xml.match(/<entry>/g) || []).length

test('renderSearchXml: 空 posts + 空 songs -> 合法空 search', () => {
  const xml = renderSearchXml([], [])
  assert.ok(xml.includes('<search>'))
  assert.ok(xml.trim().endsWith('</search>'))
  assert.strictEqual(countEntries(xml), 0)
})

test('renderSearchXml: 单篇写入 title/url/CDATA', () => {
  const xml = renderSearchXml([post({ title: 'Hello', path: 'posts/hello/' })], [])
  assert.strictEqual(countEntries(xml), 1)
  assert.ok(xml.includes('<title>Hello</title>'))
  assert.ok(xml.includes('<url>/posts/hello/</url>'))
  assert.ok(xml.includes('<![CDATA['))
})

test('renderSearchXml: 内容中的 ]]> 被拆开(不破坏 CDATA)', () => {
  const xml = renderSearchXml([post({ content: '<p>a]]>b</p>' })], [])
  assert.ok(xml.includes('a] ]>b'), '内容里应变成 "] ]>"')
  // 整体上 CDATA 结构必须完好: 每个 <![CDATA[ 都有对应 ]]>
  const opens = (xml.match(/<!\[CDATA\[/g) || []).length
  const closes = (xml.match(/\]\]>/g) || []).length
  assert.strictEqual(opens, closes)
})

test('renderSearchXml: 剥离 style 与 h1', () => {
  const html = '<style>.a{color:red}</style><h1>不该出现</h1><p>应出现</p>'
  const xml = renderSearchXml([post({ content: html })], [])
  assert.ok(!xml.includes('.a{color:red}'), 'style 应被剥离')
  assert.ok(!xml.includes('不该出现'), 'h1 应被剥离')
  assert.ok(xml.includes('应出现'))
})

test('renderSearchXml: 剥离代码块(figure.highlight / pre)', () => {
  const html = '<p>前</p><figure class="highlight"><pre><code>x=1</code></pre></figure><p>后</p>'
  const xml = renderSearchXml([post({ content: html })], [])
  assert.ok(!xml.includes('x=1'), '高亮代码块应被剥离')
  assert.ok(xml.includes('前') && xml.includes('后'))
})

test('renderSearchXml: songs 仅收录含 title 与 bvid 的条目', () => {
  const songs = [
    { title: '歌名', artist: '歌手', bvid: 'BV1' },
    { title: '', artist: 'A', bvid: 'BV2' },
    { title: '无 bvid', artist: 'A' }
  ]
  const xml = renderSearchXml([], songs)
  assert.strictEqual(countEntries(xml), 1)
  assert.ok(xml.includes('/music/?song=BV1'))
})

test('renderSearchXml: 歌曲 url 对 bvid 做编码', () => {
  const xml = renderSearchXml([], [{ title: 'T', artist: 'A', bvid: 'BV1/2' }])
  assert.ok(xml.includes('/music/?song=BV1%2F2'))
})

test('renderSearchXml: 无 songs 参数(undefined)不抛错', () => {
  const xml = renderSearchXml([post({})], undefined)
  assert.strictEqual(countEntries(xml), 1)
})

test('htmlToText: 块级标签转换行、行内标签直接去掉', () => {
  assert.strictEqual(htmlToText('<p>a</p><p>b</p>').replace(/\n+/g, '|'), 'a|b|')
  assert.strictEqual(htmlToText('x<br>y'), 'x\ny')
  assert.strictEqual(htmlToText('<span>a</span><b>b</b>'), 'ab')
})

test('htmlToText: nbsp 转为普通空格', () => {
  assert.strictEqual(htmlToText('a\u00a0b'), 'a b')
})

test('escXml: 五个 XML 特殊字符全部转义', () => {
  assert.strictEqual(escXml('&<>"\''), '&amp;&lt;&gt;&quot;\'')
})
