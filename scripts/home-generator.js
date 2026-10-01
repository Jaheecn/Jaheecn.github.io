'use strict'
/* 首页生成器(P5 改版, 2026-08-27):
   输出 index.html,由 themes/nova/layout/home.pug 渲染。
   公共壳(loading/sidebar/header/nav)由 composeShellTop 组装;
   页级内容: 顶部 hero(home-parts/top.html, LATEST SIGNAL 动态注入) + 中部骨架(mid.html:
             精选工程 cards + 最新文章 cards, 均由生成器注入占位) + 尾部(bottom.html: 生活碎片)
   + 公共尾。
   P5 数据规则(全部 generate 时重算, 无需维护):
   - 精选工程: 工程按 浏览量 desc -> updated desc -> title asc 取前 3(大卡+两小卡)。
   - 最新文章: 文章按 updated desc -> 浏览量 desc -> title asc 取前 6(2 列 3 行)。
   - LATEST SIGNAL: 工程+文章合并按 updated desc -> 浏览量 desc -> title asc 取第 1 名。
   - 浏览量: scripts/views-cache.json(fetch-views.js 从 busuanzi 拉取); 缺失时 projects-data views 兜底。
   - 工程 updated: projects-data 的 updated 字段优先; 否则取 source/assets/projects/<目录> mtime。 */

const fs = require('fs')
const path = require('path')
const { composeShellTop, buildFooter, RIGHTSIDE_ASIDE } = require('./parts-common')
const { fmtDate } = require('./lib/date')
const { projectUpdated } = require('./lib/project-date')
const { toMs, byKeys } = require('./lib/sort')
const projectsData = require('./projects-data')

const partsDir = path.join(__dirname, '..', 'themes', 'nova', 'layout', 'home-parts')
const read = f => fs.readFileSync(path.join(partsDir, f), 'utf8')

// 首页专有: 全屏背景动画层(body 直接子元素, loading 与 sidebar 之间)
const WEB_BG = '<div class="bg-animation" id="web_bg"></div>'

// —— 浏览量缓存(scripts/views-cache.json, fetch-views.js 维护) ——
function loadViewMap() {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'views-cache.json'), 'utf8'))
    return c.pv || {}
  } catch (e) { return {} }
}

// —— 统一时间/排序工具(阶段4 批次N · 4.4: 实现已收敛到 scripts/lib/sort.js,
//    原先与 projects-generator.js 各有一份几乎逐字相同的拷贝) ——
const byUpdatedPvTitle = byKeys([[r => toMs(r.updatedAt), 'desc'], [r => r.pv, 'desc']])
const byPvUpdatedTitle = byKeys([[r => r.pv, 'desc'], [r => toMs(r.updatedAt), 'desc']])

// —— 文章封面按标签归类(与旧版规则一致) ——
function coverFor(post) {
  const n = post.tags.toArray().map(t => t.name).join(' ')
  if (/MySQL|sql|PostgreSQL|数据库/i.test(n)) return 'tech-mysql.webp'
  if (/数组|链表|栈|字符串|算法|LeetCode|KMP|队列/i.test(n)) return 'tech-algorithm.webp'
  if (/Go/i.test(n)) return 'tech-go.webp'
  return 'tech-notes.webp'
}

// —— LATEST SIGNAL(hero 内动态): 工程+文章合并取"最近提交" ——
function latestSignal(entry) {
  const kind = entry.kind === 'project' ? '工程' : '文章'
  const dateLabel = String(entry.updatedAt || '').slice(0, 10)
  return '<a class="nova-latest-signal" href="' + encodeURI(entry.url) + '" aria-label="最近提交：' +
    entry.title + '，' + dateLabel + '"><span>LATEST SIGNAL</span><strong><em class="nova-signal-kind">[' + kind + ']</em>' +
    entry.title + '</strong><time datetime="' + dateLabel + '">' + dateLabel + '</time></a>'
}

