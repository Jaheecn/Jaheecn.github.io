'use strict'
/* 工程页生成器(P3):输出 /projects/index.html,由 themes/nova/layout/projects.pug 渲染。
   - 数据源:scripts/projects-data.js(5 个工程,字段来自 deymo-site info.json 与 manifest)
   - 结构仿 nova-tags:hero/底部片段沿用 idx-parts 体系(工程页 top 在 project-parts/top.html)
   - 封面图:source/img/projects/*.webp(sharp 质量 80 转换) */

const fs = require('fs')
const path = require('path')
const { composeShellTop, buildFooter } = require('./parts-common')
const { fmtDate } = require('./lib/date')
const { projectUpdated } = require('./lib/project-date')
const { toMs, byKeys } = require('./lib/sort')

const projects = require('./projects-data')
const INTRO_BLOCKS = require('./projects-intro')   // 工程介绍文案(自包含, 见 projects-intro.js)

const projectParts = path.join(__dirname, '..', 'themes', 'nova', 'layout', 'project-parts')
const readProjectTop = fs.readFileSync(path.join(projectParts, 'top.html'), 'utf8')

const { SITE } = require('./site-config')

// 下载文件本站托管(source/assets/projects/_files/): deymocn 已删除, 链接指向本站
const DL_BASE = SITE

// "本时刻" 发表于/更新于: 无 date 的工程(或想保持更新的)用当前时间 YYYY-MM-DD 填充
const TODAY = fmtDate(new Date())

const CATEGORIES = [
  {
    key: 'vm',
    name: '虚拟机',
    eyebrow: 'VIRTUAL MACHINE',
    motto: '虚拟化底座：快照、克隆与网络模式。'
  },
  {
    key: 'db',
    name: '数据库',
    eyebrow: 'DATABASE',
    motto: '关系型数据库：从建库建表到查询优化。'
  },
  {
    key: 'web',
    name: 'Web 环境',
    eyebrow: 'WEB ENVIRONMENT',
    motto: '本地 Web 环境：服务、站点与数据库。'
  },
  {
    key: 'sec',
    name: '安全工具',
    eyebrow: 'SECURITY LAB',
    motto: '本地靶场：在受控环境里动手验证。'
  }
]

function dlHref(p) {
  return DL_BASE + encodeURI(p.url)
}

function projectLdjson() {
  const url = encodeURI(SITE + '/projects/')
  return '<script type="application/ld+json">{"@context":"https://schema.org","@type":"CollectionPage","@id":"' + url + '#webpage","name":"\u5de5\u7a0b","url":"' + url + '","description":"\u8f6f\u4ef6\u5b66\u4e60\u8bb0\u5f55\uff1a\u4ece\u5b89\u88c5\u914d\u7f6e\u5230\u52a8\u624b\u5b9e\u8df5\u3002","inLanguage":"zh-CN","isPartOf":{"@type":"WebSite","@id":"' + SITE + '/#website","url":"' + SITE + '/","name":"Jahee"}}</script>'
}

