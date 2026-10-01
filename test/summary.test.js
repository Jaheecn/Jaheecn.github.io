'use strict'
/* 阶段3 · 3.1 单元测试: stripMd / summaryOf
   覆盖: 代码块 / 行内代码 / 图片 / 链接 / HTML 标签 / 实体 / 90 字截断 / 空输入
   阶段4 · 4.8: 两者已迁至 scripts/lib/feeds.js —— 纯函数模块, 不注册 generator,
   因此不再需要 global.hexo 桩 */
const { test } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')

const { stripMd, summaryOf } = require(path.join(__dirname, '..', 'scripts', 'lib', 'feeds.js'))

test('stripMd: 代码块整体丢弃', () => {
  assert.strictEqual(stripMd('前\n```js\nconst a = 1\n```\n后'), '前 后')
})

test('stripMd: 行内代码保留内容、去掉反引号', () => {
  assert.strictEqual(stripMd('用 `npm run build` 构建'), '用 npm run build 构建')
})

test('stripMd: 图片丢弃、链接保留文字', () => {
  assert.strictEqual(stripMd('![alt](/a.png)文字[链接](http://x)'), '文字链接')
})

test('stripMd: HTML 标签转空格', () => {
  assert.strictEqual(stripMd('<p>段落</p>'), '段落')
})

test('stripMd: HTML 实体解码', () => {
  assert.strictEqual(stripMd('a&amp;b&nbsp;c'), 'a&b c')
  assert.strictEqual(stripMd('x&#x2F;y'), 'x/y')
})

test('stripMd: Markdown 标记符号转空格', () => {
  assert.strictEqual(stripMd('## 标题\n> 引用\n*粗*'), '标题 引用 粗')
})

test('stripMd: 连续空白压缩为单个空格', () => {
  assert.strictEqual(stripMd('a     b\n\n\nc'), 'a b c')
})

test('summaryOf: 优先 excerpt, 且截断到 90 字', () => {
  const long = 'x'.repeat(200)
  const out = summaryOf({ excerpt: long, content: '<p>正文</p>' })
  assert.strictEqual(out.length, 90)
  assert.strictEqual(out, 'x'.repeat(90))
})

test('summaryOf: excerpt 为空串时回退 content', () => {
  assert.strictEqual(summaryOf({ excerpt: '   ', content: '<p>正文</p>' }), '正文')
})

test('summaryOf: 无 excerpt 用 content', () => {
  assert.strictEqual(summaryOf({ content: '<p>正文内容</p>' }), '正文内容')
})

test('summaryOf: 纯代码块 -> 空串(不抛错)', () => {
  assert.strictEqual(summaryOf({ content: '```\ncode\n```' }), '')
})

test('summaryOf: 空对象 -> 空串', () => {
  assert.strictEqual(summaryOf({}), '')
})

test('summaryOf: content 为 undefined -> 空串', () => {
  assert.strictEqual(summaryOf({ content: undefined }), '')
})
