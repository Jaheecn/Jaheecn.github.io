# Yibao-web — 个人网站

一个以「深夜幕蓝 + 玫瑰星系粒子」为视觉核心的个人网站。基于 [yibao11.github.io](https://yibao11.github.io) 的静态构建产物重建，采用 Hexo 8.1.2 + 自研 nova 主题（`themes/nova/`）+ rose-galaxy 定制层，并在此基础上做了个性化与开放共享。

线上地址：<https://yibao11.github.io>

| 深色主题 | 浅色主题 |
| --- | --- |
| ![深色主题预览](repository-docs/preview-dark.png) | ![浅色主题预览](repository-docs/preview-light.png) |

**站点由四类内容构成**

| 版块 | 路径 | 说明 |
| --- | --- | --- |
| 文章 | `/articles/`、`/posts/<标题>/` | 13 篇：Markdown 语法 5 篇 + 赋文 5 篇 + 诗词 2 篇 + 工具 1 篇 |
| 工程 | `/projects/`、`/projects/<id>/` | 5 个动手项目：pikachu / bluelotus / phpstudy / ssms / vmware |
| 说说 | `/moments/` | 评论即说说，日常片段 |
| 音乐 | `/music/` | B 站收藏夹歌单，悬浮窗跨页播放 |

---

## 快速开始

```bash
npm install          # 首次安装依赖

npm run server       # 本地预览 http://localhost:4000
npm run build        # 生成 docs/（GitHub Pages 的发布源）：hexo generate → minify → 冒烟检查
npm run clean        # ⚠️ hexo clean 会删掉整个产物目录 docs/，之后必须重新 npm run build

npm test             # 单元测试 69 项
npm run verify       # 结构断言 11 项
npm run verify -- --strict   # 结构 + 基线比对 19 项
```

**改完东西怎么验**：`npm run build` 会在生成后自动跑冒烟检查，**失败即非零退出**。它检查产物文件数、三个生成物字节数、首页排序首项等关键指标，是最省事的回归手段。

**本地预览的两个注意点**

- 改动 `scripts/*.js`、`_config*.yml`、模板后**必须重启 server**，否则预览用内存里的旧版本
- 需要验证"真实产物"时**先停 server** 再 build，避免 server 与 generate 争抢 `docs/`

**改坏了怎么发现**：`npm run verify -- --strict` 会拿产物与基线快照比对（文件数、文章目录数、三个生成物的字节数、首页排序首项）。**正常新增文章或工程后**，用 `npm run verify -- --update-baseline` 刷新基线；其余情况出现基线不符就说明出了问题。

> 判据用字节数、条目数与排序首项，**不要用文件哈希**——Hexo 生成器的输出并不确定，两次全量生成的哈希会不同，但字节数相同。

---

## 目录结构

```
Yibao-web/
├── _config.yml                Hexo 站点配置，permalink: posts/:title/、public_dir: docs
├── _config.nova.yml           主题配置：导航 / 搜索 / 资源注入 / 评论（原 _config.butterfly.yml）
├── package.json               Hexo 8.1.2 + 插件
│
├── scripts/                   Hexo 插件与生成器，只能放这类文件
│   ├── site-config.js         ★ 站点配置单源，SITE 从 _config.yml 读取
│   ├── parts-common.js        ★ 公共壳组装：composeShellTop / buildFooter / composeShell
│   ├── nova-tags.js           ★ 标签页与索引页 + search.xml / sitemap.xml / atom.xml
│   ├── home-generator.js      首页生成器
│   ├── page-generator.js      静态页生成器：music / moments / about / 404
│   ├── projects-generator.js  工程页生成器：列表 + 详情
│   ├── projects-data.js       工程数据：清单 / 封面 / 下载
│   ├── projects-intro.js      工程详情介绍文案
│   ├── inject-theme.js        首帧主题注入 + 首页 hero preload
│   ├── copyright-fields.js    文章版权字段映射
│   └── lib/                   共享模块：date / feeds / sort / project-date / music-playlist / fetch-views
│
├── tools/                     构建与验证工具，hexo 不加载
│   ├── minify.js              构建后 JS 压缩，esbuild
│   ├── smoke.js               冒烟检查 / 结构断言 / 基线比对
│   ├── layout-guard.js        布局回归护栏：真实拉伸 / 横向溢出 / 容器宽度
│   └── lib/public-dir.js      产物目录解析（读 _config.yml 的 public_dir）
│
├── source/                    网站源文件
│   ├── _posts/                13 篇文章 Markdown
│   ├── img/                   图片，按用途分层：hero / music / brand / misc / covers / projects
│   ├── rose-galaxy/           ★ 自研定制层
│   │   ├── css/               每页一个样式文件，类名前缀 nova-
│   │   ├── js/                页面脚本 + lib/ 共享件
│   │   ├── animation/         粒子动画
│   │   ├── fonts/             自托管字体，woff2
│   │   └── vendor/            ★ 本地化的第三方库：fontawesome / pjax / medium-zoom / infinitegrid
│   ├── css/index.css          Butterfly 上游副本，请勿修改
│   ├── css/custom.css         全站覆盖规则的唯一去处
│   └── assets/projects/       工程下载文件，按工程名分包
│
├── themes/nova/layout/        ★ 站点模板层（`_config.yml` 的 theme: nova）
│   ├── base.pug               基础布局：html + head + body（静态页）
│   ├── _partials/             head.pug 统一 head / head-content.pug 共享实现 / helpers.pug
│   ├── parts-common/          ★ 公共组件单源：loading / nav / sidebar / footer / 评论
│   ├── home-parts/ tag-parts/ idx-parts/ project-parts/ page-parts/    各页页级片段
│   ├── 各页面 pug              home / tag / tags-index / projects / project-detail / music / moments / about / 404
│   └── includes/              layout.pug 文章页布局链 + head/ + third-party/
│
├── themes/butterfly/          Butterfly 5.7.0 原版主题（保留未启用，勿当作站点模板改）
│
├── data/                      运行时数据，非 hexo 源
│   ├── views-cache.json       浏览量缓存，配 views-cache.md
│   ├── music-playlist.json    歌单缓存
│   └── refresh-music-playlist.js
│
├── docs/                      ★ 构建产物目录 = GitHub Pages 发布源（main 分支的 /docs）
│   └── index.html 等           hexo generate + minify 的输出，已被 git 跟踪，随 main 一起推
│
├── repository-docs/           仓库文档资源：README 的深浅主题预览图 + 主题升级指南.md，不进产物
│
├── test/                      测试与基线
│   ├── *.test.js              node:test 单测，69 项
│   └── baseline.json          基线比对基准
│
├── README.md                  本文档，面向使用者
├── AGENT.md                   维护手册，面向 AI/Agent
└── CHANGELOG.md               详细变更日志
```

---

## 技术栈

| 层 | 选型 |
| --- | --- |
| 静态生成 | Hexo 8.1.2，Node.js 24 |
| 主题 | **nova**（自研，`themes/nova/`）；`themes/butterfly/` 保留 5.7.0 原版未启用 |
| 自研定制层 | rose-galaxy：首页特效、各页样式、交互脚本 |
| 评论后端 | Waline v2，Vercel serverless + Neon PostgreSQL |
| 字体 | 自托管 woff2 |
| 第三方库 | FontAwesome / pjax / medium-zoom / infinitegrid 均已本地化，见 `source/rose-galaxy/vendor/` |
| 部署目标 | GitHub Pages：直接从 main 分支的 `/docs` 目录发布，根路径 |

---

## 日常维护

### 加一篇文章

**第一步**：在 `source/_posts/` 新建 md 文件。

````markdown
---
title: Markdown 入门指南
date: 2026-08-17 00:00:00
tags:
  - Markdown语法
order: 3
---

# Markdown 入门指南

Markdown 概述、工作原理以及用途。

## Markdown 是什么？

Markdown 是一种轻量级的标记语言……
````

**可用字段**

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 文章标题，显示在页面、卡片、feed |
| `date` | 是 | 发布日期，决定文章排序。URL 由站点 `permalink: posts/:title/` 决定，不含日期 |
| `order` | 否 | 首页精选记录排序，数字小在前。不填则排在最后 |
| `tags` | 否 | 标签列表，决定归属的标签页 |
| `author` | 否 | 底部版权卡"文章作者"文本，可带朝代如 `[魏晋]曹植`。留空显示站点名 |
| `url` | 否 | 底部版权卡"文章链接"指向的来源，作者名链接同步跟随。填"无"则显示为"无" |
| `description` | 否 | 卡片摘要。不填则取正文首段，去 Markdown 符号后截 90 字 |

**第二步**：`npx hexo generate --force`（**不要用 `hexo clean`**——它会删掉整个产物目录 `docs/`，删完必须重新构建）。

**自动完成的事**：文章页生成、标签页更新或新建、`/articles/` 索引更新、`search.xml` / `sitemap.xml` / `atom.xml` 更新。填了 `order` 还会自动上首页。

### 加一个工程

> 工程板块由一个数据文件驱动，维护时只改数据 + 放素材，不需要手写页面。

**第一步**：在 `scripts/projects-data.js` 的 `projects` 数组末尾追加。

```js
{
  id: 'my-project',                 // 详情页路由名，唯一，小写加连字符
  title: '我的项目',
  category: '安全工具',              // 列表页显示的分类（现有：虚拟机 / 数据库 / Web 环境 / 安全工具）
  categoryKey: 'sec',               // 分组键，与 category 配套（现有：vm / db / web / sec）
  subtitle: '一句话副标题',
  date: '2026-08-27',               // 发表于，可省略
  description: '列表卡片简介，两行左右',
  tags: ['SQL 注入', 'XSS'],
  intro: '详情页介绍正文，支持段落，建议 300-500 字',
  cover: '/img/projects/my-project.webp',
  link: 'https://github.com/...',   // 源工程链接，可无
  linkLabel: 'GitHub',
  downloads: [                      // 下载文件，可无（现有 5 个工程都是空数组，模板会自动隐藏该区块）
    { name: '工具包.zip', url: '/assets/projects/我的项目/工具包.zip', sizeLabel: '12.4 MB', desc: '说明' }
  ]
}
```

**第二步**：放两张图，转成 webp 后质量压到 80 左右。

- 列表封面：`source/img/projects/my-project.webp`，比例 3:2，如 1200×800
- 详情演示图：`source/img/projects/demo-my-project.webp`，比例 16:9，如 1280×720

**第三步**：需要下载文件的话，放到 `source/assets/projects/我的项目/`，文件名与 `downloads[].url` 一致。

**第四步**：`npx hexo generate --force`（**不要用 `hexo clean`**，理由同第二步）。列表卡片、详情页、右栏"其他工程"、概览统计都会自动更新。工程不进 feed，`search.xml` / `sitemap.xml` / `atom.xml` 不含工程。

### 换页面背景图

1. 图片放进 `source/img/hero/`
2. 在对应的页级样式 `source/rose-galaxy/css/{page}-page.css` 里改 `#page-header` 或 `.nova-hero-bg` 规则
3. 提升该 css 的版本号，防止访客拿到缓存

> **首页的深浅两张海报**（`night.webp` / `day.webp`）不在 `.nova-hero-bg` 上直接写图片，而是各挂一个主题变量：深色写 `--nova-hero-bg:url(night)`、浅色写 `url(day)`。这样浏览器只会下载当前主题那一张；另一张等你切换主题时才加载，并保留原有的交叉淡入过渡。换图只改变量里的文件名即可，**不要**给 `::after` 补背景图，那会让两张海报都被下载。

### 换页脚横幅

替换 `source/img/hero/archive-bg.webp`，保持文件名不变。要改颜色就改 `custom.css` 里的深浅两套规则。

> ⚠️ 不要在页级 css 里定义 footer 背景。历史上因为各页内联 `background-image` 覆盖，出现过横幅消失和重复平铺。

### 改站点文案

| 文案 | 位置 |
| --- | --- |
| 站点名、描述、作者 | `_config.yml` 的 `title` / `description` / `author` |
| 首页标题与描述 | `themes/nova/layout/home.pug` 的 `headOpts`，需与 `_config.yml` 保持一致 |
| 各页标题与描述 | 对应页面 pug 的 `headOpts` |
| 页面顶部题记 | 对应 `*-parts/top.html` |
| 首页 hero 文案 | `themes/nova/layout/home-parts/top.html` |

### 升级版本号

改 `_config.yml` 的 `version:` 一行，生成器和动态模板会自动跟随。但 `_config.nova.yml` 与 html 片段里的字面量没有插值能力，需要手动同步搜索 `?v=`。

> 文件内容变更后必须提升版本号，否则访客会拿到旧资源。

### 更新浏览量

部署前运行 `node scripts/lib/fetch-views.js`，它从 busuanzi 抓取各页真实访问量写入 `data/views-cache.json`。想手动调数字就编辑该文件 `pv` 段，下次抓取会在其上累加真实增量，不会覆盖。详细说明见 `data/views-cache.md`。

### 发一条说说

管理员在说说页评论区留言即可，`moments-feed.js` 会把站长评论渲染成说说卡片。判定条件是三重匹配：`user_id=1`、昵称 Yibao、administrator 标记。

说说流只在页面加载和 PJAX 切页时拉取，没有轮询。新发说说后刷新页面即可看到。

---

## 各版块逻辑

### 文章系统

文章源在 `source/_posts/*.md`，由 Hexo 渲染为 `/posts/<标题>/`。标签链接由 Hexo 按 `tag_dir: articles` 自动生成。

### 标签与索引

由 `scripts/nova-tags.js` 生成，模板是 `tags-index.pug` 与 `tag.pug`。输出两个层级：

```
/articles/index.html          标签索引，含卡片与统计
/articles/<标签>/index.html    每个标签页：hero / 统计 / 文章卡片 / 相关标签 / 阅读顺序 / 侧边栏
```

自动派生的数据：

| 数据 | 来源 |
| --- | --- |
| 卡片摘要 | 优先 front matter `description`，否则正文首段去 Markdown 符号后截 90 字 |
| 卡片封面 | 按标签推断：Go 系→tech-go、MySQL 系→tech-mysql、算法系→tech-algorithm、其他→tech-notes |
| 统计、相关标签、阅读顺序 | 全自动计算 |

加新标签只需在文章的 `tags` 里写一行，构建后 `/articles/新标签/` 自动出现。

### 搜索与订阅

同一个生成器输出三个文件：

| 文件 | 内容 | 用途 |
| --- | --- | --- |
| `search.xml` | 全部文章的纯文本索引 | 站内本地搜索 |
| `sitemap.xml` | 文章 URL + 更新日期 | SEO |
| `atom.xml` | Atom feed | 订阅 |

搜索索引会剔除代码块与内联代码，摘要从命中位置附近截取约 120 字符，对话框内两行截断，因此摘要永远不会显示源码。`hexo-generator-feed` 已卸载，避免与生成器重复输出。

音乐歌单也会进搜索索引，每首歌是独立条目，点击可通过 `?song=<bvid>` 直达定位播放。

### 首页

首页由 `home.pug` 加 `scripts/home-generator.js` 渲染，三大区块的数据全部动态生成，模板只负责骨架，卡片通过占位注释注入。

| 区块 | 取数规则 |
| --- | --- |
| LATEST SIGNAL | 工程与文章合并后取"最近提交"第 1 名，带 `[工程]` 或 `[文章]` 标记 |
| 精选工程 | 按浏览量与更新时间排序取前 3，左大卡 + 右侧两小卡 |
| 最新文章 | 按更新时间与浏览量排序取前 6，两列三行 |

排序统一使用「更新时间降序 → 浏览量降序 → 标题升序」三级 tie-break，保证批量更新或浏览量同值时结果稳定。

数据来源：

- **浏览量**：`data/views-cache.json` 的 `pv` 段，等于 busuanzi 真实值加人工偏移
- **文章更新时间**：Hexo 原生 `updated`，md 里没写就取文件最后修改时间
- **工程更新时间**：优先 `projects-data.js` 的 `updated` 字段，其次取 `source/assets/projects/<工程名>/` 目录内最新文件的 mtime，最后回退 `date`。所以更新工程只要替换目录里的文件，日期自动变化

静态骨架在 `themes/nova/layout/home-parts/{top,mid,bottom}.html`，改动时请保持占位注释与 DOM 结构。卡片 HTML 由 `home-generator.js` 的 `featuredCardsHtml` / `recentCardsHtml` / `latestSignal` 拼装。

### 工程板块

`/projects/` 列表页与 `/projects/<id>/` 详情页都由 `projects-generator.js` 生成。数据来自 `projects-data.js` 与 `projects-intro.js`，封面图在 `source/img/projects/`，下载文件在 `source/assets/projects/<工程名>/`。

详情页包含 hero、发表于与更新于、浏览量、评论数、演示图、介绍正文、工程链接按钮、资料下载列表，以及独立的 Waline 评论区。列表页包含概览统计与三列卡片。

### 主题切换

**只按时间决定，不读任何持久记忆**：7:00–17:59 浅色，18:00–6:59 深色，按访客本地时间，定时器精确排到边界原地切换。

手动切换按钮在任意页的 `#darkmode`，**仅当前会话有效**：写入 sessionStorage，会话内导航保持，关闭浏览器即清空。各页 `<html>` 后的首帧脚本同样只按时间，避免先深后浅的闪烁。

### 导航栏

除首页外全站统一，以音乐页为基准：

| 状态 | 样式 |
| --- | --- |
| 高度 | 68px |
| 未滚动 | 全透明，透出各页 hero |
| 浅色滚动后 | 保持全透明 |
| 深色滚动后 | 深色毛玻璃条，`rgba(7,10,20,.72)` 加 blur 18px |

当前页高亮由 `nova-ux.js` 的 `syncMenuActive()` 按路径匹配加 `.active` 类，桌面端作用在 `#nav`，移动端作用在 `#sidebar`，PJAX 切页自动更新。"文章"菜单覆盖 `/articles/`、标签页与文章详情页三处。

首页因为 `nova-home-active` 类而使用独立的悬浮透明导航。

### 页面路径总览

| 路径 | 内容 | 样式文件 |
| --- | --- | --- |
| `/` | 首页 | `nova-home.css` |
| `/articles/` | 文章标签索引 | `tag-page.css` |
| `/articles/<标签>/` | 标签页 | `tag-page.css` |
| `/posts/<标题>/` | 文章详情 | `nova` 的 `includes/layout.pug` + `custom.css` |
| `/projects/` | 工程列表 | `projects-page.css` |
| `/projects/<id>/` | 工程详情 | `project-detail-page.css` |
| `/music/` | 音乐播放 | `music-page.css` |
| `/moments/` | 说说 | `moments-page.css` |
| `/about/` | 关于 | `about-page.css` |
| `/404.html` | 404 | `custom.css` |

### 评论系统

后端是 Waline v2，部署在 Vercel，数据存 Neon PostgreSQL，管理后台在 `{serverURL}/ui/`。配置位于 `_config.nova.yml` 的 `comments.use` 与 `waline.serverURL`。

评论按页面 `path` 存储，所以**页面路径变更后旧评论不会迁移**，需要迁移的话得在数据层操作。

说说页的"评论即说说"逻辑在 `moments-feed.js`：分页拉取全部评论，把站长的评论渲染成说说卡片。元数据行如「心情:」「地点:」会被识别为标签，emoji 整块保留，最新一条标 LATEST。说说流固定展示 3 条、区域内滚动，右侧「最近状态」是本地收藏列表，存在 `localStorage` 的 `nova-moments-mood-v2`，服务端已删除的说说的收藏会自动清除。

站长自己的评论在本次会话内保持可见可管理，刷新后隐藏。

### 样式分层约定

改样式前先对号入座，三个层的职责是分开的。

| 层 | 文件 | 规则 |
| --- | --- | --- |
| 上游基座 | `source/css/index.css` | Butterfly 副本，文件头已标注"请勿修改" |
| 全站覆盖 | `source/css/custom.css` | 覆盖规则的唯一去处，分段用 `/* ---- 段名 ---- */` 注释 |
| 页级 | `source/rose-galaxy/css/{page}-page.css` | 每页一个文件，类名前缀 `nova-` |

设计令牌集中在 `custom.css` 的 `:root`，比如 `--nova-rose` 与 `--font-serif`，改主题色或字体只需要动这里。

---

## 文档索引

| 文档 | 面向 | 内容 |
| --- | --- | --- |
| `README.md` | 使用者 | 本文档：怎么用、怎么加内容、各版块怎么运作 |
| `AGENT.md` | AI / Agent | 维护手册：架构事实、操作守则、工程坑、排障清单 |
| `CHANGELOG.md` | 追溯者 | 详细变更日志，逐条改动与文件清单 |
| `repository-docs/主题升级指南.md` | 维护者 | nova 主题维护指南：结构、每类文件来源、维护方式 |
| `data/views-cache.md` | 维护者 | 浏览量缓存的字段含义与手动调整方法 |

---

## 历史记录

Yibao-web 从一份静态站导出产物，长成现在这个带生成器、双主题与自研交互层的个人站点，前后约一个月。

下表按时间倒序记录每个阶段**读者能感知到的变化**；逐条改动与实现细节见 `CHANGELOG.md`。

| 时间 | 阶段 | 主要变化 | 效果 |
| --- | --- | --- | --- |
| 09-11 | 结构化改造 | 清死代码、修 6 个真实缺陷、建测试护栏；第三方库转同源自托管；9 张图重新压缩；首页大图按主题预加载；粒子发光改缓存纹理；删除孤儿图片 | 首屏大图加载起点 **8.4 秒 → 0.2 秒**；外部域名请求 **7 → 2**；图片合计 **1.94 MB → 1.07 MB**；护栏 **68 项单测 + 18 项断言** |
| 09-05 | 切页伪影修复 | 站内无刷新跳转会闪出一层玫瑰色蒙版，根因是全屏层过渡动画的首帧；改为切换期间冻结过渡、就绪后解锁；工程按钮换官方标识 | 跳转瞬间不再有整屏色块闪过 |
| 09-04 | 说说页与首屏 | 说说页重做：评论区的管理员留言直接变成说说卡片，带标签识别与收藏；首屏遮罩时长减半，六个页面 hero 图预加载 | 说说由手工维护变为**评论即发布**；消除"先见裸页面再上样式" |
| 09-03 | 收敛重复 | 页面级样式只留一处来源，删掉并行注入机制；工程日期、主题色、字体收敛到单一出处；大图全面 WebP 化 | 改一处即全站生效；单张图最大 **4.1 MB → 215 KB** |
| 09-02 | 无刷新导航 | 站内跳转不再刷新页面，音乐跨页不断播；音乐页加可拖动悬浮窗；音乐进入搜索，每首独立成条；概览统计改四栏 | 浏览连贯；**音乐可搜索并直达播放** |
| 08-31 | 古典诗赋入库 | 新增 5 篇辞赋与 2 首词；赋文楷体排版、译文折叠；版权卡按正文元数据显示作者与出处 | 内容从技术笔记扩展到古典文学 |
| 08-28 | 细节收尾 | 站点名在透明与滚动两态对齐；音乐悬浮窗记忆改为会话级；首页粒子统一为深色一套 | 去掉滚动时轻微下坠；删数百行死代码 |
| 08-27 | 首页改版 | 首页改为数据驱动：精选工程按浏览量取前三、最新文章按更新日期取前六；接入真实浏览量并支持人工偏移；工程更新日期取资产文件时间 | 首页**零手工维护**；换文件即自动更新日期 |
| 08-26 | 工程板块上线 | 新增工程列表与每个工程的详情页：顶部大图、演示图、工程介绍、源码链接、资料下载；首帧尺寸全部内联占位 | 首批 **5 个工程**上线；首次进入与刷新表现一致 |
| 08-21 ~ 08-23 | 阅读与性能 | 构建后压缩 JS；URL 编码规范化；首屏加载层改为每会话只弹一次并等背景图就绪；阅读模式独立配色；部署目标修正 | JS 体积近乎减半；加载不再闪烁 |
| 08-22 | 评论系统 | 接入自建评论后端，文章页与各页面开启评论与评论数；说说页改为评论驱动 | 站点开始有访客互动 |
| 08-21 | 粒子系统重做 | 首页粒子从静态尘埃改为有性格的动画：深色加入星座连线，浅色收敛为浅蓝尘埃与星芒；修掉切主题不重建、连线变量未定义两个缺陷 | 首页视觉核心成型 |
| 08-19 ~ 08-20 | 视觉与交互定稿 | 主题策略定调为**按时间自动明暗**（18:00–6:59 深色），手动切换仅当前会话；导航当前页高亮；侧栏改为同标签其他文章；标签页与文章侧栏修复 | 观感与交互统一，不再有"半成品"页面 |
| 08-15 ~ 08-19 | 从静态导出到 Hexo 工程 | 23 篇 HTML 反推为 Markdown 并整批换成自有内容；站点改为构建生成；九份重复的 head 合并为一个模板；标签页与索引页自动化，同时输出搜索索引、站点地图与订阅源；路径迁移为 `/articles/` 与 `/posts/<标题>/` | 从"手工改 HTML"变为**可持续维护的工程** |

---

## 相关仓库

线上仓库 `yibao11/yibao11.github.io`，**本地就是这一个仓库**（单仓自包含，克隆它即可完成「构建 → 提交 → 上线」）：源码与产物都在 `main` 分支上，**GitHub Pages 直接以 `main` 分支的 `/docs` 目录为发布源**。

| 位置 | 内容 | 说明 |
| --- | --- | --- |
| 本仓 `main` 分支 | 源码（`scripts/` `source/` `themes/` `_config*.yml`） | 所有改动都在这里做 |
| 本仓 `docs/` 目录 | GitHub Pages 产物（`npm run build` 生成的静态站） | 已被 git 跟踪，随 `main` 一起推；**只有它会改变线上页面** |

上线 = 构建后把 `main` 提交推送（产物已在 `docs/` 里，与源码同一个提交一起走），Pages 会自动重建。**`hexo deploy` 已弃用**，不要再走"推产物分支"那条老路。

> 评论后端 Waline 是**另一个独立仓库**，已部署在 Vercel；本站只通过 `_config.nova.yml` 的 `waline.serverURL` 按 URL 引用它，克隆本仓不依赖它。