hexo.extend.generator.register('nova-projects', function () {
  const prepared = projects.map(p => ({
    id: p.id,
    title: p.title,
    category: p.category,
    categoryKey: p.categoryKey,
    subtitle: p.subtitle,
    date: p.date,
    description: p.description,
    intro: p.intro || '',
    tags: p.tags,
    detailHref: '/projects/' + p.id + '/',
    link: p.link,
    linkLabel: p.linkLabel || 'GitHub',
    linkIcon: p.linkIcon,
    link2: p.link2,
    link2Label: p.link2Label || '更多信息',
    cover: p.cover,
    coverW: p.coverW,
    coverH: p.coverH,
    downloads: (p.downloads || []).map(d => ({
      name: d.name,
      href: dlHref(d),
      sizeLabel: d.sizeLabel || '',
      desc: d.desc || '',
      files: (d.files || []).map(f => ({ name: f.name, sizeLabel: f.sizeLabel || '', desc: f.desc || '' }))
    }))
  }))

  // 工程更新日期(单源 lib/project-date.js): 显式 updated → 目录内最新文件 mtime → 目录 mtime → date
// —— 真实浏览量(lastRaw) + 工程"最后更新" ——
function loadRawPv() {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'views-cache.json'), 'utf8'))
    return c.lastRaw || {}
  } catch (e) { return {} }
}
const uniqueTags = new Set()
  prepared.forEach(p => p.tags.forEach(t => uniqueTags.add(t)))

  const rawPv = loadRawPv()
  const pvOfP = pp => rawPv['/projects/' + pp.id + '/'] || 0
  /* 阶段4 批次N · 4.4: 比较器收敛到 scripts/lib/sort.js(与 home-generator 共用同一实现)。
     原先 updMs 直接用 new Date(...).getTime(), 缺 isNaN 保护 —— projectUpdated 一旦返回
     非法值就会产生 NaN, 使 Array.sort 结果不确定; 现统一走 toMs(非法值回退 0)。 */
  const updMs = pp => toMs(projectUpdated(pp))
  const byPvUpd = byKeys([[r => pvOfP(r), 'desc'], [r => updMs(r), 'desc']])
  const byUpd = byKeys([[r => updMs(r), 'desc']])
  const hasPv = prepared.some(pp => pvOfP(pp) > 0)
  const topProject = prepared.slice().sort(byPvUpd)[0]
  const latestProject = prepared.slice().sort(byUpd)[0]

  const stats = [
    { value: String(prepared.length), en: 'PROJECTS', zh: '项目总数' },
    { value: String(uniqueTags.size), en: 'TAGS', zh: '技术标签' },
    { value: String(pvOfP(topProject)), en: 'TOP PROJECT', zh: hasPv ? topProject.title : latestProject.title },
    { value: projectUpdated(latestProject), en: 'LATEST UPDATE', zh: latestProject.title }
  ]

  // 公共壳(P1 重建): sidebar 统计卡数字动态计算
  const projectsStat = { href: '/projects/', label: '工程', count: String(prepared.length) }
  const shellTop = composeShellTop({
    pageClass: 'type-projects',
    headerCls: 'not-home-page nova-tag-hero',
    headerStyle: 'background-image:url(/img/hero/projects-hero.webp)',
    siteData: projectsStat,
    closeHeader: false
  }) + '\n' + readProjectTop
  const shellBottom = buildFooter()
  // 二级详情页壳: 文章式 header(post-bg), hero 内容(post-info)由模板输出
  const detailShellTop = composeShellTop({
    pageClass: 'post',
    headerCls: 'post-bg',
    headerStyle: 'background-image:url(/img/hero/projects-detail-hero.webp)',
    siteData: projectsStat,
    closeHeader: false
  })

  const files = [
    {
      path: 'projects/index.html',
      layout: 'projects',
      data: {
        stats: stats,
        projects: prepared,
        ldjson: projectLdjson(),
        shellTop: shellTop,
        shellBottom: shellBottom
      }
    }
  ]

  // 工程二级页(详情页):每个工程一页,共 5 页
  prepared.forEach(p => {
    files.push({
      path: 'projects/' + p.id + '/index.html',
      layout: 'project-detail',
      data: {
        projectId: p.id,
        title: p.title,
        category: p.category,
        categoryKey: p.categoryKey,
        subtitle: p.subtitle,
        // 发表于: 有 date 用原值, 否则本时刻; 更新于: 单源 projectUpdated(显式 updated → 资产 mtime → date)
        date: p.date || TODAY,
        updated: projectUpdated(p),
        description: p.description,
        tags: p.tags,
        demoCover: '/img/projects/demo-' + p.id + '.webp',
        link: p.link,
        linkLabel: p.linkLabel,
        linkIcon: p.linkIcon,
        link2: p.link2,
        link2Label: p.link2Label,
        introBlocks: INTRO_BLOCKS[p.id] || null,
        downloads: p.downloads,
        others: prepared.filter(o => o.id !== p.id),
        allProjects: prepared,
        // 侧边栏统计(PROFILE 卡): 工程总数 / 分类数 / 全站标签数
        projectCount: prepared.length,
        categoryCount: CATEGORIES.length,
        tagCount: uniqueTags.size,
        shellTop: detailShellTop,
        shellBottom: shellBottom
      }
    })
  })

  return files
})
