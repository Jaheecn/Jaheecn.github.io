'use strict'
/* 确定性文章生成器 —— 覆盖 hexo 内置的 post generator(2026-10-01)

   背景(实测):
   hexo 内置实现是 `locals.posts.sort('-date').toArray()` —— 只按日期排一次。
   本站存在并列日期的文章(洛神赋 与 西江月·春色三分过二 同为 2026-08-29 19:00:00,
   且都没有 front-matter order), 并列时 warehouse 不会给出任何次序保证, 于是
   posts 数组的先后取决于 locals.posts 这个 Query 的底层插入顺序; 而插入顺序又取决于
   hexo 异步读取/处理 source/_posts 的完成顺序。结果:

     连续三次 `hexo clean && npm run build`
       -> docs/posts 页指纹 718AA4FE... / CF0511B8... / CB153D1D...  三套全不同

   表现为每篇文章底部的「上一篇 / 下一篇」随机换人, 且每次构建 docs/ 都产生
   无法审阅的 diff。这不是渲染问题, 是排序问题。

   修法: 排序改为「日期降序 + 路径升序兜底」(比较器见 lib/sort.js byDateDescThenPath),
   其余逻辑与 hexo 内置实现逐字保持一致(包括 __post 标记与 layouts 推导),
   避免与主题/其它生成器产生行为差异。

   lib/feeds.js 的 byDateDescThenPath 修的是 search.xml / sitemap.xml / atom.xml 那一半;
   scripts/nova-tags.js 修的是 tag 页列表那一半; 这里补上最后一半: prev/next 兄弟链接。

   升级 hexo 时需要复核 node_modules/hexo/dist/plugins/generator/post.js 是否仍与下文一致。 */

const { byDateDescThenPath } = require('./lib/sort')

function postGenerator(locals) {
  const posts = locals.posts.toArray().sort(byDateDescThenPath)
  if (process.env.PG_DEBUG) {
    console.log('[PG_DEBUG] 生成器已生效, 共 ' + posts.length + ' 篇, 前 8 篇顺序:')
    posts.slice(0, 8).forEach((p, i) => {
      console.log('[PG_DEBUG]   ' + i + '  path=' + JSON.stringify(p.path) +
        '  source=' + JSON.stringify(p.source) +
        '  date=' + (p.date && p.date.toISOString ? p.date.toISOString() : String(p.date)) +
        '  title=' + JSON.stringify(p.title))
    })
  }
  const { length } = posts
  return posts.map((post, i) => {
    const { path, layout } = post
    if (!layout || layout === 'false') {
      return { path, data: post.content }
    }
    if (i) post.prev = posts[i - 1]
    if (i < length - 1) post.next = posts[i + 1]
    const layouts = ['post', 'page', 'index']
    if (layout !== 'post') layouts.unshift(layout)
    post.__post = true
    return { path, layout: layouts, data: post }
  })
}

hexo.extend.generator.register('post', postGenerator)
