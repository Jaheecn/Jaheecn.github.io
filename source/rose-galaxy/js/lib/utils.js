/* =============================================================
   前端共享工具(单一来源, P1·R7 2026-08-27)
   - 全站统一加载(yml inject.head, 位于 nova-player.js 之前)
   - C7 2026-09-02: songName/songArtist(歌曲名/艺术家兜底链, 原分散于
     music-page.js/nova-player.js, 收敛至此)
   ============================================================= */
(function () {
  "use strict";
  window.NOVA_UTILS = {
    /* 秒数 -> "m:ss"(mm 不补零, ss 补零); 非法/负数 -> "00:00" */
    formatTime: function (seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
      var m = Math.floor(seconds / 60);
      var s = Math.floor(seconds % 60).toString().padStart(2, "0");
      return m + ":" + s;
    },
    /* 歌曲名: name -> title -> 兜底文案(C7 统一) */
    songName: function (song) {
      return song?.name || song?.title || "未命名歌曲";
    },
    /* 艺术家: artist -> author -> 兜底文案 */
    songArtist: function (song) {
      return song?.artist || song?.author || "未知歌手";
    },
    /* 索引归一化(阶段4 批次N · 4.4 收敛): 原 music-page.js 与 nova-player.js 各有一份,
       后者是内联取模且缺 length=0 保护(会得 NaN), 现统一用本实现。 */
    normalizeIndex: function (index, length) {
      return length ? ((index % length) + length) % length : 0;
    },
    /* 错误文案截断(原两处逐字重复: nova-player 的 load-error 与 music-page 的加载失败提示) */
    errText: function (e) {
      return String(e?.message || e).slice(0, 90);
    },
    /* 封面兜底链: cover -> pic -> ""(原 nova-player.js 内两处逐字重复) */
    coverOf: function (song) {
      return song?.cover || song?.pic || "";
    },
    /* 存储键读取 + 一次性迁移(阶段4 批次N · 4.5 统一前缀为 nova-):
       新键优先; 若只有旧键, 则把旧值迁到新键并删除旧键, 再返回 ——
       因此"迁移是否已跑"不影响结果, 也不依赖脚本执行顺序, 用户数据不会丢。
       调用方把各自的旧键名作为 legacyKey 传入。 */
    readStoredKey: function (newKey, legacyKey, store) {
      var s = store || window.sessionStorage;
      try {
        var v = s.getItem(newKey);
        if (v !== null) return v;
        if (legacyKey) {
          var old = s.getItem(legacyKey);
          if (old !== null) {
            try { s.setItem(newKey, old); s.removeItem(legacyKey); } catch (e) {}
            return old;
          }
        }
      } catch (e) {}
      return null;
    }
  };
})();
