/* =============================================================
   站点运行时配置(前端单一来源, P1·R5 2026-08-27)
   - 全站统一加载(yml inject.head, 位于 nova-player.js 之前)
   - B站音乐收藏夹: 云函数代理 / UID / 收藏夹名
   - 修改渠道(云函数地址等)只改这里
   ============================================================= */
(function () {
  "use strict";
  window.NOVA_SITE = {
    bili: {
      proxy: "https://1470690781-6b1hcscil5.ap-guangzhou.tencentscf.com",
      uid: "3546712446601247",
      folder: "music"
    }
  };
})();
