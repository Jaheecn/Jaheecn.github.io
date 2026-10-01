'use strict'
/* 阅读页底部"文章作者/文章链接"来源映射：
   md front matter 中的 author / url 两个字段 → 主题的 copyright_author / copyright_url。
   url 填"无"表示无链接（显示为"无"）。 */
hexo.extend.filter.register('template_locals', function (locals) {
  const page = locals.page
  if (!page) return locals
  const fm = page.front_matter || page
  if (fm.author && typeof page.copyright_author === 'undefined') {
    page.copyright_author = String(fm.author)
  }
  if (fm.url && typeof page.copyright_url === 'undefined') {
    page.copyright_url = String(fm.url)
  }
  // 作者名字链接跟随文章来源 url（"无"则保持主题默认：站点首页）
  if (fm.url && fm.url !== '无' && typeof page.copyright_author_href === 'undefined') {
    page.copyright_author_href = String(fm.url)
  }
  return locals
})