// —— 精选工程卡(1 lead + 2 side, 结构/样式沿用旧精选记录卡) ——
function featuredCardsHtml(rows) {
  return rows.map((p, i) => {
    const mod = i === 0 ? 'nova-note-card--lead' : 'nova-note-card--side'
    const href = encodeURI(p.url)
    return '<div class="nova-note-card ' + mod + '" data-href="' + href + '" role="link" tabindex="0" aria-label="查看工程：' + p.title + '">' +
      '<div class="post_cover"><a href="' + href + '" title="' + p.title + '">' +
      '<img class="post-bg" src="' + p.cover + '" alt="' + p.title + '" loading="lazy" decoding="async" width="' + p.coverW + '" height="' + p.coverH + '"></a></div>' +
      '<div class="recent-post-info">' +
      '<a class="article-title" href="' + href + '" title="' + p.title + '">' + p.title + '</a>' +
      '<div class="article-meta-wrap">' +
      '<span class="post-meta-date"><i class="far fa-calendar-alt"></i><span class="article-meta-label">发布于</span>' +
      '<time datetime="' + p.date + '" title="' + p.date + '">' + p.date + '</time></span>' +
      '<span class="article-meta"><span class="article-meta-separator">|</span><i class="fas fa-inbox"></i>' +
      '<span class="article-meta__categories">' + p.category + '</span></span></div>' +
      '<div class="content">' + p.description + '</div></div></div>'
  }).join('\n')
}

// —— 最新文章卡(新样式: 封面贴左 + 标题/日期/标签, 2 列 3 行, 对齐参考版) ——
function recentCardsHtml(rows) {
  return rows.map(p => {
    const href = encodeURI(p.url)
    const d = p.date
    return '<a class="nova-recent-card" href="' + href + '" role="link" aria-label="阅读文章：' + p.title + '">' +
      '<span class="nova-recent-cover"><img class="post-bg" src="/img/covers/' + p.cover + '" alt="' + p.title + '" loading="lazy" decoding="async" width="1200" height="900"></span>' +
      '<span class="nova-recent-info">' +
      '<span class="nova-recent-title">' + p.title + '</span>' +
      '<span class="nova-recent-meta"><time datetime="' + d + '" title="发表于 ' + d + '"><i class="far fa-calendar-alt" aria-hidden="true"></i>发表于 ' + d + '</time>' +
      '<span class="nova-recent-tag"><i class="fas fa-inbox" aria-hidden="true"></i>' + p.tagName + '</span></span>' +
      '</span></a>'
  }).join('\n')
}

hexo.extend.generator.register('nova-home', function (locals) {
  const viewMap = loadViewMap()
  const posts = locals.posts.sort('order', 1).toArray()

  // 文章行(前处理): 浏览量以线上路径为准(与 fetch-views 的 key 规则一致)
  const postRows = posts.map(p => {
    const slug = String(p.slug || '').replace(/^\/+|\/+$/g, '')
    const url = '/posts/' + slug + '/'
    return {
      kind: 'post',
      title: p.title,
      url: url,
      updatedAt: fmtDate(p.updated || p.date),
      date: fmtDate(p.date),
      pv: viewMap[url] || 0,
      cover: coverFor(p),
      tagName: (p.tags.toArray()[0] || {}).name || ''
    }
  })

  // 工程行(前处理)
  const projectRows = projectsData.map(p => ({
    kind: 'project',
    title: p.title,
    url: '/projects/' + p.id + '/',
    updatedAt: projectUpdated(p),
    date: p.date || '',
    pv: viewMap['/projects/' + p.id + '/'] || p.views || 0,
    cover: p.cover,
    coverW: p.coverW,
    coverH: p.coverH,
    category: p.category,
    description: p.description
  }))

  // 三重选取: 精选工程(3) / 最新文章(6) / LATEST SIGNAL(1)
  const featuredProjects = projectRows.slice().sort(byPvUpdatedTitle).slice(0, 3)
  const latestPosts = postRows.slice().sort(byUpdatedPvTitle).slice(0, 6)
  const signal = projectRows.concat(postRows).sort(byUpdatedPvTitle)[0] || null

  return {
    path: 'index.html',
    layout: 'home',
    data: {
      // 公共壳 + 页级 hero 段(nova-homepage 开/hero/滚动提示; LATEST 动态注入原位置)
      shellTop: composeShellTop({ headerCls: 'full_page', pre: WEB_BG, }) + '\n' +
        read('top.html').split('<!--NOVA-LATEST-->').join(signal ? latestSignal(signal) : ''),
      // 中部骨架: 精选工程 + 最新文章(卡片由生成器注入占位)
      mid: read('mid.html')
        .split('<!--NOVA-FEATURED-->').join(featuredCardsHtml(featuredProjects))
        .split('<!--NOVA-RECENT-->').join(recentCardsHtml(latestPosts)),
      // 页级尾部(碎片+自定义页脚+容器闭合) + 公共尾(rightside/脚本/local-search, 无公共页脚)
      shellBottom: read('bottom.html') + '\n' + buildFooter({
        withFooter: false,
        hideExtra: RIGHTSIDE_ASIDE,
        pageScripts: read('page-scripts.html')
      })
    }
  }
})
