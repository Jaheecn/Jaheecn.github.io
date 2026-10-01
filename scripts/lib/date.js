'use strict'
/* 日期工具(P1·R7 2026-08-27): 生成器共用, 规范位置 scripts/lib/。
   支持 hexo moment 对象(year()/month()/date())与原生 Date。 */

function fmtDate(d) {
  const m = d
  const y = m.year ? m.year() : m.getFullYear()
  const mo = String((m.month ? m.month() : m.getMonth()) + 1).padStart(2, '0')
  const day = String(m.date ? m.date() : m.getDate()).padStart(2, '0')
  return y + '-' + mo + '-' + day
}

module.exports = { fmtDate }
