'use strict'
/* 手动刷新歌单缓存 data/music-playlist.json(2026-09-02):
   平时无需运行 —— hexo build 时 scripts/lib/music-playlist.js 会自动抓取并回写缓存。
   本脚本用于: 备份/离线预取/调试(构建环境无外网时提前抓取一次)。
   用法: node data/refresh-music-playlist.js */
const { fetchPlaylist, writeCache } = require('../scripts/lib/music-playlist')

fetchPlaylist()
  .then(songs => {
    writeCache(songs)
    console.log(`SAVED ${songs.length} songs -> data/music-playlist.json`)
    songs.slice(0, 5).forEach(s => console.log('-', s.artist, '|', String(s.title).slice(0, 60)))
  })
  .catch(e => {
    console.error('FAILED:', e.message)
    process.exit(1)
  })
