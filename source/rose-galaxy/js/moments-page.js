(() => {
  'use strict'

  if (window.__novaMomentsBoot) {
    window.__novaMomentsBoot.init()
    return
  }

  function bindLikeButtons(scope) {
    (scope || document).querySelectorAll('.nova-moments-like').forEach(button => {
      if (button.dataset.bound === 'true') return
      button.dataset.bound = 'true'
      const count = button.querySelector('b')
      const icon = button.querySelector('span')
      const baseCount = Number(button.dataset.baseCount || 0)
      const storageKey = button.dataset.storageKey
      const applyState = liked => {
        button.classList.toggle('is-liked', liked)
        button.setAttribute('aria-pressed', String(liked))
        count.textContent = String(baseCount + (liked ? 1 : 0))
        icon.textContent = liked ? '♥' : '♡'
      }

      let liked = false
      try {
        liked = localStorage.getItem(storageKey) === 'true'
      } catch (_) {
        liked = false
      }
      applyState(liked)

      button.addEventListener('click', () => {
        liked = !liked
        try {
          localStorage.setItem(storageKey, String(liked))
        } catch (_) {
          // Visual feedback remains available when storage is blocked.
        }
        applyState(liked)
        // 管理员点击联动: 收录到「最近状态」; 取消则复位
        const feed = window.__novaMomentsFeed
        if (feed && feed.onLikeToggle) feed.onLikeToggle(button, liked)
      })
    })
  }

  function initialiseMomentsPage() {
    const page = document.querySelector('.nova-moments-page')
    if (!page || page.dataset.ready === 'true') return
    page.dataset.ready = 'true'
    bindLikeButtons(page)
  }

  window.__novaMomentsBoot = { init: initialiseMomentsPage, bindLikeButtons }
  document.addEventListener('DOMContentLoaded', initialiseMomentsPage, { once: true })
  document.addEventListener('pjax:complete', initialiseMomentsPage)
  if (document.readyState !== 'loading') initialiseMomentsPage()
})()
