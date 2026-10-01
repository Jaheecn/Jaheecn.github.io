'use strict'
/*
 * public-dir.js -- 解析 hexo 的产物目录(_config.yml 的 public_dir)。
 *
 * 为什么需要它: 产物目录不再固定为 <root>/public, 而是 _config.yml 里配置的值
 * (本站指向 ../public, 即与 web/main、web/waline 并列的产物仓库目录)。
 * 任何需要读产物的脚本都应通过这里取路径, 避免各自硬编码 "public" 而失配。
 *
 * 解析规则(与 hexo 一致): 相对路径基于 hexo 根目录(<root>), 绝对路径原样使用。
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')

function readPublicDir() {
  const cfgPath = path.join(ROOT, '_config.yml')
  let raw = ''
  try {
    raw = fs.readFileSync(cfgPath, 'utf8')
  } catch (e) {
    raw = ''
  }

  // 轻量提取: 只取顶层的 public_dir 一行(不引入 yaml 依赖, 且避免解析整份配置)。
  // 顶层的键无缩进, 因此 ^public_dir: 即可排除嵌套键。
  let value = ''
  for (const line of raw.split(/\r?\n/)) {
    const m = /^public_dir:\s*(.*)$/.exec(line)
    if (m) {
      value = m[1].trim().replace(/^["']|["']$/g, '')
      break
    }
  }
  if (!value) value = 'public' // hexo 默认值

  return path.isAbsolute(value) ? value : path.resolve(ROOT, value)
}

module.exports = { ROOT, PUBLIC_DIR: readPublicDir() }
