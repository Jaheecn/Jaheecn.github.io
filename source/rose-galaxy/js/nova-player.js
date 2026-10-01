/* =============================================================
   Nova Global Player (2026-08-27)
   - 全局单例 Audio: 跨 PJAX 页面常驻, 离开音乐页不停止
   - 歌单缓存(内存 + sessionStorage): 恢复最后歌曲, 不恢复进度, 不自动出声
     (会话级: 刷新/站内跳转记忆有效, 关闭标签页后不再恢复)
   - 迷你悬浮条(非音乐页): 歌名/进度/三键(上一首/暂停/下一首), 可拖动, 可关闭
   - 音乐页 UI 通过 window.__novaPlayerBridge 订阅事件
   - 需要页面: 全站 inject.bottom
   ============================================================= */
(function () {
  "use strict";

  if (window.__novaPlayer) return;

  // 站点配置单一来源(P1·R5): lib/site-config.js
  // 2026-10-01: 音频来源由 B 站云函数换为网易云(歌单端点给元信息, /api/song 给直链)
  const MUSIC_PROXY = window.NOVA_SITE.music.proxy;
  const STORAGE_KEY = "nova-player-state";
  // 音乐页悬浮窗开关(会话级, 默认关闭): 开启后迷你条在音乐页/其他页都显示
  const MINI_ENABLED_KEY = "nova-mini-enabled";

  // 跨 PJAX 脚本重跑持久: audio/进度/歌单放全局 core(pjax 同文档切换保留)
  const state = (window.__novaPlayerCore || (window.__novaPlayerCore = {
    audio: null,
    songs: [],
    currentIndex: -1,
    loadAbort: null,
    loading: false,
    loadedSongId: null, // 当前 audio 已加载的歌曲 ID(判断无需重拉流)
  }));

  // ---- sessionStorage 记忆(会话级): { songIndex, songs } (songs 仅元信息, 含 id/name/artist/cover) ----
  function loadMemory() {
    try {
      const raw = window.NOVA_UTILS.readStoredKey(STORAGE_KEY, "novaPlayerState", sessionStorage);
      if (!raw) return null;
      const j = JSON.parse(raw);
      if (!Number.isInteger(j.songIndex) || j.songIndex < 0) return null;
      return j;
    } catch (_) {
      return null;
    }
  }

  function saveMemory(played) {
    try {
      const prev = loadMemory() || {};
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        songIndex: state.currentIndex,
        played: played === true ? true : Boolean(prev.played), // 仅显式 true 才标记真正播放过
        songs: state.songs.map(s => ({
          id: s.id,
          name: s?.name || s?.title || "",
          artist: s?.artist || s?.author || "",
          cover: window.NOVA_UTILS.coverOf(s),
        })),
      }));
    } catch (_) {}
  }

  // ---- 音频直链(2026-10-01 网易云改造) ----
  // 旧实现走云函数 /stream2 把整首歌 base64 传回来再解码成 blob: 一首 4 MB 必须先下完
  // 才能出声, 且顶着 SCF 网关的体积上限。改为向云函数要网易云 CDN 的 https 直链,
  // 直接赋给 audio.src —— 浏览器原生渐进播放 + 原生 Range 拖动, 云函数不再转发字节。
  // (实测网易云 CDN 不校验 Referer, 任意来源均可 206 播放)
  async function fetchAudioUrl(songId, signal) {
    const resp = await fetch(MUSIC_PROXY + "/api/song?id=" + encodeURIComponent(songId), { signal });
    if (!resp.ok) throw new Error("音频地址请求失败 HTTP " + resp.status);
    const j = await resp.json();
    if (!j || !j.url) throw new Error((j && j.reason) || "该歌曲暂无可播放的直链");
    return j.url;
  }

  function setAudioSource(url) {
    const audio = ensureAudio();
    const old = audio.src;
    audio.src = url;
    /* 兼容旧路径: 若上一次是 blob: URL 则释放; http(s) 直链无需释放 */
    if (old && old.startsWith("blob:")) URL.revokeObjectURL(old);
  }

  function ensureAudio() {
    if (state.audio) return state.audio;
    const audio = new Audio();
    audio.preload = "metadata";
    audio.addEventListener("play", () => {
      // 真正开始播放: 标记 played
      saveMemory(true);
      emit("play");
    });
    audio.addEventListener("pause", () => emit("pause"));
    audio.addEventListener("timeupdate", () => emit("timeupdate"));
    audio.addEventListener("durationchange", () => emit("durationchange"));
    audio.addEventListener("loadedmetadata", () => emit("loadedmetadata"));
    audio.addEventListener("ended", () => {
      state.currentIndex = (state.currentIndex + 1) % state.songs.length;
      saveMemory();
      playSongAt(state.currentIndex, true);
    });
    audio.addEventListener("error", () => emit("error"));
    state.audio = audio;
    return audio;
  }

  // ---- 订阅: 音乐页 UI 与悬浮条共用 ----
  const listeners = new Set();
  function emit(type, payload) {
    listeners.forEach(fn => {
      try {
        fn(type, payload || currentSnapshot());
      } catch (e) {
        /* P1 修复(2026-09-11): 原先 catch (_) {} 完全吞掉订阅者异常 ——
           模板缺某个 class 时 UI 会永久不更新, 控制台却没有任何线索。 */
        console.warn('[nova-player] subscriber failed on "' + type + '"', e);
      }
    });
  }
  function currentSnapshot() {
    return {
      songs: state.songs,
      currentIndex: state.currentIndex,
      playing: Boolean(state.audio && !state.audio.paused),
      loading: state.loading,
      currentTime: state.audio ? state.audio.currentTime : 0,
      duration: state.audio ? state.audio.duration : 0,
      song: state.songs[state.currentIndex] || null,
      loadedSongId: state.loadedSongId,
      hasMemory: Boolean(loadMemory()),
    };
  }

  // ---- 歌单 ----
  function setPlaylist(songs) {
    if (!Array.isArray(songs) || !songs.length) return;
    state.songs = songs;
    if (state.currentIndex < 0 || state.currentIndex >= songs.length) {
      const mem = loadMemory();
      state.currentIndex = mem ? Math.min(mem.songIndex, songs.length - 1) : 0;
    }
    saveMemory(false); // 歌单持久化(未播放, 不触发悬浮条)
    emit("playlist");
  }

  // ---- 控制 ----
  async function playSongAt(index, autoplay) {
    if (!state.songs.length) return;
    state.loadAbort?.abort();
    const ac = new AbortController();
    state.loadAbort = ac;
    state.currentIndex = window.NOVA_UTILS.normalizeIndex(index, state.songs.length);
    state.loading = true;
    emit("loadstart");
    const song = state.songs[state.currentIndex];
    try {
      const url = await fetchAudioUrl(song.id, ac.signal);
      if (ac.signal.aborted) return;
      setAudioSource(url);
      state.loadedSongId = String(song.id || "");
      saveMemory();
      if (autoplay !== false) {
        const result = state.audio.play();
        if (result?.catch) result.catch(() => emit("play-blocked"));
      }
    } catch (e) {
      if (ac.signal.aborted) return;
      emit("load-error", { message: window.NOVA_UTILS.errText(e) });
    } finally {
      if (state.loadAbort === ac) {
        state.loadAbort = null;
        state.loading = false;
        emit("loadend");
      }
    }
  }

  function togglePlayback() {
    if (state.loading) return;
    const audio = ensureAudio();
    // 首次点击(刷新后 audio 无 src): 先加载当前记忆歌曲再播
    if (!audio.src) {
      playSongAt(state.currentIndex, true);
      return;
    }
    if (audio.paused) {
      const result = audio.play();
      if (result?.catch) result.catch(() => emit("play-blocked"));
    } else {
      audio.pause();
    }
  }

  function playNext() { playSongAt(state.currentIndex + 1, true); }
  function playPrevious() { playSongAt(state.currentIndex - 1, true); }

  function seekTo(percent) {
    const duration = Number.isFinite(state.audio?.duration) ? state.audio.duration : 0;
    if (!duration) return;
    state.audio.currentTime = Math.max(0, Math.min(1, percent)) * duration;
  }

  // =============================================================
  // 迷你悬浮条 (非音乐页常驻)
  // =============================================================
  let miniRoot = null;

  function buildMiniBar() {
    if (miniRoot) return miniRoot;
    const root = document.createElement("div");
    miniRoot = root;
    root.className = "nova-mini-player";
    root.innerHTML =
      '<div class="nova-mini-cover-wrap"><img class="nova-mini-cover" alt=""></div>' +
      '<div class="nova-mini-main">' +
      '  <div class="nova-mini-meta"><strong class="nova-mini-title">暂无播放</strong></div>' +
      '  <div class="nova-mini-progress"><i class="nova-mini-progress-bar"></i></div>' +
      '  <div class="nova-mini-times"><span class="nova-mini-time">00:00</span><span class="nova-mini-duration">00:00</span></div>' +
      '</div>' +
      '<div class="nova-mini-controls">' +
      '  <button class="nova-mini-btn nova-mini-prev" type="button" aria-label="上一首"><i class="fas fa-step-backward"></i></button>' +
      '  <button class="nova-mini-btn nova-mini-toggle" type="button" aria-label="播放"><i class="fas fa-play"></i></button>' +
      '  <button class="nova-mini-btn nova-mini-next" type="button" aria-label="下一首"><i class="fas fa-step-forward"></i></button>' +
      '</div>' +
      '<button class="nova-mini-close" type="button" aria-label="关闭播放器"><i class="fas fa-times"></i></button>' +
      '<div class="nova-mini-drag-handle" aria-hidden="true"></div>';
    document.body.appendChild(root);

    root.querySelector(".nova-mini-prev").addEventListener("click", playPrevious);
    root.querySelector(".nova-mini-next").addEventListener("click", playNext);
    root.querySelector(".nova-mini-toggle").addEventListener("click", togglePlayback);
    root.querySelector(".nova-mini-close").addEventListener("click", () => {
      state.audio?.pause();
      // 关闭 = 关闭开关本身: 音乐页按钮与全局状态同步, 不会在别处"复活"
      setMiniEnabled(false);
      emit("mini-closed");
    });
    enableDrag(root);
    // 点击进度条: seek
    root.querySelector(".nova-mini-progress").addEventListener("click", e => {
      const r = e.currentTarget.getBoundingClientRect();
      seekTo((e.clientX - r.left) / r.width);
    });
    return root;
  }

  function enableDrag(root) {
    let startX = 0, startY = 0, startLeft = 0, startTop = 0, moved = false;
    // 仅手柄可拖动, 避免误触(封面/文字区点击不影响, 进度条区域保持原生交互)
    const handle = root.querySelector(".nova-mini-drag-handle");
    if (!handle) return;
    handle.addEventListener("pointerdown", e => {
      e.preventDefault();
      moved = false;
      startX = e.clientX; startY = e.clientY;
      const r = root.getBoundingClientRect();
      startLeft = r.left; startTop = r.top;
      root.setPointerCapture(e.pointerId);
      root.classList.add("is-dragging");
      const move = ev => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        root.style.left = Math.max(0, Math.min(window.innerWidth - root.offsetWidth, startLeft + dx)) + "px";
        root.style.top = Math.max(0, Math.min(window.innerHeight - root.offsetHeight, startTop + dy)) + "px";
      };
      const up = () => {
        root.removeEventListener("pointermove", move);
        root.removeEventListener("pointerup", up);
        root.classList.remove("is-dragging");
        try { sessionStorage.setItem("nova-mini-pos", JSON.stringify({ x: root.style.left, y: root.style.top })); } catch (_) {}
      };
      root.addEventListener("pointermove", move);
      root.addEventListener("pointerup", up);
    });
  }

  function defaultMiniPos() {
    return { x: Math.max(16, window.innerWidth - 400) + "px", y: Math.max(16, window.innerHeight - 190) + "px" };
  }

  function showMiniBar() {
    const root = buildMiniBar();
    root.hidden = false;
    if (!root.dataset.posLoaded) {
      root.dataset.posLoaded = "1";
      let pos = null;
      try { pos = JSON.parse(window.NOVA_UTILS.readStoredKey("nova-mini-pos", "novaMiniPos", sessionStorage) || "null"); } catch (_) {}
      const p = pos || defaultMiniPos();
      root.style.left = p.x; root.style.top = p.y;
    }
    updateMiniBar();
  }

  function hideMiniBar() {
    if (miniRoot) miniRoot.hidden = true;
  }

  function miniEnabled() {
    try { return window.NOVA_UTILS.readStoredKey(MINI_ENABLED_KEY, "novaMiniEnabled", sessionStorage) === "1"; } catch (_) { return false; }
  }

  function setMiniEnabled(on) {
    try {
      if (on) sessionStorage.setItem(MINI_ENABLED_KEY, "1");
      else sessionStorage.removeItem(MINI_ENABLED_KEY);
    } catch (_) {}
    if (on) {
      if (state.songs.length) showMiniBar();
    } else {
      hideMiniBar();
    }
    emit("mini-enabled", { enabled: Boolean(on) });
  }

  function shouldShowMini() {
    if (!miniEnabled()) return false;
    return state.songs.length > 0;
  }

  function updateMiniBar() {
    if (!miniRoot || miniRoot.hidden) return;
    const snap = currentSnapshot();
    const song = snap.song;
    const title = miniRoot.querySelector(".nova-mini-title");
    const cover = miniRoot.querySelector(".nova-mini-cover");
    if (song) {
      title.textContent = window.NOVA_UTILS.songName(song);
      const coverUrl = window.NOVA_UTILS.coverOf(song);
      if (coverUrl && cover.src !== coverUrl) cover.src = coverUrl;
      else if (!coverUrl) cover.removeAttribute("src");
    }
    const toggle = miniRoot.querySelector(".nova-mini-toggle i");
    toggle.className = snap.playing ? "fas fa-pause" : "fas fa-play";
    const bar = miniRoot.querySelector(".nova-mini-progress-bar");
    const pct = snap.duration > 0 ? (snap.currentTime / snap.duration) * 100 : 0;
    bar.style.width = pct + "%";
    miniRoot.querySelector(".nova-mini-time").textContent = window.NOVA_UTILS.formatTime(snap.currentTime);
    miniRoot.querySelector(".nova-mini-duration").textContent = window.NOVA_UTILS.formatTime(snap.duration);
  }

  // ---- 事件分发(音乐页 UI + 悬浮条) ----
  function onEvent(type, payload) {
    if (type === "playlist" || type === "loadstart" || type === "loadend" || type === "error" || type === "play" || type === "pause" || type === "timeupdate" || type === "durationchange" || type === "loadedmetadata" || type === "play-blocked" || type === "load-error") {
      updateMiniBar();
    }
    if (type === "play" || type === "pause" || type === "playlist" || type === "loadstart" || type === "loadend" || type === "error" || type === "load-error" || type === "play-blocked") {
      // 悬浮条显隐完全由音乐页开关决定(音乐页/其他页一致)
      if (shouldShowMini()) showMiniBar();
      else hideMiniBar();
    }
  }

  listeners.add(onEvent);

  window.__novaPlayer = {
    get state() { return currentSnapshot(); },
    setPlaylist,
    playSongAt,
    togglePlayback,
    playNext,
    playPrevious,
    seekTo,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    showMiniBar,
    hideMiniBar,
    setMiniEnabled,
    isMiniEnabled: miniEnabled,
    ensureAudio,
  };

  // ---- 启动: 恢复记忆(索引 + 歌单元信息), 不出声 ----
  function bootstrap() {
    const mem = loadMemory();
    if (mem) {
      state.currentIndex = mem.songIndex;
      if (Array.isArray(mem.songs) && mem.songs.length && !state.songs.length) {
        state.songs = mem.songs;
      }
    }
    const route = document.body.classList.contains("nova-music-route");
    if (shouldShowMini()) showMiniBar();
    if (!route) {
      // 非音乐页: 若歌单有歌, 预载歌曲(不自动播): 悬浮条点击播放时音频已就绪, 立即出声(从头)
      if (state.songs.length && !state.loading) {
        playSongAt(state.currentIndex, false);
      }
    }
    emit("boot");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }

  // PJAX 切换后: audio 常驻不中断, 按开关状态立即重挂悬浮条(无缝)
  document.addEventListener("pjax:complete", () => {
    if (state.songs.length && shouldShowMini()) showMiniBar();
  });
})();
