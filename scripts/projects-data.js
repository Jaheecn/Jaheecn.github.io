'use strict'
/* 工程页数据快照: 收录本人学习过的软件工具。
   维护:新增条目时在此追加,封面图放 source/img/projects/ 并转 webp(质量 80)。
   详情页长文案在 scripts/projects-intro.js(按 id 对应)。

   可选字段(不写则自动取值):
   - updated: 最后更新日 'YYYY-MM-DD'。未写时按 lib/project-date.js 的判定链取值;
     本条无下载资产,故最终回落到 date 字段。
   - downloads: 资料下载列表。本组条目均无下载,留空数组即可(模板会自动隐藏该区块)。
   - link / link2: 外部链接。本组条目均不设链接(模板会自动隐藏"工程链接"区块)。 */

module.exports = [
  {
    id: 'vmware',
    title: 'VMware Workstation',
    category: '虚拟机',
    categoryKey: 'vm',
    subtitle: '虚拟机',
    date: '2026-09-18',
    description: '桌面级虚拟机软件。在一台物理机上并行运行多个隔离的操作系统，用于搭建实验环境、做快照回滚与网络拓扑练习。',
    intro: '桌面端虚拟化工具：在一台物理机上并行运行多个相互隔离的操作系统。学习重点是虚拟机的创建与硬件参数分配（CPU 核心、内存、磁盘类型）、网络模式的选择（桥接、NAT、仅主机）以及快照与克隆的使用。日常把它当作实验底座——系统装坏了直接回滚快照，不必重装宿主机。',
    tags: ['虚拟化', '快照回滚', '网络模式', '实验环境'],
    cover: '/img/projects/vmware.webp',
    coverW: 1280,
    coverH: 720,
    downloads: []
  },
  {
    id: 'ssms',
    title: 'SQL Server Management Studio',
    category: '数据库',
    categoryKey: 'db',
    subtitle: '数据库',
    date: '2026-09-20',
    description: 'SQL Server 的官方图形化管理工具。连接数据库实例、编写并执行 T-SQL、查看执行计划与结果集，是数据库课程的主要操作界面。',
    intro: 'SQL Server 的官方图形化管理工具（SSMS）。用它连接数据库实例，编写和执行 T-SQL 语句，在对象资源管理器里浏览库、表、视图与存储过程，并通过结果网格与消息面板观察执行情况。学习重点放在建库建表、增删改查、约束与主外键关系，以及用查询执行计划排查慢查询。',
    tags: ['SQL Server', 'T-SQL', '建库建表', '执行计划'],
    cover: '/img/projects/ssms.webp',
    coverW: 1280,
    coverH: 720,
    downloads: []
  },
  {
    id: 'phpstudy',
    title: 'phpstudy',
    category: 'Web 环境',
    categoryKey: 'web',
    subtitle: 'Web 环境',
    date: '2026-09-24',
    description: 'Windows 下的一键式 Web 运行环境集成面板。集成 Apache/Nginx、PHP、MySQL，用来在本地快速搭起网站与靶场环境。',
    intro: 'Windows 平台的一键式 Web 环境集成面板：把 Apache/Nginx、PHP、MySQL 打包在一起，安装后即可启停服务、切换 PHP 版本、修改站点根目录与 hosts。我用它在本机搭建网站测试环境，也是后续部署漏洞练习平台（Pikachu）的前置环境。',
    tags: ['Apache', 'PHP', 'MySQL', '本地环境'],
    cover: '/img/projects/phpstudy.webp',
    coverW: 1280,
    coverH: 720,
    downloads: []
  },
  {
    id: 'bluelotus',
    title: 'BlueLotus',
    category: '安全工具',
    categoryKey: 'sec',
    subtitle: '安全工具',
    date: '2026-09-28',
    description: '安全练习与靶场平台，配合本地 Web 环境使用，用来把课堂上学到的 Web 安全知识在受控环境里动手验证。',
    intro: '安全练习平台，配合本机 Web 环境（phpstudy）部署使用。把课堂上学到的 Web 安全概念放到受控环境里动手验证：从环境搭建、访问调试，到按模块逐个练习并观察请求与响应的差异。练习全程只在自己搭建的本地环境里进行。',
    tags: ['环境搭建', 'Web 安全', '本地靶场', '动手验证'],
    cover: '/img/projects/bluelotus.webp',
    coverW: 1280,
    coverH: 720,
    downloads: []
  },
  {
    id: 'pikachu',
    title: 'Pikachu',
    category: '安全工具',
    categoryKey: 'sec',
    subtitle: '安全工具',
    date: '2026-10-01',
    description: '开源 Web 安全漏洞练习平台，覆盖 SQL 注入、XSS、文件包含、文件上传等常见漏洞类型，按模块逐项练习。',
    intro: '开源的 Web 安全漏洞练习平台，把常见 Web 漏洞按模块拆开，适合按章节逐个动手。练习时对照源码观察漏洞成因，再用浏览器与抓包工具验证利用过程，最后回看修复方式——重点不在"打通"，而在理解漏洞为什么会产生。全程在本地自建环境中进行。',
    tags: ['SQL 注入', 'XSS', '文件包含', '文件上传'],
    cover: '/img/projects/pikachu.webp',
    coverW: 1280,
    coverH: 720,
    downloads: []
  }
]
