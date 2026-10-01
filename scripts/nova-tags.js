'use strict'
/* 自动生成文章标签系统(P2.2 重构):
   - articles/index.html     → layout: tags-index(数据驱动,head 由 base 统一输出)
   - articles/<tag>/index.html → layout: tag(数据驱动)
   - search.xml / sitemap.xml / atom.xml(字符串生成)
   不再使用 nova-templates 占位符模板;域名从 _config.yml url 读取。 */

const fs = require('fs')
const path = require('path')
const { composeShellTop, buildFooter, RIGHTSIDE_ASIDE } = require('./parts-common')
const { fmtDate } = require('./lib/date')

const tagParts = path.join(__dirname, '..', 'themes', 'nova', 'layout', 'tag-parts')
const idxParts = path.join(__dirname, '..', 'themes', 'nova', 'layout', 'idx-parts')
const readTagTop = fs.readFileSync(path.join(tagParts, 'top.html'), 'utf8')
const readTagBottom = fs.readFileSync(path.join(tagParts, 'bottom.html'), 'utf8')
const readIdxTop = fs.readFileSync(path.join(idxParts, 'top.html'), 'utf8')

const { SITE } = require('./site-config')
const { loadSearchSongs } = require('./lib/music-playlist')
// 阶段4 · 4.8: search.xml / sitemap.xml / atom.xml 三件套及其依赖已拆到 lib/feeds.js
const { renderSearchXml, renderSitemap, renderAtom } = require('./lib/feeds')
// 并列日期时的确定性兜底比较器(详见 lib/sort.js 顶部注释)
const { byDateDescThenPath, byOrderThenDateDescThenPath } = require('./lib/sort')

function tagLdjson(tagName) {
  const tagUrl = encodeURI(SITE + '/articles/' + tagName + '/')
  return '<script type="application/ld+json">{"@context":"https://schema.org","@type":"CollectionPage","@id":"' + tagUrl + '#webpage","name":"' + tagName + '","url":"' + tagUrl + '","description":"浏览 Jahee 博客中标记为\u201c' + tagName + '\u201d的文章与学习记录。","inLanguage":"zh-CN","isPartOf":{"@type":"WebSite","@id":"' + SITE + '/#website","url":"' + SITE + '/","name":"Jahee"}}</script>'
}

function idxLdjson() {
  return '<script type="application/ld+json">{"@context":"https://schema.org","@type":"CollectionPage","@id":"' + SITE + '/articles/#webpage","name":"\u6587\u7ae0","url":"' + SITE + '/articles/","description":"\u901a\u8fc7\u6587\u7ae0\u67e5\u627e Jahee \u535a\u5ba2\u4e2d\u7684\u6280\u672f\u7b14\u8bb0\u3001\u7b97\u6cd5\u7ec3\u4e60\u4e0e\u5b66\u4e60\u8bb0\u5f55\u3002","inLanguage":"zh-CN","isPartOf":{"@type":"WebSite","@id":"' + SITE + '/#website","url":"' + SITE + '/","name":"Jahee"}}</script>'
}

hexo.extend.generator.register('nova-tags', async function (locals) {
  const posts = locals.posts.toArray ? locals.posts.toArray() : locals.posts
  const tagMap = new Map()
  posts.forEach(p => {
    const tags = p.tags && p.tags.toArray ? p.tags.toArray() : (p.tags || [])
    tags.forEach(t => {
      if (!tagMap.has(t.name)) tagMap.set(t.name, [])
      tagMap.get(t.name).push(p)
    })
  })
  const allTags = Array.from(tagMap.entries()).map(([name, list]) => ({ name, count: list.length, posts: list }))

  const sortedTags = allTags.slice().sort((a, b) => (b.count - a.count) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  const sortedAllTags = allTags.slice().sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  const top = sortedTags[0] || { name: '', count: 0 }
  const latest = posts.slice().sort((a, b) => (b.date - a.date) || ((a.order || 999) - (b.order || 999)) || byDateDescThenPath(a, b))[0] || { title: '', date: new Date() }

  // 公共壳(P1 重建): sidebar 统计卡数字动态计算
  const articles = { href: '/articles/', label: '文章', count: String(posts.length) }
  const idxShellTop = composeShellTop({
    pageClass: 'type-tags',
    headerCls: 'not-home-page nova-tag-hero',
    headerStyle: 'background-image:url(/img/hero/tag-hero.webp)',
    siteData: articles,
    closeHeader: false
  }) + '\n' + readIdxTop
  const idxShellBottom = buildFooter()
  const tagShellTop = composeShellTop({
    pageClass: '',
    headerCls: 'not-home-page nova-tag-hero',
    headerStyle: 'background-image:url(/img/hero/leetcode.webp)',
    siteData: articles,
    closeHeader: false
  }) + '\n' + readTagTop
  // tag 页级: 单双栏切换按钮 + 页级脚本(tag-page.js)
  const tagShellBottom = buildFooter({ hideExtra: RIGHTSIDE_ASIDE, pageScripts: readTagBottom })

  // 音乐歌单(搜索索引用): 构建时抓取云函数, 失败用 data/music-playlist.json 缓存兜底
  const searchSongs = await loadSearchSongs()

  const files = [
    { path: 'search.xml', data: renderSearchXml(posts, searchSongs) },
    { path: 'sitemap.xml', data: renderSitemap(posts) },
    { path: 'atom.xml', data: renderAtom(posts) },
    {
      path: 'articles/index.html',
      layout: 'tags-index',
      data: {
        topicsCount: String(allTags.length),
        articlesCount: String(posts.length),
        topTopicCount: String(top.count),
        topTopicName: top.name,
        latestDate: fmtDate(latest.date),
        latestTitle: latest.title,
        tags: sortedTags.map(t => ({ name: t.name, count: t.count })),
        ldjson: idxLdjson(),
        shellTop: idxShellTop,
        shellBottom: idxShellBottom
      }
    }
  ]

  allTags.forEach(t => {
    const sorted = t.posts.slice().sort(byOrderThenDateDescThenPath)
    const count = sorted.length
    const firstYear = fmtDate(sorted[0].date).slice(0, 4)
    const last = fmtDate(sorted[sorted.length - 1].date)
    const lastDate = last.slice(5).replace('-', '·')
    const yearRange = firstYear + '—' + last.slice(0, 4)
    const seed = t.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').slice(0, 6) || 't'
    files.push({
      path: 'articles/' + t.name + '/index.html',
      layout: 'tag',
      data: {
        tagName: t.name,
        posts: sorted,
        allTags: sortedAllTags.map(x => ({ name: x.name, count: x.count })),
        count: String(count),
        firstYear: firstYear,
        lastDate: lastDate,
        yearRange: yearRange,
        seed: seed,
        mainDesc: '围绕“' + t.name + '”整理的文章与实践记录。',
        ldjson: tagLdjson(t.name),
        shellTop: tagShellTop,
        shellBottom: tagShellBottom
      }
    })
  })

  return files
})

/* 测试出口(阶段3): 把纯函数导出给 node:test 直接调用。
   不影响 hexo 运行 —— hexo 只使用上面的 generator.register;
   这里的导出仅供 test/ 目录下的单元测试 require。
   阶段4 · 4.8: xml 三件套(renderSearchXml/renderSitemap/renderAtom)、
   stripMd/summaryOf/escXml/htmlToText/postUrl 已迁至 ./lib/feeds, 测试改从那里取;
   fmtDate 的单一来源是 ./lib/date(本文件仅作内部使用, 不再转出)。 */
module.exports = {}
