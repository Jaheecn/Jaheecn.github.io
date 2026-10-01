'use strict'
/* 文章页(post)首帧主题修正:静态 source 页面已直接内联脚本,
   文章页由 hexo layout 渲染,这里通过 injector head_begin 注入相同逻辑。
   只按时间制决定主题(7:00-17:59 浅色,18:00-6:59 深色),不读任何持久偏好。 */

const THEME_SCRIPT = `<script>
;(function () {
  try {
    var hour = new Date().getHours()
    var dark = hour >= 18 || hour < 7
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    /* 阶段5 · P0-B: 首页 hero 大图按当前主题预加载。
       day/night 是两张按主题二选一的背景图(CSS 引用), 原先要等 CSS 下载+解析后浏览器才发现,
       实测 startTime 被推到 8443ms。这里在 head 阶段就确定主题并 preload 对应那张, 让它与
       CSS/HTML 并行下载。
       注意: 本脚本注入在 <head>, 此时 document.body 尚不存在, 故用 URL 路径判定首页。 */
    var p = location.pathname
    if (p === '/' || p === '/index.html') {
      var l = document.createElement('link')
      l.rel = 'preload'
      l.as = 'image'
      l.type = 'image/webp'
      l.fetchPriority = 'high'
      l.href = dark ? '/img/hero/night.webp' : '/img/hero/day.webp'
      document.head.appendChild(l)
    }
  } catch (e) {}
})()
</script>`

/* 文章详情页 hero 大图预加载(2026-09-04 遮罩优化 C): 与页面并行下载,
   遮罩淡出时 hero 已就绪 → 不再"图片后到"的突兀跳变; injector type 'post' 仅命中文章页。
   fetchpriority=high: 抢占带宽(与首页 background02 同策略), 避免低优先级排队延误 */
const POST_HERO_PRELOAD =
  '<link rel="preload" as="image" href="/img/hero/post-hero-banner.webp" fetchpriority="high" type="image/webp">'

hexo.extend.injector.register('head_begin', THEME_SCRIPT, 'default')
hexo.extend.injector.register('head_begin', POST_HERO_PRELOAD, 'post')
