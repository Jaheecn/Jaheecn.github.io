'use strict'
/* 资源版本号单源化(阶段4 批次L · 4.1, 2026-09-11)
   背景: 全站资源 URL 上的 ?v=<版本> 原先硬编码在 17 处 ——
     - _config.nova.yml 的 inject 段 13 行(CSS 9 + JS 4)
     - themes/nova/layout/{home-parts/page-scripts.html, parts-common/footer.html, tag-parts/bottom.html} 4 处
   问题: yml 配置与静态 html 片段无法做模板插值(pug 的 config.version 覆盖不到),
         每次改版本号都要手工同步 7 个文件, 且无任何校验 —— 漏改不会报错, 只会让
         老访客命中旧缓存(改了 CSS/JS 却拿不到新文件)。
   方案: 这些位置统一写占位符 ?v=__VERSION__, 由本过滤器在渲染后替换为
         scripts/site-config.js 从 _config.yml 解析出的 VERSION(唯一来源)。
        ✅ 已于 2026-09-13 核实落实完毕: 全仓共 29 处占位符(_config.nova.yml 13 +
        themes/nova/... 7 + themes/butterfly/... 7 个同类文件 + 本文件自身 2),
        **不再有任何硬编码的站点版本号** —— 改版本号只需动 _config.yml 一行。
   为什么不改成 inject-theme.js 那种代码注入: inject 段的加载顺序(CSS 先、JS 后、
   部分带 defer)是首帧渲染正确性的关键, 改成代码生成会引入顺序回归风险;
   而 after_render 过滤器只替换字符串, 顺序与结构完全不变。
   注意: 主题自带的 ?v=5.7.0(/js/utils.js、/js/search/local-search.js、/css/index.css)
   属上游文件, 不在本机制范围内, 保持原样。 */

const { VERSION } = require('./site-config')

const PLACEHOLDER = '__VERSION__'

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || str.indexOf(PLACEHOLDER) === -1) return str
  return str.split(PLACEHOLDER).join(VERSION)
})
