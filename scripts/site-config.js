'use strict'
/* 站点配置单一来源(P4·C5, 2026-08-27): Node 侧生成器共用。
   - SITE: 站点根 URL(去尾斜杠), 从根 _config.yml 的 url 读取
   - MUSIC: 网易云音乐配置(云函数代理 + 歌单 ID), 从前端源文件
     source/rose-galaxy/js/lib/site-config.js 解析(单一真源, 前端=浏览器运行时)
   - 本模块为纯常量模块(不依赖 hexo 作用域), 可被任意 require 链安全加载——
     注意: 被 hexo 直接加载的 scripts/*.js 才有 hexo 参数, 内部 require 的模块没有,
     因此这里不读 hexo.config, 改为直接解析 _config.yml。 */

const fs = require('fs')
const path = require('path')

function readSite() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', '_config.yml'), 'utf8')
    const m = raw.match(/^url:\s*([^\s#]+)/m)
    return m ? m[1].replace(/\/+$/, '') : ''
  } catch (e) {
    return ''
  }
}

function readVersion() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', '_config.yml'), 'utf8')
    const m = raw.match(/^version:\s*([^\s#]+)/m)
    return m ? m[1].trim() : ''
  } catch (e) { return '' }
}

function readMusic() {
  try {
    const raw = fs.readFileSync(
      path.join(__dirname, '..', 'source', 'rose-galaxy', 'js', 'lib', 'site-config.js'), 'utf8')
    const val = key => {
      const m = raw.match(new RegExp(key + ': "([^"]+)"'))
      return m ? m[1] : ''
    }
    return { proxy: val('proxy'), playlist: val('playlist') }
  } catch (e) {
    return { proxy: '', playlist: '' }
  }
}

const SITE = readSite()
const VERSION = readVersion()
const MUSIC = readMusic()

module.exports = { SITE, VERSION, MUSIC }
