(() => {
  'use strict'

  if (window.__novaHomeBoot) {
    window.__novaHomeBoot.init()
    return
  }

  let reveal = null
  const timers = new Set()

  const later = (callback, delay) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer)
      callback()
    }, delay)
    timers.add(timer)
    return timer
  }

  const destroy = () => {
    reveal?.disconnect()
    reveal = null
    timers.forEach(timer => window.clearTimeout(timer))
    timers.clear()
  }

  const init = () => {
  const root = document.querySelector('[data-nova-home]')
  if (!root || root.dataset.ready) return
  destroy()
  root.dataset.ready = 'true'

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

  const englishSubtitle = root.querySelector('.nova-en-subtitle[data-typewriter-text]')
  const fullEnglishSubtitle = englishSubtitle?.dataset.typewriterText?.trim() || ''
  if (englishSubtitle && fullEnglishSubtitle) {
    englishSubtitle.setAttribute('aria-label', fullEnglishSubtitle)
    if (reduceMotion) {
      englishSubtitle.textContent = fullEnglishSubtitle
      englishSubtitle.classList.add('is-complete')
    } else {
      const characters = Array.from(fullEnglishSubtitle)
      let characterIndex = 0
      englishSubtitle.textContent = ''
      englishSubtitle.classList.add('is-typing')

      const typeNextCharacter = () => {
        characterIndex += 1
        englishSubtitle.textContent = characters.slice(0, characterIndex).join('')
        if (characterIndex < characters.length) {
          const current = characters[characterIndex - 1]
          const pause = current === ',' ? 145 : (current === '.' ? 220 : 48 + Math.random() * 42)
          later(typeNextCharacter, pause)
          return
        }
        englishSubtitle.classList.remove('is-typing')
        englishSubtitle.classList.add('is-complete')
      }

      later(typeNextCharacter, 1050)
    }
  }

  reveal = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting && entry.target.classList.add('is-visible'))
  }, { threshold: .12 })
  root.querySelectorAll('.nova-reveal').forEach(node => reveal.observe(node))

  root.querySelectorAll('.nova-note-card[data-href]').forEach(card => {
    const navigate = () => { location.href = card.dataset.href }
    card.addEventListener('click', event => {
      if (!event.target.closest('a')) navigate()
    })
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        navigate()
      }
    })
  })

  // Rose-bloom petal effect removed on purpose (site customization: 2026-08-15).
  // Previously: clicking .nova-bloom-trigger or .nova-letter-o spawned 14
  // drifting .nova-petal elements plus the "Some things bloom quietly." message.
  // The HTML trigger/message elements remain but are inert without this code.

  const subtitle = root.querySelector('.nova-cn-subtitle')
  const hour = new Date().getHours()
  if (subtitle && hour < 5) subtitle.textContent = '还没有睡的人，也许都在构建些什么。'
  }

  window.__novaHomeBoot = { init, destroy }
  document.addEventListener('pjax:send', destroy)
  document.addEventListener('pjax:complete', init)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
})()
