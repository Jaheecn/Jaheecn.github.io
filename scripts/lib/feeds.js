'use strict'
/* 订阅/索引产物生成(阶段4 · 4.8 从 scripts/nova-tags.js 拆出):
   - search.xml / sitemap.xml / atom.xml 三个字符串生成器
   - 及其私有依赖: stripMd / summaryOf / escXml / htmlToText / postUrl
   纯函数模块, 不依赖 hexo 作用域(只读 site-config 的 SITE 与 lib/date 的 fmtDate),
   可被 scripts/nova-tags.js 与 test/ 下的单元测试直接 require。

   ⚠️ 本文件被 hexo 通过 scripts/nova-tags.js 间接加载 —— 不要在此注册 generator,
      也不要把这里当 hexo 脚本(hexo 只直接加载 scripts/ 顶层的 js)。 */

const { fmtDate } = require('./date')
const { SITE } = require('../site-config')

function stripMd(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x2F|#47|#X2F|nbsp|amp|lt|gt|quot);/gi, m => ({ '&#x2F;': '/', '&#x2f;': '/', '&#47;': '/', '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"' }[m] || m))
    .replace(/[#>*_~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function summaryOf(post) {
  if (post.excerpt && post.excerpt.trim()) return stripMd(post.excerpt).slice(0, 90)
  const body = post.content ? stripMd(post.content) : ''
  return (body.slice(0, 90) || '')
}

function escXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function htmlToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|td|tr|li|ol|ul|h[1-6]|pre|blockquote|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
}

function renderSearchXml(posts, songs) {
  const entries = posts
    .slice()
    .sort(byDateDescThenPath)
    .map(p => {
      const url = postUrl(p)
      let bodyHtml = (p.content || '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '')
      bodyHtml = bodyHtml
        .replace(/<figure class="highlight[^>]*>[\s\S]*?<\/figure>/gi, '\n')
        .replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, '\n')
        .replace(/<code[^>]*>[\s\S]*?<\/code>/gi, ' ')
      const text = htmlToText(bodyHtml).replace(/\n{3,}/g, '\n\n').trim()
      const content = text.replace(/\]\]>/g, '] ]>')
      return '<entry>\n    <title>' + escXml(p.title) + '</title>\n    <url>' + escXml(url) + '</url>\n    <content><![CDATA[' + content + ']]></content>\n  </entry>'
    })
    .join('\n')
  // 歌曲条目(构建期抓取/缓存, 点击直达 /music/?song=<bvid> 定位并播放);
  // content = 歌曲标题(含歌名/简介文案) + 作者, 音乐页框架说明文字不入索引
  const musicEntries = (songs || [])
    .map(s => {
      const title = String(s.title || '').trim()
      const artist = String(s.artist || '').trim()
      const bvid = String(s.bvid || '')
      if (!title || !bvid) return ''
      const content = (title + '\n' + artist).replace(/\]\]>/g, '] ]>')
      return '<entry>\n    <title>' + escXml(title) + '</title>\n    <url>/music/?song=' + encodeURIComponent(bvid) + '</url>\n    <content><![CDATA[' + content + ']]></content>\n  </entry>'
    })
    .filter(Boolean)
    .join('\n')
  return '<?xml version="1.0" encoding="utf-8"?>\n<search>\n'
    + (entries ? entries + '\n' : '')
    + (musicEntries ? musicEntries + '\n' : '')
    + '</search>\n'
}

function renderSitemap(posts) {
  const urls = posts
    .slice()
    .sort(byDateDescThenPath)
    .map(p => {
      return '  <url>\n    <loc>' + escXml(encodeURI(SITE + postUrl(p))) + '</loc>\n    <lastmod>' + fmtDate(p.date) + '</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>'
    })
    .join('\n')
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n'
}

function renderAtom(posts) {
  const sorted = posts.slice().sort(byDateDescThenPath)
  const updated = sorted.length ? fmtDate(sorted[0].date) + 'T00:00:00.000Z' : '1970-01-01T00:00:00.000Z'
  const entries = sorted.map(p => {
    const url = postUrl(p)
    const cats = (p.tags && p.tags.toArray ? p.tags.toArray() : (p.tags || [])).map(t => t.name)
    const catXml = cats.map(c => '<category term="' + escXml(c) + '" scheme="' + SITE + '/articles/' + escXml(encodeURIComponent(c)) + '/"/>').join('\n    ')
    return '  <entry>\n    <author>\n      <name>Jahee</name>\n    </author>\n    ' + catXml + '\n    <id>' + SITE + escXml(url) + '</id>\n    <link href="' + SITE + escXml(url) + '"/>\n    <published>' + fmtDate(p.date) + 'T00:00:00.000Z</published>\n    <summary>' + escXml(summaryOf(p)) + '</summary>\n    <title>' + escXml(p.title) + '</title>\n    <updated>' + fmtDate(p.date) + 'T00:00:00.000Z</updated>\n  </entry>'
  }).join('\n')
  return '<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <author>\n    <name>Jahee</name>\n  </author>\n  <generator uri="https://hexo.io/">Hexo</generator>\n  <id>' + SITE + '/</id>\n  <link href="' + SITE + '/" rel="alternate"/>\n  <link href="' + SITE + '/atom.xml" rel="self"/>\n  <rights>All rights reserved 2026, Jahee</rights>\n  <subtitle>个人学习与生活记录。</subtitle>\n  <title>Jahee</title>\n  <updated>' + updated + '</updated>\n' + entries + '\n</feed>\n'
}

function postUrl(post) {
  let p = post.path || ''
  p = p.replace(/\/index\.html$/, '/')
  if (!p.startsWith('/')) p = '/' + p
  return p
}

/* 日期降序 + 路径升序兜底。
   为什么必须补兜底键: 本站在 8 篇同日期文章(2026-08-17 00:00:00 同一批入库),
   并列时比较器返回 0, 而 Array.prototype.sort 对"相等"元素**不保证稳定顺序**
   —— 表现为每次构建 search.xml/sitemap.xml/atom.xml 里同一批条目的先后发生变化,
   产物 diff 上千行却没有任何实际改动, 无法审阅。
   路径(post.path)在站内唯一且不随构建变化, 用它兜底即可让同一份数据产生逐字节相同的产物。
   (home-generator 侧一直是有兜底的, 见 lib/sort.js byKeys 末尾的 byTitle —— 这里是同一问题的另一半。) */
function byDateDescThenPath(a, b) {
  const d = (b.date || 0) - (a.date || 0)
  if (d) return d
  return postUrl(a) < postUrl(b) ? -1 : postUrl(a) > postUrl(b) ? 1 : 0
}

/* 测试出口: test/ 下的单元测试直接 require 本模块取纯函数。 */
module.exports = {
  stripMd,
  summaryOf,
  escXml,
  htmlToText,
  renderSearchXml,
  renderSitemap,
  renderAtom,
  postUrl,
  byDateDescThenPath
}
