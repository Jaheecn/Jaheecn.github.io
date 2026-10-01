'use strict'
/* 音乐歌单(搜索索引数据源, A 方案 2026-09-02):
   - 构建时请求 B 站云函数 /api/playlist 获取当前歌单(歌曲名/作者/时长)
   - 成功 → 回写 data/music-playlist.json 缓存(入库, 离线兜底)
   - 失败(网络/代理不可用) → 读缓存兜底, 无缓存返回空数组(索引只剩文章)
   以后加减歌曲: 只改 B 站收藏夹, build 时自动同步, 零手工。 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const { BILI } = require('../site-config')

const CACHE_FILE = path.join(__dirname, '..', '..', 'data', 'music-playlist.json')

function requestJson(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, res => {
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error('HTTP ' + res.statusCode))
        return
      }
      let data = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs || 8000, () => req.destroy(new Error('timeout')))
  })
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
  } catch (e) {
    return null
  }
}

function writeCache(songs) {
  try {
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({ fetchedAt: new Date().toISOString(), songs }, null, 2),
      'utf8'
    )
  } catch (e) {
    /* 缓存写失败不阻塞构建 */
  }
}

async function fetchPlaylist() {
  const url = BILI.proxy
    + '/api/playlist?uid=' + encodeURIComponent(BILI.uid)
    + '&folder=' + encodeURIComponent(BILI.folder || 'music')
  const json = await requestJson(url)
  const songs = Array.isArray(json.songs) ? json.songs : []
  if (!songs.length) throw new Error('empty playlist')
  return songs
}

async function loadSearchSongs() {
  if (!BILI.proxy || !BILI.uid) {
    console.warn('[music-playlist] BILI 配置缺失, 使用缓存')
    return readCache()?.songs || []
  }
  try {
    const songs = await fetchPlaylist()
    writeCache(songs)
    return songs
  } catch (e) {
    console.warn('[music-playlist] 抓取失败, 使用缓存兜底: ' + e.message)
    return readCache()?.songs || []
  }
}

module.exports = { loadSearchSongs, fetchPlaylist, writeCache }
