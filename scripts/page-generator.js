'use strict'
/* 静态页面生成器(P2.2, P1 重建 2026-08-27): music/moments/about/404
   由 layout 渲染, head 走 base 统一输出;
   body 由 composeShell 组装(公共壳 + 各页纯内容), 页级差异全部参数化:
     pageClass / headerCls / mainCls(壳), showExtra(rightside 去评论), pageScripts(评论内联脚本+页级 js)。
   courses 已于 2026-08-27 移除(遗留过期页面)。 */

const fs = require('fs')
const path = require('path')
const { composeShell, WALINE_COMMENT, RIGHTSIDE_COMMENT, COMMENT_CORE } = require('./parts-common')
const { VERSION } = require('./site-config')

const partsDir = path.join(__dirname, '..', 'themes', 'nova', 'layout', 'page-parts')
const readMain = name => fs.readFileSync(path.join(partsDir, name + '.html'), 'utf8')

const PAGES = [
  {
    name: 'music',
    path: 'music/index.html',
    layout: 'music',
    pageClass: 'type-music',
    headerCls: 'not-top-img',
    mainCls: 'layout hide-aside',
    // 全站背景层(P1 补回): 与 prod 一致——DOM 保留, 页面 css 隐藏
    pre: '<div class="bg-animation" id="web_bg"></div>',
    showExtra: RIGHTSIDE_COMMENT,
    pageScripts: WALINE_COMMENT + '\n' + '<script defer="" data-pjax="" src="/rose-galaxy/js/music-page.js?v=' + VERSION + '"></script>'
  },
  {
    name: 'moments',
    path: 'moments/index.html',
    layout: 'moments',
    pageClass: '',
    headerCls: 'not-home-page nova-moments-nav-header',
    mainCls: 'nova-moments-shell',
    showExtra: RIGHTSIDE_COMMENT,
    pageScripts: WALINE_COMMENT + '\n' + '<script defer="" data-pjax="" src="/rose-galaxy/js/moments-page.js?v=' + VERSION + '"></script>' + '\n' + '<script defer="" data-pjax="" src="/rose-galaxy/js/moments-feed.js?v=' + VERSION + '"></script>'
  },
  {
    name: 'about',
    path: 'about/index.html',
    layout: 'about',
    pageClass: 'type-about',
    headerCls: 'not-top-img nova-about-nav-header',
    mainCls: 'nova-about-shell',
    showExtra: RIGHTSIDE_COMMENT,
    pageScripts: WALINE_COMMENT
  },
  {
    name: '404',
    path: '404.html',
    layout: '404',
    pageClass: 'type-404',
    headerCls: 'not-top-img',
    mainCls: 'layout hide-aside',
    // 404 专属背景大图(P1 补回): 与 prod 一致
    pre: '<div class="bg-animation" id="web_bg" style="background-image: url(/img/hero/error-bg.webp);"></div>'
  }
]

hexo.extend.generator.register('nova-pages', function () {
  return PAGES.map(p => ({
    path: p.path,
    layout: p.layout,
    data: {
      body: composeShell({
        pageClass: p.pageClass,
        headerCls: p.headerCls,
        mainCls: p.mainCls,
        mainInner: readMain(p.name).replace('<!--NOVA-COMMENT-CORE-->', COMMENT_CORE),
        pre: p.pre,
        showExtra: p.showExtra,
        pageScripts: p.pageScripts
      })
    }
  }))
})
