(() => {
  'use strict'

  /* 说说页「评论即说说」(2026-09-03 方案 A):
     站长(Waline user_id=1, 自建后端)在留言区发布的内容自动渲染为「说说」卡片:
     - 正文支持格式标签: 另起一行 "心情:/地点:/人物:/天气:" 自动转为卡片标签(顺序随意)
     - 左下角心形供浏览者点赞(本地), 管理员点心形 → 收录到「最近状态」
     - 访客留言仅保留在评论区, 不进说说流 */

  const SERVER = 'https://yibao11-github-io.vercel.app'
  const OWNER_USER_ID = 1
  const OWNER_NICK = 'Yibao'
  const MOOD_KEY = 'nova-moments-mood-v2'
  const MOOD_KEY_V1 = 'nova-moments-mood'
  const META_KEYS = ['心情', '地点', '人物', '天气']
  /* 可见条目数: 左侧说说流展示 3 条, 右侧最近状态展示 7 条, 其余滚动(2026-09-04) */
  const STREAM_VISIBLE = 3
  const MOOD_VISIBLE = 7

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const fmtDate = ms => {
    const d = new Date(Number(ms))
    if (isNaN(d.getTime())) return ''
    const p = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
  }

  const fmtTime = ms => {
    const d = new Date(Number(ms))
    if (isNaN(d.getTime())) return ''
    const p = n => String(n).padStart(2, '0')
    return `${p(d.getHours())}:${p(d.getMinutes())}`
  }

  /* 站长判定(三重判据, 任一命中即站长): 后端 user_id=1 / 昵称 Yibao / 官方管理员标记 */
  const isOwner = c =>
    Number(c.user_id) === OWNER_USER_ID ||
    String(c.nick || '').trim() === OWNER_NICK ||
    String(c.type || '').trim() === 'administrator'

  /* 从 HTML 评论中拆出正文与元数据行(行级识别: 单段换行/段落均适用, meta 行剥离, 正文不隐藏) */
  function parseComment(html) {
    const doc = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html')
    const metas = {}
    const parts = []
    for (const n of doc.body.childNodes) {
      if (n.nodeType === 1 && /<img/i.test(n.outerHTML)) {
        // 含图块(表情): 整块作为正文保留(内容含 emoji 时不做行级剥离)
        parts.push(n.outerHTML)
        continue
      }
      const text = (n.textContent || '').trim()
      if (!text) continue
      const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean)
      for (const line of lines) {
        const m = line.match(/^(心情|地点|人物|天气)[:：]\s*(.*)$/)
        if (m) {
          const v = (m[2] || '').trim()
          if (v) metas[m[1]] = v
        } else {
          parts.push(esc(line)) // 文本行转义后再拼入, 防止用户输入被当作 HTML 标签解释
        }
      }
    }
    const body = parts.map(p => p.startsWith('<') ? p : '<p>' + p + '</p>').join('')
    return { body, metas }
  }

  function buildCard(c, i) {
    const { body, metas } = parseComment(c.comment)
    const tags = META_KEYS.filter(k => metas[k])
      .map(k => '<span>' + esc(k + ' · ' + metas[k]) + '</span>').join('')
    const card = document.createElement('article')
    card.className = 'nova-moments-card' + (i === 0 ? ' is-latest' : '')
    card.innerHTML =
      '<i class="nova-moments-node" aria-hidden="true"></i>' +
      '<header class="nova-moments-card-head"><time><b>' + esc(fmtDate(c.time)) + '</b><span class="nova-moments-time">' + esc(fmtTime(c.time)) + '</span></time>' +
      (i === 0 ? '<span class="nova-moments-latest-mark">LATEST</span>' : '') +
      '</header>' +
      '<div class="nova-moments-card-body">' + (body || '') + '</div>' +
      (tags ? '<div class="nova-moments-card-tags">' + tags + '</div>' : '') +
      '<button class="nova-moments-like" type="button" data-base-count="0" data-storage-key="nova-moment-like-' + esc(c.objectId) + '">' +
      '<span>♡</span><b>0</b></button>'
    return card
  }

  /* 最近状态收藏列表(v2 多条目): 点心形按点击顺序收录, 每条 = 日期 + 正文 */
  function moodEl() { return document.querySelector('.nova-moments-mood') }

  function readMoods() {
    try {
      const arr = JSON.parse(localStorage.getItem(MOOD_KEY))
      return Array.isArray(arr) ? arr : []
    } catch (_) { return [] }
  }

  function writeMoods(list) {
    try { localStorage.setItem(MOOD_KEY, JSON.stringify(list)) } catch (_) {}
  }

  function addMood(text, date, id) {
    if (!text || !id) return
    const list = readMoods().filter(m => m.id !== id)
    list.unshift({ id, text, date }) // 最新点击的置顶: 后点击的在上面
    writeMoods(list)
    renderMoods()
  }

  function removeMood(id) {
    if (!id) return
    writeMoods(readMoods().filter(m => m.id !== id))
    renderMoods()
  }

  /* 滚动区高度 = 前 N 条的实际高度(阶段4 批次N · 4.4 合并同构实现):
     原先 fitMoodList 与 fitStreamScroll 是同一套逻辑的两份拷贝(只有选择器/阈值/下限不同),
     改一处必须记得同步另一处。现统一为: 清空 maxHeight → 量第 N 条的 bottom 与容器 top
     之差 → 取与下限的较大值。两个调用点的行为与原先逐字等价。 */
  function fitByNthItem(containerSel, itemSel, visibleCount, minHeight) {
    const box = document.querySelector(containerSel)
    if (!box) return
    box.style.maxHeight = ''
    const items = box.querySelectorAll(itemSel)
    if (items.length <= visibleCount) return
    const base = box.getBoundingClientRect()
    const nth = items[visibleCount - 1].getBoundingClientRect()
    box.style.maxHeight = Math.max(nth.bottom - base.top, minHeight) + 'px'
  }

  /* 最近状态只展示 MOOD_VISIBLE 条, 更多滚动查看 */
  function fitMoodList() {
    fitByNthItem('.nova-moments-mood-list', '.nova-moments-mood-item', MOOD_VISIBLE, 80)
  }

  function renderMoods() {
    const el = moodEl()
    if (!el) return
    // 兜底: 保证 CURRENT MOOD kicker / 标题始终存在(2026-09-04)
    if (!el.querySelector('.nova-moments-side-kicker')) {
      const k = document.createElement('p')
      k.className = 'nova-moments-side-kicker'
      k.textContent = 'CURRENT MOOD'
      const h = document.createElement('h2')
      h.textContent = '最近状态'
      el.insertBefore(k, el.firstChild)
      el.insertBefore(h, k.nextSibling)
    }
    let list = el.querySelector('.nova-moments-mood-list')
    if (!list) {
      list = document.createElement('div')
      list.className = 'nova-moments-mood-list'
      el.appendChild(list)
    }
    const moods = readMoods()
    list.innerHTML = ''
    if (!moods.length) {
      list.innerHTML = '<div class="nova-moments-mood-item"><time>—</time><strong>待选入...</strong></div>'
      fitMoodList()
      return
    }
    for (const m of moods) {
      const item = document.createElement('div')
      item.className = 'nova-moments-mood-item'
      const t = document.createElement('time')
      t.textContent = m.date || '—'
      const s = document.createElement('strong')
      s.textContent = m.text || ''
      item.append(t, s)
      list.appendChild(item)
    }
    fitMoodList()
  }

  function onLikeToggle(button, liked) {
    const card = button.closest('.nova-moments-card')
    if (!card) return
    const body = card.querySelector('.nova-moments-card-body')
    const time = card.querySelector('.nova-moments-card-head time b')
    const key = button.getAttribute('data-storage-key') || ''
    const id = key.replace('nova-moment-like-', '') || 'anon-' + Math.random().toString(36).slice(2, 9)
    if (liked) {
      addMood((body ? body.textContent.trim() : ''), time ? time.textContent : '', id)
    } else {
      removeMood(id)
    }
  }

  /* 收藏与说说流数据校准: 仅保留仍存在于服务端的说说(objectId 匹配);
     服务端无数据时不清理, 避免网络异常导致收藏丢失 */
  function pruneMoods(comments) {
    if (!comments || !comments.length) return
    const ids = new Set(comments.map(c => String(c.objectId)))
    const list = readMoods()
    const kept = list.filter(m => ids.has(String(m.id)))
    if (kept.length !== list.length) {
      writeMoods(kept)
      renderMoods()
    }
  }

  /* 说说流: 只展示前 STREAM_VISIBLE 条卡片, 更多条目在区域内滚动查看(隐藏滚动条) */
  function fitStreamScroll() {
    fitByNthItem('.nova-moments-scroll', '.nova-moments-card', STREAM_VISIBLE, 140)
  }

  function render(items) {
    const stream = document.querySelector('.nova-moments-stream')
    if (!stream) return
    const cont = stream.querySelector('.nova-moments-continuation')
    stream.querySelectorAll('.nova-moments-card').forEach(el => el.remove())
    stream.querySelectorAll('.nova-moments-month-head').forEach(el => el.remove())

    // 卡片滚动容器(常驻): 月头与「TO BE CONTINUED」固定在容器外
    let scroll = stream.querySelector('.nova-moments-scroll')
    if (!scroll) {
      scroll = document.createElement('div')
      scroll.className = 'nova-moments-scroll'
      stream.insertBefore(scroll, cont)
    }

    if (items.length) {
      // 摘录顶部(参考站结构): 年(小字玫瑰) + 月(大字宋体) + 条数(右对齐灰色小字)
      const d = new Date(Number(items[0].time))
      const head = document.createElement('div')
      head.className = 'nova-moments-month-head'
      head.innerHTML =
        '<span>' + esc(String(d.getFullYear())) + '</span>' +
        '<h2>' + esc(String(d.getMonth() + 1).padStart(2, '0')) + ' 月</h2>' +
        '<small>' + items.length + ' MOMENTS</small>'
      stream.insertBefore(head, scroll)
    }

    items.forEach((c, i) => scroll.appendChild(buildCard(c, i)))
    fitStreamScroll()

    const overview = document.querySelector('.nova-moments-overview')
    if (overview && items.length) {
      const cells = overview.querySelectorAll('div')
      if (cells[0]) { const b = cells[0].querySelector('b'); if (b) b.textContent = String(items.length) }
      if (cells[1]) { const b = cells[1].querySelector('b'); if (b) b.textContent = fmtDate(items[0].time) }
    }

    // 绑定点赞(复用 moments-page.js 的绑定, 支持动态卡片)
    const boot = window.__novaMomentsBoot
    if (boot && boot.bindLikeButtons) boot.bindLikeButtons(stream)

    // 收藏校准: 已被管理员删除(不在说说流)的收藏条目不再显示
    pruneMoods(items)
  }

  /* 管理员说说 objectId 集合(loadFeed 成功后填充); 评论区隐藏优先按 id 精确匹配 */
  let ownerIds = new Set()

  /* 隐藏扫描: id 精确匹配 + 昵称兜底, 整条 .wl-card-item(含头像) */
  function applyCommentHiding() {
    const root = document.querySelector('#waline-wrap')
    if (!root) return
    root.querySelectorAll('.wl-card-item').forEach(el => {
      if (ownerIds.has(String(el.id))) {
        el.style.display = 'none'
        return
      }
      const nick = el.querySelector('.wl-nick')
      if (nick && nick.textContent.trim() === OWNER_NICK) el.style.display = 'none'
    })
  }

  /* 评论区隐藏管理员评论(一次性, 2026-09-04):
     页面加载后等待 Waline 初次渲染完成, 扫描隐藏已存在的管理员评论(含头像);
     随后停止扫描 —— 本次会话内新发布的评论保持可见(可对其执行管理操作如删除),
     刷新页面后再次加载即被隐藏 */
  function hideOwnerWalineComments() {
    const root = document.querySelector('#waline-wrap')
    if (!root) return
    let tries = 0
    const interval = setInterval(() => {
      tries++
      applyCommentHiding()
      // 评论列表已渲染: 隐藏本轮后停止扫描; 上限 10 次(8s)兜底防泄漏
      if (tries >= 10 || root.querySelectorAll('.wl-card-item').length) clearInterval(interval)
    }, 800)
    applyCommentHiding()
  }

  /* 分页拉取全部评论(后端 totalPages 语义可靠; 上限 20 页防异常死循环) */
  async function fetchAllComments() {
    const out = []
    for (let page = 1; page <= 20; page++) {
      const resp = await fetch(SERVER + '/api/comment?path=' + encodeURIComponent('/moments/') + '&page=' + page + '&pageSize=100')
      if (!resp.ok) break
      const json = await resp.json()
      const d = (json && json.data) || {}
      const list = d.data || []
      out.push(...list)
      if (!d.totalPages || page >= Number(d.totalPages)) break
    }
    return out
  }

  async function loadFeed() {
    if (!document.querySelector('.nova-moments-stream')) return
    try {
      const comments = await fetchAllComments()
      const owners = comments.filter(isOwner).sort((a, b) => Number(b.time) - Number(a.time))
      ownerIds = new Set(owners.map(c => String(c.objectId)))
      render(owners)
      hideOwnerWalineComments() // id 集合就绪后立即重扫评论区(评论早于说说渲染时仅靠昵称兜底)
    } catch (e) {
      console.warn('[moments-feed] load failed', e)
    }
  }

  /* v1 单条数据 → v2 列表首条(无关联 id, 取消该说说点赞不再自动移除, 可手动清空) */
  function migrateMood() {
    try {
      if (localStorage.getItem(MOOD_KEY)) return
      const raw = localStorage.getItem(MOOD_KEY_V1)
      if (!raw) return
      const m = JSON.parse(raw)
      if (m && m.text) writeMoods([{ id: 'legacy-1', text: m.text, date: m.date || '' }])
    } catch (_) {}
  }

  function init() {
    const page = document.querySelector('.nova-moments-page')
    /* 幂等标记必须独立: moments-page.js(只管点赞按钮绑定)在同一元素上抢先设置了 data-ready,
       若这里也读同一个键, 则本脚本的 init 永远判定"已初始化"而直接 return —— 说说流一次都不拉取
       (2026-09-12 实测: 卡片恒为 0 张、pageSize=100 请求从未发出)。故改用专属键 data-feed-ready。 */
    if (!page || page.dataset.feedReady === 'true') return
    page.dataset.feedReady = 'true'
    migrateMood()
    renderMoods() // 恢复收藏列表(含空态「待选入...」)
    loadFeed()
    hideOwnerWalineComments() // 评论区渲染变化时隐藏管理员评论(仅隐藏, 不重拉说说流)
  }

  /* 幂等引导(P0 修复 2026-09-11, 照 moments-page.js 模式):
     本脚本带 data-pjax, PJAX 导航会重新执行整个 IIFE。若无条件 addEventListener,
     监听器会随"进出说说页"的次数线性累积; 而 init 原无幂等标记, 于是 pjax:complete
     一次触发会并发调用多次 loadFeed → fetchAllComments(每次最多 20 页 × 100 条 HTTP),
     请求成倍放大。故:
       - 监听注册只在首次执行时进行一次;
       - 后续重执行仅调用一次 init, 由 init 内的 dataset.ready 标记保证幂等;
       - resize 监同一并移入守卫(原先每次重执行都会新增一个)。 */
  if (window.__novaMomentsFeedBoot) {
    window.__novaMomentsFeedBoot.init()
  } else {
    // 导出: onLikeToggle 供点赞联动; addMood/removeMood/renderMoods 为 DevTools 自测/调试入口
    window.__novaMomentsFeed = { onLikeToggle, addMood, removeMood, renderMoods }
    window.__novaMomentsFeedBoot = { init }
    // 视口变化时重算滚动区高度(条目宽度变化 → 高度变化)
    window.addEventListener('resize', () => { fitMoodList(); fitStreamScroll() })
    document.addEventListener('DOMContentLoaded', init, { once: true })
    document.addEventListener('pjax:complete', init)
    if (document.readyState !== 'loading') init()
  }
})()
