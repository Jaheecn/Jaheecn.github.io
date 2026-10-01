'use strict'
/* 阶段3 · 3.1 单元测试: scripts/lib/date.js 的 fmtDate
   覆盖: 原生 Date / moment 形态(year()/month()/date()) / 补零 / undefined 抛错 */
const { test } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')

const { fmtDate } = require(path.join(__dirname, '..', 'scripts', 'lib', 'date.js'))

test('fmtDate: 原生 Date(月份为 0 基)', () => {
  assert.strictEqual(fmtDate(new Date(2026, 8, 11)), '2026-09-11')
})

test('fmtDate: 月/日补零', () => {
  assert.strictEqual(fmtDate(new Date(2026, 0, 5)), '2026-01-05')
  assert.strictEqual(fmtDate(new Date(2026, 11, 31)), '2026-12-31')
})

test('fmtDate: moment 形态(有 year/month/date 方法, month 为 0 基)', () => {
  const momentLike = { year: () => 2025, month: () => 9, date: () => 17 }
  assert.strictEqual(fmtDate(momentLike), '2025-10-17')
})

test('fmtDate: moment 与 Date 对同一日期结果一致', () => {
  const d = new Date(2026, 7, 27)
  const momentLike = { year: () => d.getFullYear(), month: () => d.getMonth(), date: () => d.getDate() }
  assert.strictEqual(fmtDate(d), fmtDate(momentLike))
})

test('fmtDate: undefined 抛错(锁定既有行为, 提醒调用方判空)', () => {
  assert.throws(() => fmtDate(undefined))
})
