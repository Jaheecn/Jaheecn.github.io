(() => {
  'use strict'

  if (window.__novaUxBoot) return
  window.__novaUxBoot = true

  const INITIAL_MIN_DURATION = 50
  const INITIAL_MAX_DURATION = 2000
  const EXIT_DURATION = 300
  // 首页首屏 loading 最小展示时长:即使内容/背景图已就绪,loading 也至少展示这么久,
  // 避免"一闪而过"显得不稳定。退场时同时满足"已展示 ≥ INITIAL_MIN_SHOW" 与"背景图 ready"。
  const INITIAL_MIN_SHOW = 400
  // 首页 hero 背景图(深色 night.webp / 浅色 day.webp):loading 需等其渲染完成再退场,
  // 否则首屏会"粒子先动、图片后到"。最长等待 HOME_BG_MAX_WAIT 兜底防弱网卡死。
  const HOME_BG = { dark: '/img/hero/night.webp', light: '/img/hero/day.webp' }
  const HOME_BG_MAX_WAIT = 3000
  let homeBgReady = false
  const ROUTE_CLASSES = [
    'nova-home-active',
    'nova-music-route',
    'nova-tag-route',
    'nova-tags-route',
    'nova-projects-route',
    'nova-project-detail-route',
    'nova-moments-route',
    'nova-about-route',
  ]
  let initialFinishTimer = 0
  let initialFallbackTimer = 0
  let removeTimer = 0
  let initialFinishScheduled = false
  let statsTimer = 0
  let navigationObserver = null
  let searchObserver = null

  function getLoader() {
    const loaders = Array.from(document.querySelectorAll('[data-nova-loading]'))
    let loader = loaders.shift()
    loaders.forEach(item => item.remove())
    if (loader) return loader

    loader = document.createElement('div')
    loader.className = 'nova-page-loading'
    loader.dataset.novaLoading = ''
    loader.setAttribute('aria-hidden', 'true')
    loader.innerHTML = `
      <div class="nova-page-loading__inner">
        <span class="nova-page-loading__mark" aria-hidden="true"></span>
        <strong>Jahee</strong>
        <small>LOADING THE NIGHT...</small>
      </div>`
    document.body.appendChild(loader)
    return loader
  }

  function enhanceSearch() {
    const dialog = document.querySelector('#local-search .search-dialog')
    const input = dialog?.querySelector('.local-search-input input')
    const results = dialog?.querySelector('#local-search-results')
    if (!dialog || !input || !results || dialog.dataset.novaSearchReady === 'true') return
    dialog.dataset.novaSearchReady = 'true'

    searchObserver?.disconnect()
    searchObserver = null

    const state = document.createElement('div')
    state.className = 'nova-search-state'
    state.innerHTML = `
      <span class="nova-search-state__eyebrow">QUICK PASSAGE</span>
      <strong>从这里进入站内档案</strong>
      <p>输入关键词，或先浏览常用页面。</p>
      <nav aria-label="搜索快速入口">
        <a href="/articles/">文章</a>
        <a href="/projects/">工程</a>
        <a href="/music/">音乐</a>
      </nav>`
    results.before(state)

    const renderState = () => {
      const query = input.value.trim()
      const hasResults = Boolean(results.querySelector('.local-search-hit-item'))
      state.hidden = Boolean(query && hasResults)
      state.classList.toggle('is-empty-result', Boolean(query && !hasResults))
      if (query && !hasResults) {
        state.querySelector('.nova-search-state__eyebrow').textContent = 'NO SIGNAL'
        state.querySelector('strong').textContent = '没有找到相关记录'
        state.querySelector('p').textContent = '换一个更短的关键词，或从快速入口继续浏览。'
      } else {
        state.querySelector('.nova-search-state__eyebrow').textContent = 'QUICK PASSAGE'
        state.querySelector('strong').textContent = '从这里进入站内档案'
        state.querySelector('p').textContent = '输入关键词，或先浏览常用页面。'
      }
    }

    input.addEventListener('input', () => window.setTimeout(renderState, 0))
    searchObserver = new MutationObserver(renderState)
    searchObserver.observe(results, { childList: true, subtree: true })
    renderState()
  }

  function cleanupSearch() {
    searchObserver?.disconnect()
    searchObserver = null
  }

  // 等待首页 hero 背景图加载完成(方案 A)。仅首页生效;非首页立即回调。
  // 用真实 <img> 预加载当前主题背景图,onload 后才让 loading 退场;
  // 超过 HOME_BG_MAX_WAIT 也回调,防弱网/失败卡死在 loading。
  let homeBgWaitScheduled = false
  function whenHomeBgReady(cb) {
    if (homeBgReady || !isHomePage()) {
      cb()
      return
    }
    if (homeBgWaitScheduled) return
    homeBgWaitScheduled = true

    const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
    const src = HOME_BG[theme]
    const img = new Image()
    const done = () => {
      homeBgReady = true
      cb()
    }
    img.onload = done
    img.onerror = done
    img.src = src
    // 兜底:无论加载成败,最长等 HOME_BG_MAX_WAIT 后放行,避免弱网卡 loading
    window.setTimeout(done, HOME_BG_MAX_WAIT)
  }

  // 首页 hero 只加载当前主题那一张海报(方案 1)。CSS 用 --nova-hero-bg 变量,
  // 未选中主题的 URL 不出现在生效声明里,浏览器因此不会请求它(实测原先 ::after
  // 的 day.webp 会无条件加载 271KB)。切主题时才把另一张拉下来,拉完写进 ::after
  // 做交叉淡入,所以既省首屏也保住 .55s 过渡。
  function initHeroThemeSwap() {
    if (!isHomePage()) return

    const root = document.documentElement
    const heroBg = document.querySelector('.nova-hero-bg')
    if (!heroBg) return

    let raf = 0
    let lastMode = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'

    const onThemeChanged = () => {
      const mode = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
      if (mode === lastMode) return
      lastMode = mode

      const src = HOME_BG[mode]
      const img = new Image()
      img.onload = () => {
        // 基础层已由 CSS 变量换成新主题的海报,这里只补交叉淡入层。
        window.cancelAnimationFrame(raf)
        raf = window.requestAnimationFrame(() => {
          heroBg.style.setProperty('--nova-hero-bg-next', 'url("' + src + '")')
          // 过渡是 .55s;留足余量再撤,别让淡入层长期持一份解码后的位图。
          window.setTimeout(() => {
            heroBg.style.removeProperty('--nova-hero-bg-next')
          }, 900)
        })
      }
      img.src = src
    }

    new MutationObserver(onThemeChanged).observe(root, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
  }

  function finishInitialLoading() {
    // 首页首屏:退场须同时满足 ①背景图渲染完成 ②已展示 ≥ INITIAL_MIN_SHOW 最小时长,
    // 否则会"粒子先动、图片后到"或"loading 一闪而过"。非首页直接进入退场。
    if (isHomePage()) {
      const shownFor = Date.now() - (Number(window.__novaLoaderVisibleAt) || 0)
      const minNotMet = shownFor < INITIAL_MIN_SHOW
      if (!homeBgReady) {
        whenHomeBgReady(finishInitialLoading)
        return
      }
      if (minNotMet) {
        window.setTimeout(finishInitialLoading, INITIAL_MIN_SHOW - shownFor)
        return
      }
    }
    window.clearTimeout(window.__novaLoaderDelayTimer)
    window.__novaLoaderDelayTimer = 0
    const loader = document.querySelector('[data-nova-loading]')
    if (!loader) {
      document.body.classList.remove('nova-loading-active')
      return
    }
    if (loader.dataset.novaLoadingState === 'leaving') return

    if (!loader.classList.contains('is-visible')) {
      window.clearTimeout(initialFinishTimer)
      window.clearTimeout(initialFallbackTimer)
      window.clearTimeout(removeTimer)
      loader.remove()
      document.body.classList.remove('nova-loading-active')
      return
    }

    loader.dataset.novaLoadingState = 'leaving'
    loader.setAttribute('aria-hidden', 'true')
    loader.classList.add('is-leaving')
    loader.classList.remove('is-visible')
    window.clearTimeout(initialFinishTimer)
    window.clearTimeout(initialFallbackTimer)
    window.clearTimeout(removeTimer)
    removeTimer = window.setTimeout(() => {
      loader.remove()
      document.body.classList.remove('nova-loading-active')
    }, EXIT_DURATION)
  }

  function scheduleInitialFinish() {
    if (initialFinishScheduled) return
    initialFinishScheduled = true
    window.clearTimeout(window.__novaLoaderDelayTimer)
    window.__novaLoaderDelayTimer = 0
    const loader = document.querySelector('[data-nova-loading]')
    if (!loader?.classList.contains('is-visible')) {
      finishInitialLoading()
      return
    }
    const visibleAt = Number(window.__novaLoaderVisibleAt) || Date.now()
    const elapsed = Date.now() - visibleAt
    initialFinishTimer = window.setTimeout(
      finishInitialLoading,
      Math.max(0, INITIAL_MIN_DURATION - elapsed)
    )
  }

  function initInitialLoading() {
    // 只在"从网站首次进入"时显示 loading(本次会话第一次);
    // 之后站内 PJAX 回首页不再弹。用 sessionStorage 记录本次会话已显示。
    let alreadyShown = false
    try { alreadyShown = readStoredKey(LOADING_SHOWN_KEY, LOADING_SHOWN_KEY_LEGACY) === '1' } catch (_) {}
    if (alreadyShown) {
      // 非首次:清理可能残留的 loading,直接放行
      const stale = document.querySelector('[data-nova-loading]')
      if (stale) stale.remove()
      document.body.classList.remove('nova-loading-active')
      return
    }
    try { sessionStorage.setItem(LOADING_SHOWN_KEY, '1') } catch (_) {}

    const loader = getLoader()
    loader.classList.remove('is-leaving')
    if (loader.classList.contains('is-visible')) {
      loader.dataset.novaLoadingState = 'visible'
      loader.setAttribute('aria-hidden', 'false')
      document.body.classList.add('nova-loading-active')
    } else {
      loader.dataset.novaLoadingState = 'pending'
      loader.setAttribute('aria-hidden', 'true')
      document.body.classList.remove('nova-loading-active')
    }

    initialFallbackTimer = window.setTimeout(finishInitialLoading, INITIAL_MAX_DURATION)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scheduleInitialFinish, { once: true })
    } else {
      scheduleInitialFinish()
    }
  }

  function beginNavigation() {
    cleanupSearch()
    document.body.classList.remove(...ROUTE_CLASSES)
    // PJAX 切页: 显示全屏 loading, 避免新页 CSS 未就绪时裸渲染
    showNavLoading()
    // R1-B (2026-09-05, v20260831-p47): 切换期间冻结 CSS 过渡, 消除页面重挂首帧过渡伪影(玫瑰色蒙版)
    document.documentElement.classList.add('nova-no-transitions')
  }

  function finishNavigation() {
    // 等新页页级 CSS 全部就绪后再退场(超时 2s 兜底), 退场动画期间样式完成应用
    waitForPageStyles(2000).then(() => {
      requestAnimationFrame(() => finishInitialLoading())
      // R1-B: 新页就绪后短暂保持冻结, 再解锁恢复日常过渡动画
      window.setTimeout(() => document.documentElement.classList.remove('nova-no-transitions'), 250)
    })
  }

  // 等待当前 body-wrap 内页级样式加载完成(含已缓存: sheet 非空视为就绪)
  function waitForPageStyles(timeoutMs) {
    const links = Array.from(document.querySelectorAll('#body-wrap link[rel="stylesheet"]'))
    if (!links.length) return Promise.resolve()
    return new Promise(resolve => {
      let pending = links.length
      const done = () => { if (--pending <= 0) resolve() }
      const timer = window.setTimeout(resolve, timeoutMs || 2000)
      links.forEach(link => {
        if (link.sheet) done()
        else {
          link.addEventListener('load', done, { once: true })
          link.addEventListener('error', done, { once: true })
        }
      })
      // 超时直接放行(兜底, 不清计时器: resolve 幂等)
      void timer
    })
  }

  // 导航 loading: 复用首屏 loader(不写 sessionStorage, 不改变"首屏已显示"标记)
  function showNavLoading() {
    const loader = getLoader()
    if (!loader.classList.contains('is-visible')) {
      loader.classList.remove('is-leaving')
      loader.dataset.novaLoadingState = 'visible'
      loader.setAttribute('aria-hidden', 'false')
      document.body.classList.add('nova-loading-active')
      window.__novaLoaderVisibleAt = Date.now()
    }
  }

  function normalizePath(value) {
    const path = `/${value || ''}`.replace(/\/+/g, '/')
    return path.length > 1 ? path.replace(/\/$/, '') : path
  }

  function isHomePage() {
    if (
      document.body.classList.contains('nova-home-active') ||
      document.body.classList.contains('page-type-index') ||
      document.body.classList.contains('home')
    ) {
      return true
    }

    return normalizePath(location.pathname) === normalizePath(window.GLOBAL_CONFIG?.root || '/')
  }

  function syncHomeThemeToggle() {
    const button = document.getElementById('home-theme-toggle')
    if (!button) return

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    const label = isDark ? '切换到浅色模式' : '切换到深色模式'
    button.setAttribute('aria-label', label)
    button.setAttribute('title', label)
  }

  function createHomeThemeToggle() {
    const button = document.createElement('button')
    button.id = 'home-theme-toggle'
    button.className = 'sitename-rightside-button'
    button.type = 'button'
    button.innerHTML = `
      <span class="home-theme-toggle__icons" aria-hidden="true">
        <svg class="home-theme-toggle__icon home-theme-toggle__icon--moon" viewBox="0 0 24 24" focusable="false">
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"></path>
        </svg>
        <svg class="home-theme-toggle__icon home-theme-toggle__icon--sun" viewBox="0 0 24 24" focusable="false">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.41M17.66 6.34l1.41-1.41"></path>
        </svg>
      </span>`

    button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      document.getElementById('darkmode')?.click()
    })
    button.dataset.bound = 'true'
    return button
  }

  function initRightsideEnhancement() {
    const rightside = document.getElementById('rightside')
    const goUpButton = document.getElementById('go-up')
    if (!rightside || !goUpButton) return

    rightside
      .querySelectorAll('button[id], a[id]')
      .forEach(button => button.classList.add('sitename-rightside-button'))

    let homeThemeToggle = document.getElementById('home-theme-toggle')
    if (!homeThemeToggle) homeThemeToggle = createHomeThemeToggle()

    const visibleControls = goUpButton.parentElement
    if (homeThemeToggle.parentElement !== visibleControls || homeThemeToggle.nextElementSibling !== goUpButton) {
      visibleControls.insertBefore(homeThemeToggle, goUpButton)
    }

    rightside.classList.toggle('is-home-minimal', isHomePage())
    syncHomeThemeToggle()

    if (!window.__sitenameRightsideThemeObserver) {
      window.__sitenameRightsideThemeObserver = new MutationObserver(syncHomeThemeToggle)
      window.__sitenameRightsideThemeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      })
    }
  }

  function initStatsFallback() {
    window.clearTimeout(statsTimer)
    const targets = [
      document.getElementById('busuanzi_value_site_uv'),
      document.getElementById('busuanzi_value_site_pv'),
      document.getElementById('last-push-date')
    ].filter(Boolean)
    if (!targets.length) return

    statsTimer = window.setTimeout(() => {
      targets.forEach(target => {
        if (!target.isConnected || !target.querySelector('.fa-spinner')) return
        target.textContent = '—'
        target.title = '统计服务暂时不可用'
      })
    }, 9000)
  }

  function syncNavigationSemantics() {
    const desktopMenu = document.getElementById('menus')
    const desktopMenuItems = desktopMenu?.querySelector('.menus_items')
    const mobileMenu = document.getElementById('sidebar-menus')
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    const mobileMenuOpen = Boolean(isMobile && mobileMenu?.classList.contains('open'))

    if (desktopMenu) {
      desktopMenu.inert = false
      desktopMenu.removeAttribute('aria-hidden')
    }
    if (desktopMenuItems) {
      desktopMenuItems.inert = isMobile
      desktopMenuItems.setAttribute('aria-hidden', String(isMobile))
    }
    if (mobileMenu) {
      mobileMenu.inert = !mobileMenuOpen
      mobileMenu.setAttribute('aria-hidden', String(!mobileMenuOpen))
    }

    navigationObserver?.disconnect()
    if (mobileMenu) {
      navigationObserver = new MutationObserver(syncNavigationSemantics)
      navigationObserver.observe(mobileMenu, { attributes: true, attributeFilter: ['class'] })
    }
  }

  function syncRouteState() {
    document.body.classList.remove(...ROUTE_CLASSES)
    const routeMarkers = [
      ['[data-nova-home]', ['nova-home-active']],
      ['.nova-music-page', ['nova-music-route']],
      ['main.nova-tags-overview', ['nova-tag-route', 'nova-tags-route']],
      ['main.nova-projects-overview', ['nova-tag-route', 'nova-projects-route']],
      ['main.nova-tag-content:not(.nova-tags-overview)', ['nova-tag-route']],
      ['.nova-project-detail', ['nova-project-detail-route']],
      ['.nova-moments-page', ['nova-moments-route']],
      ['.nova-about-page', ['nova-about-route']],
    ]
    const match = routeMarkers.find(([selector]) => document.querySelector(selector))
    if (match) document.body.classList.add(...match[1])
  }

  function syncMenuActive() {
    const path = (location.pathname || '/').replace(/\/+$/, '') || '/'
    const isPost = /^\/\d{4}\/\d{2}\/\d{2}\//.test(path)

    const matches = (href) => {
      const h = (href || '').replace(/\/+$/, '') || '/'
      if (h === '/') return path === '/'
      if (h === '/articles') return path.startsWith('/articles') || isPost
      return path === h || path.startsWith(h + '/')
    }

    document.querySelectorAll(
      '#nav .menus_items .menus_item, #sidebar-menus .menus_items .menus_item'
    ).forEach(item => {
      const link = item.querySelector(':scope > a.site-page')
      item.classList.toggle('active', Boolean(link && matches(link.getAttribute('href'))))
    })
  }

  document.addEventListener('pjax:send', beginNavigation)
  document.addEventListener('pjax:complete', finishNavigation)
  document.addEventListener('pjax:error', finishNavigation)
  document.addEventListener('DOMContentLoaded', enhanceSearch, { once: true })
  document.addEventListener('DOMContentLoaded', initRightsideEnhancement, { once: true })
  document.addEventListener('DOMContentLoaded', initStatsFallback, { once: true })
  document.addEventListener('DOMContentLoaded', syncNavigationSemantics, { once: true })
  document.addEventListener('DOMContentLoaded', syncRouteState, { once: true })
  document.addEventListener('DOMContentLoaded', syncMenuActive, { once: true })
  document.addEventListener('pjax:complete', enhanceSearch)
  document.addEventListener('pjax:complete', initRightsideEnhancement)
  document.addEventListener('pjax:complete', initStatsFallback)
  document.addEventListener('pjax:complete', syncNavigationSemantics)
  document.addEventListener('pjax:complete', syncRouteState)
  document.addEventListener('pjax:complete', syncMenuActive)
  window.addEventListener('pageshow', finishInitialLoading)
  window.addEventListener('pageshow', scheduleInitialFinish, { once: true })
  window.addEventListener('resize', syncNavigationSemantics)

  /* 时间自动主题 (2026-08-16): 7:00-17:59 浅色, 18:00-6:59 深色。
     手动切换(任意页面 #darkmode)写入 localStorage 偏好:切页/刷新保持,
     到下一时间边界自动清除并拉回时间制(方案 2.B,2026-08-17)。
     定时器精确排到下一个边界,到点原地切换并复用现有过渡。
     2026-08-18:偏好增加时段归属(period),每次打开页面时校验:
     偏好时段与当前时段一致才生效,跨时段(如白天选的浅色,晚上打开)视为过期,
     拉回时间制。
     2026-08-18(改):打开页面不再读取任何持久偏好,只按当前时间决定主题;
     手动切换仅对当前会话生效(不写入 localStorage)。 */
  const THEME_DARK_START = 18
  const THEME_DARK_END = 7
  let themeScheduleTimer = 0

  const isDarkTime = () => {
    const hour = new Date().getHours()
    return hour >= THEME_DARK_START || hour < THEME_DARK_END
  }

  /* 会话级主题偏好(2026-08-18):手动切换写入 sessionStorage,
     会话内(含 PJAX 导航)全局生效;关闭浏览器/新标签自动清空,
     重新打开只按时间制,不读任何持久记忆。 */
  /* 存储键统一(阶段4 批次N · 4.5): 全站会话键统一为 nova- 前缀。
     本文件在 inject.bottom(无 defer), 会早于 inject.head 的 defer 脚本(含 lib/utils.js)
     执行, 故不能依赖 NOVA_UTILS —— 这里内联同款迁移辅助。函数声明会提升,
     因此上方(第 200 行附近的 __novaLoadingShown)使用处也能直接调用。
     语义: 新键优先; 只有旧键时把值迁到新键并删除旧键再返回 —— 不依赖执行顺序, 不丢数据。 */
  function readStoredKey(newKey, legacyKey) {
    try {
      const v = sessionStorage.getItem(newKey)
      if (v !== null) return v
      if (!legacyKey) return null
      const old = sessionStorage.getItem(legacyKey)
      if (old !== null) {
        try { sessionStorage.setItem(newKey, old); sessionStorage.removeItem(legacyKey) } catch (_) {}
        return old
      }
    } catch (_) {}
    return null
  }
  const THEME_SESSION_KEY = 'nova-theme-session'
  const LOADING_SHOWN_KEY = 'nova-loading-shown'
  const LOADING_SHOWN_KEY_LEGACY = '__novaLoadingShown'

  const getSessionTheme = () => {
    try {
      const value = readStoredKey(THEME_SESSION_KEY)
      return value === 'dark' || value === 'light' ? value : null
    } catch (e) {
      return null
    }
  }

  const setSessionTheme = mode => {
    try {
      if (mode === 'dark' || mode === 'light') {
        window.sessionStorage.setItem(THEME_SESSION_KEY, mode)
      } else {
        window.sessionStorage.removeItem(THEME_SESSION_KEY)
      }
    } catch (e) {
      /* storage unavailable: fall back to time-based only */
    }
  }

  /* 手动切换(任意页面 #darkmode,含首页 home-theme-toggle 转发):
     main.js 的处理器先执行切换(只改 data-theme 不持久化),
     这里在切换完成后把结果记入 sessionStorage,供会话内全局保持。
     setTimeout 延后读取,确保读到 main.js 切换后的最终值。 */
  document.addEventListener(
    'click',
    event => {
      const target = event.target
      const button = target && target.closest ? target.closest('#darkmode') : null
      if (!button) return
      setTimeout(() => {
        setSessionTheme(document.documentElement.getAttribute('data-theme'))
      }, 0)
    },
    true
  )

  const fireThemeChange = mode => {
    const globalFn = window.globalFn || {}
    const themeChange = globalFn.themeChange
    if (!themeChange) return
    Object.keys(themeChange).forEach(key => {
      const fn = themeChange[key]
      if (typeof fn === 'function') fn(mode)
    })
  }

  /* 主题:会话内有手动选择则保持(导航不拉回);无则只按时间制。
     URL ?theme=dark|light 可强制(预览/截图用, 不持久化, 关标签即失效)。 */
  const urlTheme = () => {
    try {
      const v = new URLSearchParams(location.search).get('theme')
      return v === 'dark' || v === 'light' ? v : null
    } catch (e) {
      return null
    }
  }
  const applyTimeTheme = () => {
    const override = urlTheme()
    const session = getSessionTheme()
    const target = override || (session === 'dark' || session === 'light' ? session : isDarkTime() ? 'dark' : 'light')
    const current = document.documentElement.getAttribute('data-theme')
    if (current !== target) {
      target === 'dark' ? btf.activateDarkMode() : btf.activateLightMode()
      fireThemeChange(target)
    }
  }

  const nextBoundaryDelay = () => {
    const now = new Date()
    const hour = now.getHours()
    const next = new Date(now)
    if (hour < THEME_DARK_END) {
      next.setHours(THEME_DARK_END, 0, 0, 0)
    } else if (hour < THEME_DARK_START) {
      next.setHours(THEME_DARK_START, 0, 0, 0)
    } else {
      next.setDate(next.getDate() + 1)
      next.setHours(THEME_DARK_END, 0, 0, 0)
    }
    return next.getTime() - now.getTime()
  }

  /* 边界到点:清除会话偏好,按时间制切换。 */
  const scheduleThemeTick = () => {
    window.clearTimeout(themeScheduleTimer)
    themeScheduleTimer = window.setTimeout(() => {
      setSessionTheme(null)
      applyTimeTheme()
      scheduleThemeTick()
    }, nextBoundaryDelay())
  }

  const initThemeSchedule = () => {
    applyTimeTheme()
    scheduleThemeTick()
  }

  // 方案3:首页加载时,用浏览器原生 <link rel="prefetch"> 预取导航的其他页 HTML。
  // 只预取一级导航页(文章/音乐/说说/关于),不预取子页;浏览器空闲时进行,不阻塞首屏。
  // 预取列表运行时从导航菜单 DOM 收集(B4 单源: 菜单改这里自动跟随)
  function collectNavLinks() {
    const links = document.querySelectorAll(
      '#menus .menus_item a[href^="/"], #sidebar-menus .menus_item a[href^="/"]'
    )
    return Array.from(links)
      .map(a => a.getAttribute('href'))
      .filter(h => h && h !== '/')
  }
  function prefetchNavPages() {
    if (!isHomePage()) return
    const NAV_PREFETCH = collectNavLinks()
    const run = () => {
      if (document.hidden) return
      NAV_PREFETCH.forEach(href => {
        if (href === location.pathname) return
        if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = href
        link.as = 'document'
        document.head.appendChild(link)
      })
    }
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(run, { timeout: 3000 })
    } else {
      window.setTimeout(run, 800)
    }
  }
  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) applyTimeTheme()
  })
  document.addEventListener('pjax:complete', applyTimeTheme)

  initInitialLoading()
  initThemeSchedule()
  initHeroThemeSwap()
  prefetchNavPages()
  if (document.readyState !== 'loading') {
    enhanceSearch()
    initRightsideEnhancement()
    initStatsFallback()
    syncNavigationSemantics()
    syncRouteState()
  }
})()
