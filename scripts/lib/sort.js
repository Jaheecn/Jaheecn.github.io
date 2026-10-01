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

/* 文章的稳定身份键: post.path 在站内唯一且不随构建变化。
   (与 lib/feeds.js 的 postUrl 同源; 这里不 require feeds, 避免循环依赖。) */
const postPath = p => String((p && (p.path || p.source)) || '')

/* 日期降序 + 路径升序兜底。
   为什么必须补兜底键: 本站有并列日期的文章(如 洛神赋 与 西江月·春色三分过二 同为
   2026-08-29 19:00:00 且都没有 order), 并列时比较器返回 0 时, 元素的先后取决于
   locals.posts 这个 Query 的底层插入顺序 —— 而插入顺序取决于异步文件处理的完成顺序,
   因此每次 clean 构建的 prev/next 兄弟链接与 tag 页列表都可能不同。
   实测: 连续三次 `hexo clean && npm run build` 产出三套不同的 docs/posts 指纹。
   路径升序兜底后, 同一份数据产生逐字节相同的产物。
   (lib/feeds.js 的 byDateDescThenPath 修的是 search/sitemap/atom 那一半, 这里是另一半。) */
function byDateDescThenPath(a, b) {
  const d = (b && b.date ? b.date : 0) - (a && a.date ? a.date : 0)
  if (d) return d
  const pa = postPath(a)
  const pb = postPath(b)
  return pa < pb ? -1 : pa > pb ? 1 : 0
}

/* 手动序升序(缺省 999) + 日期降序 + 路径升序兜底。
   给 tag 页列表用: 有 order 的按作者手写的顺序(如 Markdown 系列 1..5),
   没有 order 的按时间倒序, 再并列时按路径 —— 三级全部可比, 不存在返回 0 的情况。 */
function byOrderThenDateDescThenPath(a, b) {
  const oa = (a && a.order) || 999
  const ob = (b && b.order) || 999
  if (oa !== ob) return oa - ob
  return byDateDescThenPath(a, b)
}

module.exports = { toMs, byTitle, byKeys, postPath, byDateDescThenPath, byOrderThenDateDescThenPath }
