'use strict'
/* 构建后压缩(P2.6):hexo generate 后执行,用 esbuild 压缩产物目录下全部 JS。
   CSS 不压缩:esbuild minify 会做颜色格式转换(如 rgb→hsl),产生 1/255 舍入误差,
   导致背景/渐变边缘像素级渲染差异;CSS 传输体积已由 GitHub Pages gzip 兜底。
   HTML 不压缩(内联 JS 模板字符串风险高)。 */

const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')
const { PUBLIC_DIR } = require('./lib/public-dir')

const publicDir = PUBLIC_DIR
const exts = new Set(['.js'])

async function walk(dir) {
  const files = []
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) {
      files.push(...await walk(full))
    } else if (exts.has(path.extname(full).toLowerCase())) {
      files.push(full)
    }
  }
  return files
}

async function main() {
  if (!fs.existsSync(publicDir)) {
    console.log('[minify] public 不存在, 跳过(clean 后/新克隆场景)')
    return
  }
  const files = await walk(publicDir)
  let saved = 0
  let count = 0
  let failed = 0
  for (const f of files) {
    const rel = path.relative(publicDir, f)
    try {
      const raw = fs.statSync(f).size
      const src = fs.readFileSync(f, 'utf8')
      const result = await esbuild.transform(src, {
        loader: 'js',
        minify: true,
        charset: 'utf8',
        target: 'es2017'
      })
      fs.writeFileSync(f, result.code)
      const delta = raw - result.code.length
      saved += delta
      count++
      console.log(`minify ${rel}: ${(raw / 1024).toFixed(0)}KB -> ${(result.code.length / 1024).toFixed(0)}KB (-${(delta / 1024).toFixed(0)}KB)`)
    } catch (e) {
      failed++
      console.error(`FAIL ${rel}: ${e.code || 'ERR'} ${e.message}`)
    }
  }
  console.log(`\nminified ${count} files, saved ${(saved / 1024).toFixed(0)} KB${failed ? `, FAILED ${failed}` : ''}`)
  if (failed) {
    console.error(`[minify] ${failed} 个文件压缩失败(含文件消失竞态), 置非零退出码`)
    process.exitCode = 1
  }
}

main().catch(e => { console.error(e); process.exit(1) })
