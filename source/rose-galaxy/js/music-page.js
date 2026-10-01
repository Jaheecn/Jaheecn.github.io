/* =============================================================
   Nova Music Page UI (2026-08-27 重构)
   - 播放核心上移 window.__novaPlayer(全局单例, 跨页常驻)
   - 本文件仅负责音乐页 UI: 卡片渲染/进度/上一首下一首/键盘
   - 通过 player.subscribe() 桥接全局状态
   ============================================================= */
(function () {
  "use strict";

  // 站点配置单一来源(P1·R5): lib/site-config.js
  const BILI_PROXY = window.NOVA_SITE.bili.proxy;
  const BILI_UID = window.NOVA_SITE.bili.uid;
  const BILI_FOLDER = window.NOVA_SITE.bili.folder;

  // B5 单源(2026-09-02): 视觉图列表改为运行时从音乐页卡片 DOM 收集(data-src),
  // 与 music.html 卡片 img 单一来源, 换图只改模板
  // C7/C10 2026-09-02: 共享工具从 NOVA_UTILS 解构(原局部 songName/songArtist/formatTime 包装已收敛)
  // 阶段4 批次N · 4.4: normalizeIndex 与 errText 也收敛到 NOVA_UTILS(原为本文件私有/内联)
  const formatTime = window.NOVA_UTILS.formatTime;
  const songName = window.NOVA_UTILS.songName;
  const songArtist = window.NOVA_UTILS.songArtist;
  const normalizeIndex = window.NOVA_UTILS.normalizeIndex;
  const errText = window.NOVA_UTILS.errText;

  const visualImages = Array.from(document.querySelectorAll(".nova-music-card img"))
    .map(img => img.dataset.src || "")
    .filter(Boolean);
  const visibleOffsets = [-2, -1, 0, 1, 2];
  const loadedVisualImages = new Set();
  const pendingVisualImages = new Map();

  function previewImage(image) {
    return image.replace(/\.webp$/i, "-preview.webp");
  }

  function preloadVisualImage(image) {
    if (loadedVisualImages.has(image)) return Promise.resolve(image);
    if (pendingVisualImages.has(image)) return pendingVisualImages.get(image);
    const request = new Promise((resolve, reject) => {
      const loader = new Image();
      loader.decoding = "async";
      loader.onload = async () => {
        try { await loader.decode?.(); } catch (_) {}
        loadedVisualImages.add(image);
        pendingVisualImages.delete(image);
        resolve(image);
      };
      loader.onerror = () => { pendingVisualImages.delete(image); reject(new Error(`Nova music: failed to preload ${image}`)); };
      loader.src = image;
    });
    pendingVisualImages.set(image, request);
    return request;
  }

  function assignCardImage(image, source, isCurrent, shouldPreload) {
    const currentSource = image.getAttribute("src") || "";
    image.dataset.src = source;
    image.width = 640;
    image.height = 960;
    image.decoding = "async";
    if (currentSource === source) {
      image.loading = isCurrent ? "eager" : "lazy";
      if (!isCurrent) image.removeAttribute("fetchpriority");
      if (image.complete && image.naturalWidth) loadedVisualImages.add(source);
      else image.addEventListener("load", () => loadedVisualImages.add(source), { once: true });
      return;
    }
    image.loading = isCurrent ? "eager" : "lazy";
    image.removeAttribute("fetchpriority");
    const target = loadedVisualImages.has(source) ? source : previewImage(source);
    image.classList.add("nova-card-img-swap");
    image.src = target;
    void image.offsetWidth;
    const reveal = () => { if (image.dataset.src === source) image.classList.remove("nova-card-img-swap"); };
    if (image.complete && image.naturalWidth) requestAnimationFrame(reveal);
    else image.addEventListener("load", reveal, { once: true });
    if (!isCurrent && !shouldPreload) return;
    preloadVisualImage(source)
      .then(loadedSource => { if (image.dataset.src === loadedSource) image.src = loadedSource; })
      .catch(error => console.warn(error.message));
  }

  function warmCardImage(image) {
    const source = image?.dataset.src;
    if (!source || loadedVisualImages.has(source)) return;
    preloadVisualImage(source)
      .then(loadedSource => { if (image.dataset.src === loadedSource) image.src = loadedSource; })
      .catch(error => console.warn(error.message));
  }

  function createMusicPageController(root) {
    const player = window.__novaPlayer;
    const els = {
      title: root.querySelector(".nova-music-current-title"),
      artist: root.querySelector(".nova-music-current-artist"),
      cover: root.querySelector(".nova-music-current-cover"),
      progress: root.querySelector(".nova-music-progress-input"),
      currentTime: root.querySelector(".nova-music-current-time"),
      duration: root.querySelector(".nova-music-duration"),
      toggle: root.querySelector(".nova-music-toggle"),
      previous: root.querySelector(".nova-music-previous"),
      next: root.querySelector(".nova-music-next"),
      count: root.querySelector(".nova-music-count"),
      notesCount: root.querySelector(".nova-music-notes-count"),
      retry: root.querySelector(".nova-music-retry"),
      miniToggle: root.querySelector(".nova-music-mini-toggle"),
      cards: [...root.querySelectorAll(".nova-music-card")],
    };

    /* P1 修复(2026-09-11): 模板若缺某个 class, els.x 为 null, 后面的 textContent /
       setAttribute / querySelector 会抛异常; 而 player.emit 的 catch 曾把它整个吞掉 ——
       结果是"UI 永久不更新且控制台毫无线索"。这里把缺失的元素替换为哑对象,
       使 UI 更新流程不会因单点空引用而整体中断(dummy 的写入全部无副作用)。 */
    const dummy = {
      textContent: '', value: '', hidden: false, src: '', alt: '', width: 0, height: 0,
      style: {}, dataset: {}, disabled: false, checked: false,
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      setAttribute() {}, removeAttribute() {}, getAttribute: () => null, hasAttribute: () => false,
      addEventListener() {}, removeEventListener() {},
      querySelector: () => null, querySelectorAll: () => [],
      appendChild() {}, removeChild() {}, remove() {}, focus() {}, blur() {}
    };
    Object.keys(els).forEach(k => { if (!els[k]) els[k] = dummy; });

    const listeners = [];
    /* 歌单请求竞态控制(P0 修复 2026-09-11): 见 loadPlaylist / destroyMusicPage 注释 */
    let playlistAbort = null;
    let playlistTimer = 0;
    const on = (target, type, handler, options) => {
      target?.addEventListener(type, handler, options);
      listeners.push(() => target?.removeEventListener(type, handler, options));
    };

    /* 封面兜底: cover -> pic -> 卡片图。visualImages 是本模块运行时从 DOM 收集的,
       故此处保留本地包装(不抽到 NOVA_UTILS); 其中的 normalizeIndex 已收敛到 NOVA_UTILS。 */
    const songCover = (song, index) => song?.cover || song?.pic || visualImages[normalizeIndex(index, visualImages.length)];

    function showLoadingState() {
      els.title.textContent = "歌单载入中";
      els.artist.textContent = `B站收藏夹 · ${BILI_FOLDER}`;
      if (els.retry) els.retry.hidden = true;
    }

    function showLoadFailure(title, detail) {
      els.title.textContent = title;
      els.artist.textContent = detail;
      if (els.retry) els.retry.hidden = false;
    }

    function renderCurrentSong() {
      const snap = player.state;
      const song = snap.song;
      if (!song) return;
      const name = songName(song);
      const artist = songArtist(song);
      els.title.textContent = name;
      els.artist.textContent = artist;
      const cover = songCover(song, snap.currentIndex);
      if (els.cover) {
        const hasSquarePlaylistCover = Boolean(song?.cover || song?.pic);
        els.cover.src = cover;
        els.cover.width = 640;
        els.cover.height = hasSquarePlaylistCover ? 640 : 960;
        els.cover.alt = `${name} - ${artist}`;
      }
      els.count.textContent = `共 ${snap.songs.length} 首 · 当前第 ${snap.currentIndex + 1} 首`;
      if (els.notesCount) els.notesCount.textContent = `${snap.songs.length} TRACKS`;
      root.classList.toggle("is-playing", snap.playing);
      const toggleIcon = els.toggle.querySelector("i");
      if (toggleIcon) {
        toggleIcon.className = snap.playing ? "fas fa-pause" : "fas fa-play";
      } else {
        els.toggle.textContent = snap.playing ? "Ⅱ" : "▶";
      }
      els.toggle.setAttribute("aria-label", snap.playing ? "暂停" : "播放");
    }

    function renderVisibleCards() {
      const snap = player.state;
      const total = snap.songs.length;
      els.cards.forEach((card, slot) => {
        const previousIndex = card.dataset.songIndex;
        const index = normalizeIndex(snap.currentIndex + visibleOffsets[slot], total);
        const song = snap.songs[index];
        const name = songName(song);
        const artist = songArtist(song);
        const image = songCover(song, index);
        card.dataset.songIndex = String(index);
        card.setAttribute("aria-label", slot === 2 ? `${name}，播放或暂停` : `播放 ${name} - ${artist}`);
        card.toggleAttribute("aria-current", slot === 2);
        const img = card.querySelector("img");
        assignCardImage(img, image, slot === 2, slot === 3);
        img.alt = `${name} - ${artist}`;
        card.querySelector("strong").textContent = slot === 2 ? name : "";
        card.querySelector("small").textContent = slot === 2 ? artist : "";
        if (slot === 2 && previousIndex !== String(index)) {
          card.classList.remove("nova-card-pop");
          void card.offsetWidth;
          card.classList.add("nova-card-pop");
          card.addEventListener("animationend", () => card.classList.remove("nova-card-pop"), { once: true });
        }
      });
    }

    function updateProgress() {
      const snap = player.state;
      const current = Number.isFinite(snap.currentTime) ? snap.currentTime : 0;
      const duration = Number.isFinite(snap.duration) ? snap.duration : 0;
      els.currentTime.textContent = formatTime(current);
      els.duration.textContent = formatTime(duration);
      const value = duration > 0 ? Math.round((current / duration) * 1000) : 0;
      els.progress.value = String(value);
      els.progress.style.setProperty("--nova-music-progress", `${value / 10}%`);
    }

    function syncMiniToggle() {
      const on = player.isMiniEnabled();
      if (els.miniToggle) els.miniToggle.setAttribute("aria-pressed", String(on));
    }

    function bindMusicControls() {
      on(els.previous, "click", () => player.playPrevious());
      on(els.next, "click", () => player.playNext());
      on(els.toggle, "click", () => player.togglePlayback());
      on(els.progress, "input", event => player.seekTo(Number(event.target.value) / 1000));
      on(els.miniToggle, "click", () => player.setMiniEnabled(!player.isMiniEnabled()));
      els.cards.forEach((card, slot) => {
        const warm = () => warmCardImage(card.querySelector("img"));
        on(card, "pointerenter", warm);
        on(card, "focusin", warm);
        on(card, "click", () => {
          const idx = Number(card.dataset.songIndex);
          if (slot === 2) player.togglePlayback();
          else player.playSongAt(idx, true);
        });
      });
      on(document, "keydown", event => {
        if (!root.isConnected || event.target?.matches("input, textarea, [contenteditable]")) return;
        if (event.key === "ArrowLeft") player.playPrevious();
        if (event.key === "ArrowRight") player.playNext();
      });
    }

    function loadPlaylist() {
      showLoadingState();
      /* 竞态与泄漏控制(P0 修复 2026-09-11):
         pjax:send 会先 destroy() 清空 listeners, 但上一轮的 fetch 仍会 resolve 并继续执行
         bindMusicControls() —— 新监会被注册进已清空的数组, 永不注销(永久泄漏)。
         故给 fetch 挂 AbortController: 新请求取消旧请求 / destroy 时主动 abort
         (使 .then 不再执行) / 15s 超时防弱网永久挂起。 */
      if (playlistAbort) playlistAbort.abort();
      const ac = new AbortController();
      playlistAbort = ac;
      clearTimeout(playlistTimer);
      playlistTimer = setTimeout(() => ac.abort(), 15000);
      fetch(BILI_PROXY + "/api/playlist?uid=" + BILI_UID + "&folder=" + encodeURIComponent(BILI_FOLDER), { signal: ac.signal })
        .then(resp => resp.json())
        .then(j => {
          if (j.error) throw new Error(j.error);
          if (!Array.isArray(j.songs) || !j.songs.length) throw new Error("收藏夹为空");
          player.setPlaylist(j.songs);
          if (els.retry) els.retry.hidden = true;
          bindMusicControls();
          renderCurrentSong();
          renderVisibleCards();
          updateProgress();
          // 搜索直达: ?song=<bvid> → 定位并播放对应歌曲;
          // 无参数时: 若 audio 已加载同一首歌(无缝返回音乐页)则保持, 不重拉流;
          // 否则预载当前歌曲(不自动播): 点击播放时音频已就绪, 立即出声
          const targetBvid = new URLSearchParams(location.search).get("song");
          const targetIndex = targetBvid
            ? j.songs.findIndex(s => String(s.bvid || "") === targetBvid)
            : -1;
          if (targetIndex >= 0) {
            player.playSongAt(targetIndex, true);
          } else {
            const snapNow = player.state;
            const sameSong = Boolean(
              snapNow.loadedBvid &&
              snapNow.loadedBvid === String(j.songs[snapNow.currentIndex]?.bvid)
            );
            if (!sameSong) player.playSongAt(player.state.currentIndex, false);
          }
          syncMiniToggle();
        })
        .catch(e => {
          if (e?.name === "AbortError") return; // 主动取消或超时: 已离开音乐页 / 已发起新请求
          showLoadFailure("收藏夹加载失败", errText(e));
          console.error("Nova music: playlist failed.", e);
        })
        .finally(() => {
          clearTimeout(playlistTimer);
          if (playlistAbort === ac) playlistAbort = null;
        });
    }

    function destroyMusicPage() {
      // 取消在飞的歌单请求: 确保 .then 不再向已清空的 listeners 注册监听(防永久泄漏)
      if (playlistAbort) { playlistAbort.abort(); playlistAbort = null; }
      clearTimeout(playlistTimer);
      listeners.splice(0).forEach(remove => remove());
    }

    on(els.retry, "click", loadPlaylist);
    loadPlaylist();

    renderCurrentSong();
    renderVisibleCards();
    updateProgress();

    const unsubscribe = player.subscribe((type, snap) => {
      if (type === "timeupdate") {
        updateProgress();
      }
      if (type === "play" || type === "pause") {
        renderCurrentSong();
        updateProgress();
      }
      if (type === "playlist") {
        renderCurrentSong();
        renderVisibleCards();
        updateProgress();
      }
      if (type === "loadstart") {
        renderCurrentSong();
        renderVisibleCards();
        updateProgress();
        els.artist.textContent = "音频加载中…";
      }
      if (type === "loadend") {
        renderCurrentSong();
        updateProgress();
      }
      if (type === "load-error") {
        els.title.textContent = "当前歌曲暂时无法播放";
        els.artist.textContent = snap?.message || "请尝试切换下一首";
      }
      if (type === "error") {
        els.title.textContent = "当前歌曲暂时无法播放";
        els.artist.textContent = "请尝试切换下一首";
      }
      if (type === "play-blocked") {
        els.title.textContent = "点击 ▶ 开始播放";
      }
      if (type === "mini-enabled") {
        syncMiniToggle();
      }
    });
    listeners.push(unsubscribe);

    return { root, destroy: destroyMusicPage };
  }

  function initMusicPage() {
    const root = document.querySelector(".nova-music-page");
    if (!root) return;
    if (window.__novaMusicController?.root === root) return;
    window.__novaMusicController?.destroy();
    window.__novaMusicController = createMusicPageController(root);
  }

  function leaveMusicPage() {
    window.__novaMusicController?.destroy();
    window.__novaMusicController = null;
  }

  /* 幂等引导(P0 修复 2026-09-11):
     本脚本带 data-pjax, PJAX 导航会重新执行整个 IIFE。原先 pjax:send / pjax:complete
     在顶层无条件注册 —— 每进一次音乐页就多一对监听器, N 次后每次 pjax:complete 会调用
     N 次 initMusicPage(其内部虽有 root 比较守卫, 复杂度仍是 O(N))。
     故: 监听注册只在首次执行时进行一次; 后续重执行仅调用一次 initMusicPage。 */
  if (window.__novaMusicBoot) {
    window.__novaMusicBootstrap.init();
  } else {
    window.__novaMusicBoot = true;
    window.__novaMusicBootstrap = {
      init: initMusicPage,
      destroy: leaveMusicPage,
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initMusicPage, { once: true });
    } else {
      initMusicPage();
    }
    document.addEventListener("pjax:send", leaveMusicPage);
    document.addEventListener("pjax:complete", initMusicPage);
  }
})();
