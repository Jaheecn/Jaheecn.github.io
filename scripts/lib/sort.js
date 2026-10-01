'use strict'
/* 排序工具(阶段4 批次N · 4.4 收敛, 2026-09-11)
   原先 home-generator.js 与 projects-generator.js 各自维护一份几乎逐字相同的
   "日期转毫秒 + 确定性 tie-break 比较器":
     home:       toMs(s) / byUpdatedPvTitle / byPvUpdatedTitle
     projects:   updMs(p) / byPvUpd / byUpd
   差异只在字段来源, 且 projects 侧的 updMs 缺少 isNaN 保护 ——
   projectUpdated 一旦返回非法值就会产生 NaN, 使 Array.sort 结果不确定(页面顺序随机)。
   这里统一为 toMs + 比较器工厂, 两个生成器共用同一实现。

   tie-break 链的约定(与旧实现逐字等价): 逐级比较, 某级不等即返回;
   全部相等时按标题中文升序兜底 —— 保证同一份数据每次构建得到完全相同的顺序。 */

/* 任意日期形态(字符串/Date/moment) -> 毫秒; 非法值回退 0, 保证比较器确定性 */
const toMs = s => { const d = new Date(s); return isNaN(d.getTime()) ? 0 : d.getTime() }

/* 标题本地化比较; 缺 title 时不抛错(旧实现直接 a.title.localeCompare, 字段缺失会崩) */
const byTitle = (a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'zh')

/* 比较器工厂: specs = [[取值函数, 'desc'|'asc'], ...], 末尾自动按标题升序兜底。
   用法: byKeys([[r => toMs(r.updatedAt), 'desc'], [r => r.pv, 'desc']]) */
function byKeys(specs) {
  return (a, b) => {
    for (const spec of specs) {
      const get = spec[0]
      const dir = spec[1] === 'asc' ? 'asc' : 'desc'
      const va = get(a)
      const vb = get(b)
      if (va === vb) continue
      const d = dir === 'asc' ? va - vb : vb - va
      if (d) return d
    }
    return byTitle(a, b)
  }
}

module.exports = { toMs, byTitle, byKeys }
