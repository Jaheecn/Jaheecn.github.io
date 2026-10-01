# Yibao-web 维护文档

> 本文件主要面向 **AI/Agent 维护者**:架构事实、改动纪律、部署流程、工程坑。
> 操作者必须遵守,避免误触误删;人类用户看 `README.md` 或本地预览(仓库根目录下 `hexo server -p 4015`)即可。
> 线上发布仍须用户逐次明确批准;GitHub 提交注释用**英文简洁**风格。

---

## 开工先读这一节

**工作位置**(2026-10-01 更新: 单仓自包含, 勿沿用旧的并列多仓称法):

本仓(**仓库根目录**, 即含 `package.json` 的这一层)就是完整产品链路, 克隆这一个仓库即可完成「构建 → 提交 → 上线」:

| 位置 | 角色 | 能否修改 |
| --- | --- | --- |
| 本仓(**单分支 `main`**) | **源码 + 产物**:源码在 `scripts/`/`source/`/`themes/`, 产物在 `docs/`(已被 main 跟踪) | ✅ **所有改造在这里做**；改完推 `origin main`, 源码与产物一起走 |
| 线上发布 | **GitHub Pages 直接以本仓 `main` 分支的 `/docs` 目录为发布源** | 产物由构建生成；**上线只由 `docs/` 的内容决定** |
| 独立仓库(Waline 后端, Vercel) | **后端**, 不在本仓 | 仅评论后端改动时动；前端按 URL 引用它, 通常不必动 |

**本地预览**:仓库根目录下 `.\node_modules\.bin\hexo.cmd server -p 4015` → <http://127.0.0.1:4015/>
(`hexo server` 是**动态渲染**,直接读 `source/`,改完刷新即见；改 `.pug`/`_config`/`scripts` 后须重启 server)

> 仓库之外的任何副本(临时试验区、快照)都属于**临时工作区**, 不属于产品链路。产品事实只记在本文件, 临时工作区的细节不写在这里。

**改完必跑的三道护栏**:

```bash
npm run build                  # hexo generate → minify → 冒烟(11 项, 失败即非零退出)
npm test                       # 69 项单元测试
npm run verify -- --strict     # 19 项(结构断言 + 基线比对)
```

**关键判据**:`docs/` **123** 文件 · `posts/` **13** 目录 · `search.xml` **138,155** · `sitemap.xml` **2,815** · `atom.xml` **9,524** · 首页 LATEST SIGNAL `[文章] 变声器操作记录 @ 2026-10-01` · 精选工程顺序 `pikachu → bluelotus → phpstudy`

> ⚠️ 判据只看**字节数/条目数/排序首项**,**不要用文件哈希** —— hexo 生成器输出不确定,两次全量生成哈希不同但字节数相同。

**三个最容易踩的纪律**(详见 Hexo 工程坑):

1. 改 `scripts/*.js`、`_config*.yml`、**模板 `.pug`** 后 **必须重启 server**,否则预览用内存旧版本
2. 改模板后 `npm run build` **不会重生成所有页面**(增量缓存),要 `hexo generate --force`
3. 编辑文件前**先停 server**(Windows 文件锁会报 `ReplaceFileW EIO`)

---

## 目录

- [开工先读这一节](#开工先读这一节)
- [Agent 操作守则(零容忍项)](#agent-操作守则零容忍项-违反误触)
- [架构总览](#架构总览)
- [目录职责详解](#目录职责详解)
- [配置图鉴](#配置图鉴)
- [样式规范](#样式规范)
- [构建与部署](#构建与部署)
- [发布审批规则](#发布审批规则)
- [Hexo 工程坑(务必阅读)](#hexo-工程坑务必阅读)
- [常见任务](#常见任务)
- [排障清单](#排障清单)

---

## 架构总览

```
hexo 加载 scripts/*.js(插件/生成器) + themes/nova/layout/*.pug(模板, 站点主题)
        └─ 生成器组装 body: parts-common 组件 + 各页 *-parts 纯页级内容
              └─ pug 输出 shellTop/shellBottom -> 完整页面
```

| 页面类型 | 组装者 | 页级内容来源 | 模板 |
| --- | --- | --- | --- |
| 静态页(音乐/瞬间/关于/404) | `page-generator.js`(composeShell) | `page-parts/{name}.html`(纯 main 内容) | 各页面 pug |
| 首页 | `home-generator.js` | `home-parts/{top,mid,bottom}.html` + `page-scripts.html` | `home.pug` |
| 文章索引/标签 | `nova-tags.js` | `idx-parts/top.html`、`tag-parts/{top,bottom}.html` | `tags-index.pug`/`tag.pug` |
| 工程列表/详情 | `projects-generator.js` | `project-parts/top.html` | `projects.pug`/`project-detail.pug` |
| 文章详情 | Hexo 原生 post 渲染 | — | `nova` 的 `post.pug` + `includes/layout.pug` 链 |

**公共壳要点**（`scripts/parts-common.js`）：

- `composeShellTop({pageClass, headerCls, headerStyle, siteData, pre, closeHeader})` → loading + 背景层(web_bg) + sidebar(统计卡插槽) + `body-wrap` 开 + `header` 开 + nav；`closeHeader:false` 表示 header 由页级(模板/parts)闭合；**页级 CSS 已全量全局注入**(butterfly.yml inject.head, A 方案 2026-09-03, 不再随内容注入)
- `buildFooter({hideExtra, showExtra, pageScripts, withFooter})` → footer 主体(可关,首页自定义页脚)+ rightside(按钮插槽)+ 公共脚本群 + **页级脚本插槽**(js-pjax 内 mermaid 之后)+ local-search
- `composeShell(opts)` 静态页完整壳(header 恒空、main 内容传入)
- 插槽标记：`<!--NOVA-SITE-DATA-->` / `<!--NOVA-RIGHTSIDE-HIDE--|SHOW-->` / `<!--NOVA-PAGE-SCRIPTS-->` / `<!--NOVA-LATEST-->`(首页最新文章,由 home-generator 动态注入) / `<!--NOVA-COMMENT-CORE-->`(评论内核, page-generator 注入 comment-core.html, C9)

---

## 目录职责详解

### `scripts/`（hexo 插件/生成器，**只能放这类文件**）

| 文件 | 职责 |
| --- | --- |
| `site-config.js` | Node 构建期配置单源：`SITE`(从 `_config.yml` 的 url 解析，**顶层不碰 hexo**——见 Hexo 坑①) |
| `parts-common.js` | 公共壳组装函数 + 组件读取(loading/sidebar/nav/footer/评论/按钮) |
| `nova-tags.js` | 标签/索引页 + `search.xml`/`sitemap.xml`/`atom.xml` 生成器；`fmtDate` 来自 `lib/date.js`；search.xml 含歌曲条目(构建期抓取) |
| `lib/music-playlist.js` | 音乐歌单(搜索索引数据源)：构建时请求 B 站云函数 `/api/playlist`，成功回写 `data/music-playlist.json` 缓存，失败用缓存兜底；加减歌曲零人工 |
| `home-generator.js` | 首页：shellTop + hero 段(LATEST 动态注入)+ mid(精选工程/最新文章卡注入)+ 页级 bottom + 公共尾；P5 数据规则见「首页 P5 数据流」 |
| `page-generator.js` | 静态页：PAGES 配置表(pageClass/headerCls/mainCls/pre/showExtra/pageScripts) |
| `projects-generator.js` | 工程页：列表 + 详情(下载链接由 `SITE + encodeURI(url)` 生成)；更新日期统一走 `lib/project-date.js` |
| `lib/project-date.js` | 工程更新日期**唯一实现**(A1)：显式 `updated` → **资产路径的 git 最后提交日** → 目录内最新文件 mtime → 目录 mtime → `date` 兜底；列表/首页 LATEST SIGNAL 共用 |
| `post-date.js` | 文章更新日期**唯一实现**(2026-09-13)：显式 `updated` → **源文件 git 最后提交日** → mtime → `date` 兜底。用 `after_post_render` 过滤器改写 `post.updated`，于是 head 的 dateModified、首页排序、feed 自动一致。判定链与 `lib/project-date.js` 同构 |
| `projects-data.js` / `projects-intro.js` | 工程数据(5 个工程)/ 详情介绍文案(自包含) |
| `lib/fetch-views.js` | **浏览量抓取器(部署前手动运行)**：busuanzi API 带 Referer 查询各页真实 page_pv → 写 `data/views-cache.json`；24h 缓存、单条失败跳过、手动修改自动保留偏移 |
| `data/views-cache.json` | 浏览量缓存(**在 `data/`, 不在 `scripts/`**)：`pv`(显示值=排序用) / `shift`(人工偏移) / `lastRaw`·`lastDisplay`(脚本维护)。**手动改只动 `pv` 段**，详见 `data/views-cache.md` |
| `inject-theme.js` | 首帧主题注入(injector head_begin, 各页) + **首页 hero 海报按主题 preload**(night/day, P0 2026-09-11)。**只 preload 当前主题那一张**:另一张由 `nova-ux.js initHeroThemeSwap` 在切主题时按需加载(单图策略 2026-09-13, 见操作守则 8) |
| `lib/date.js` | `fmtDate`(支持 moment 对象与 Date) |
| `lib/feeds.js` | `search.xml`/`sitemap.xml`/`atom.xml` 三件套生成器 + `stripMd`/`summaryOf`/`escXml`/`htmlToText`/`postUrl`(阶段4 4.8 从 `nova-tags.js` 拆出) |
| `lib/sort.js` | `toMs` + `byKeys` 排序工具(阶段4 N) |
| `copyright-fields.js` | 文章 footer matter `author`/`url` → 主题版权卡字段映射 |

> **构建/验证脚本不在 `scripts/`**：`tools/minify.js`(JS 压缩)、`tools/smoke.js`(冒烟/结构断言/基线比对)。原因见 Hexo 坑②——`scripts/` 下的 js 会被 hexo 全部执行。

#### 首页 P5 数据流(生成时全重算, 均无需维护)

- **排序链(确定性 tie-break)**：`updated 降序 → 浏览量降序 → 标题升序`(localeCompare 'zh');批量更新/浏览量同值时结果稳定。
- **LATEST SIGNAL** = 工程+文章合并按上链取第 1 名(带 `[工程]`/`[文章]` 标记)。
- **精选工程** = 工程按 `浏览量降序 → updated → 标题` 取前 3(lead + 2 side,封面=`/img/projects/*.webp`)。
- **最新文章** = 文章按 `updated → 浏览量 → 标题` 取前 6(2 列 3 行)。
- **浏览量**：`views-cache.json` 的 `pv` 段(= busuanzi 真实值 + 人工偏移);缺失时兜底 `projects-data.js` 的 `views` 字段(可选)。
- **文章 updated**：由 `scripts/post-date.js` 统一改写(判定链与工程侧同构)：front matter 显式 `updated` → **源文件 git 最后提交日** → mtime → `date` 兜底。文章页 head 的 `dateModified`/`article:modified_time`、首页 LATEST SIGNAL 与"最新文章"排序都读这个值。
  > ⚠️ **不要再依赖 hexo 的 `updated_option: mtime`** —— 它把"文件最后修改时间"当更新时间，而 mtime 记录的是**文件被复制/检出**的时刻、不是内容改动的时刻。实测(2026-09-13)：`LM-Studio-OpenCode 接入指南` 的 mtime 是 09-13，真实最后提交是 **08-31**(偏晚 13 天)；13 篇文章的 mtime 只聚成 3 个值(被成批复制的特征)；换机器/re-clone/CI 干净检出后全部文章的 mtime 会一起重置，`dateModified` 集体漂到同一天。
  > 代价与工程侧一致：**改完文章要 commit，日期才会前进**(与"改 → 提交 → 部署"的工作流一致)。无 git 时自动回退 mtime，不抛错。
- **工程 updated**：`projects-data.js` 的 `updated:` 字段(可选) > **该工程资产目录的 git 最后提交日** > 目录内最新文件的 mtime > `date` 兜底。工程页概览第 4 栏"最近更新"与首页 LATEST SIGNAL 的工程日期统一读此链。
  > **注意路径是"资产目录"而非介绍文案**：判定看 `source/assets/projects/<工程名>/`(由 `downloads[0]` 的 href 推出)。所以**只改 `projects-intro.js` 的介绍文案不会让日期前进**，必须动资产文件并 commit。

### 日期怎么更新（操作指引）

两条链都是"**提交才生效**"——② 优先于 ③ mtime，所以只改文件不 commit，日期不会变。有意的：契合"改 → 提交 → 部署"的工作流，也避免 mtime 那种"换个机器日期就全乱"。

| 目的 | 做法 |
|---|---|
| **改文章后让日期自动前进** | `git add -A && git commit` → `npm run build`。日期 = 这个 `.md` 的提交日 |
| **改工程后让日期自动前进** | 替换/新增 `source/assets/projects/<工程名>/` 里的文件 → commit → build。无需改代码 |
| **想指定某一天(不靠提交时间)** | 文章：front matter 写 `updated: 2026-09-01`；工程：`projects-data.js` 条目写 `updated: '2026-09-01'`。① 优先级最高，立即生效 |
| **改了文件但不想/不能 commit** | 同上，只能靠显式 `updated:` |

> ⚠️ **一次提交动多篇文章 ⇒ 它们的 `dateModified` 会是同一天**(都用那次提交日)。
> 这跟旧 mtime 方案的"日期成批聚集"看着像，但成因不同：mtime 的聚集是**假象**(文件被复制/检出，内容没改)，
> 现在的聚集是**真实的**(你确实在同一次提交里改了它们)。不想要就分开提交，或用显式 `updated:`。

**验证方法**（改完日期后自查）：
```powershell
# 看某篇文章最终的 updated 取自哪里
git log -1 --format=%cI -- "source/_posts/<标题>.md"
# 看某工程的资产提交日
git log -1 --format=%cI -- "source/assets/projects/<工程名>/"
# 看产物里实际写进去的值
Select-String -Path .\docs\posts\<标题>\index.html -Pattern 'dateModified'
```
- **概览统计条数据**：文章索引(/articles/)四栏 = TOPICS 主题总数 / ARTICLES 文章总数 / TOP TOPIC(最多文章主题+名称) / LATEST UPDATE(最新文章日期+标题)，数值由 `nova-tags.js` 注入；工程页(/projects/)四栏 = PROJECTS 项目总数 / TAGS 技术标签 / TOP PROJECT(真实 pv 最高的工程，pv 数字+工程名) / LATEST UPDATE(更新日期+工程名)，由 `projects-generator.js` 计算(真实 pv 取 `views-cache.json` 的 `lastRaw` 段；全部为 0 时第 3 栏兜底显示最新更新工程)。
- **卡片注入**：mid.html 的 `<!--NOVA-FEATURED-->`/`<!--NOVA-RECENT-->` 与 top.html 的 `<!--NOVA-LATEST-->` 占位由生成器 `split().join()` 替换;卡片 HTML 拼装在 `home-generator.js` 的 `featuredCardsHtml`/`recentCardsHtml`/`latestSignal`。

### `themes/nova/layout/`（站点主题，`_config.yml` 的 `theme: nova`）

- `base.pug`：html/head(参数化)/body；`_partials/head.pug`：统一 head；`_partials/head-content.pug`：head 共享实现(首帧脚本/GLOBAL_CONFIG/注入)；`_partials/helpers.pug`：模板共享函数
- `parts-common/`：公共组件(见上)；`*-parts/`：各页纯页级片段；`page-parts/`：静态页纯 main 内容
- `includes/`：`layout.pug` 文章页布局链 + `head/` + `third-party/`(文章详情页渲染走这里，勿删)
- `themes/butterfly/`：Butterfly 5.7.0 原版主题，**保留但未启用**，勿当作站点模板改

### `source/`

- `img/` 按用途分层：`hero/`(页面横幅背景) `music/`(音乐页资源) `brand/`(品牌头像图标) `misc/`(杂项+站点预览图) `covers/`(文章封面) `projects/`(工程图)
- `rose-galaxy/`：自定义层——`css/`(每页一个样式文件,前缀 `nova-`)、`js/`(页面脚本 + `lib/` 共享件)、`animation/`(动画脚本)、`fonts/`(自托管字体)
- `assets/projects/<工程名>/`：下载文件(与页面路由 `projects/` 隔离,避免命名空间冲突)
- `css/index.css`：**上游 Butterfly 副本，勿改**；`css/custom.css`：全站覆盖唯一去处

### `tools/`（构建与验证工具，hexo 不加载）

- `minify.js`：构建后 JS 压缩(esbuild)，`npm run build` 自动跑
- `smoke.js`：冒烟检查 / 结构断言 / 基线比对；也是 `npm run verify [-- --strict]` 的实现
- `layout-guard.js`：布局回归护栏（CDP 无头实测：真实拉伸 / 横向溢出 / 容器宽度），`--baseline` 写基线
- `lib/public-dir.js`：产物目录解析（读 `_config.yml` 的 `public_dir`，现为 `docs`）—— 凡需读产物的脚本都走它，勿硬编码目录名

> 一次性/历史补丁脚本放 `scripts/` **会污染源文件**（hexo 执行该目录全部 js，见 Hexo 坑②）。历史上那些 `convert_*`/`patch_*`/`slice_*` 脚本已随 `py-tools/` 目录一并移除，**不要再往 `tools/` 或 `scripts/` 放一次性脚本**。

### `data/`（运行时数据，非 hexo 源）

- `music-playlist.json`：歌单缓存(构建期由 `lib/music-playlist.js` 抓取回写, 失败兜底)
- `refresh-music-playlist.js`：手动刷新歌单缓存(离线预取/调试)
- `views-cache.json` / `views-cache.md`：浏览量缓存 + 维护说明(`lib/fetch-views.js` 使用)

### `test/`（测试与基线）

- `*.test.js`：`node:test` 单元测试，**69 项**（`npm test`；2026-10-01 实测 **69 pass / 0 fail**）
- `baseline.json`：基线比对基准（`publicFiles` / `postDirs` / 三 xml 字节数 / LATEST SIGNAL / 精选工程顺序）
  → 有意变更后用 `npm run verify -- --update-baseline` 刷新；**刷新时机必须在删除临时目录之后**，否则基线会残留错误数字

> ⚠️ `project-date.test.js` 的「git 最后提交日生效(与 git log 动态对比)」用 `hasGit()` 探测当前目录是否为 git 仓库。**在本仓里跑 `npm test` 恒为 69 pass / 0 skipped**（本仓是真实 git 仓库）；2026-10-01 曾实测 **67 pass / 1 fail**：`test/project-date.test.js:111`「返回值必须是 YYYY-MM-DD 或原样 date(供模板做 datetime 属性)」引用的还是改名前的老工程目录 `琛光无人机`（`source/assets/projects/` 下已无该目录），`projectUpdated()` 返回空串；已把该用例指向现存工程目录，现为 **69 pass / 0 fail**（用例若引用某个工程目录，该目录必须真实存在）。另：已无"副本目录缺 `.git` 导致 67 pass"的情况。

### `docs/`（★ 构建产物目录 = GitHub Pages 发布源）

- **`hexo generate` 直接输出到这里**（`_config.yml` 的 `public_dir: docs`），`npm run build` 之后还会被 `tools/minify.js` 就地压缩（不改文件数）；产物**已被 git 跟踪**，随 `main` 一起提交推送 —— GitHub Pages 直接以 **main 分支的 `/docs` 目录**为发布源，**`docs/` 里有什么，线上就有什么**。
- 纪律：**不要把非产物文件放进 `docs/`**（`.nojekyll` 是必需的例外）；`public/` 目录**已永久退役**，不要再手工创建它或往里搬东西。
- **仓库文档资源不在产物里**：README 的深浅主题预览图（`preview-dark.png` / `preview-light.png`，2026-09-03 由 source 移出并更新为当前首页截图）与 `主题升级指南.md`（**nova 主题维护指南** —— nova 的结构、每类文件来源与维护方式，阶段6 主题迁移的产出；文内提到生成用的 `_snapshots/` 核算脚本已于 2026-09-13 随快照目录删除，需重算时按文内说明重建）现放在**仓库根目录的 `repository-docs/`**，不进产物、不会被 Pages 发布。
  → 它们原先与产物混在同一个 `docs/` 目录里（`hexo generate` 不删孤儿文件，见 Hexo 坑⑦），2026-10-01 已移出：**`docs/` 现在是纯产物 = 123 文件**，`test/baseline.json` 的 `publicFiles` 也是 123；将来再挪动这类文件，记得移完重新构建并刷新基线（`npm run verify -- --update-baseline`），否则 `--strict` 会一直拿旧数字比对。

### `source/rose-galaxy/vendor/`（第三方库本地化，**勿删**）

P0(2026-09-11) 把外链库改为同源自托管，消除 jsDelivr 依赖。这些文件**在源码里没有 `require`/`import` 引用**，只由 `inject.head` / 模板 / `footer.html` 以 `<link>`/`<script>` 路径引用 —— **静态扫描会误判为"未使用"**：

| 文件 | 引用位置 |
| --- | --- |
| `vendor/fontawesome/css/all.min.css` + `webfonts/*.woff2` | `themes/nova/layout/_partials/head-content.pug` |
| `vendor/pjax/pjax.min.js` | `themes/nova/layout/parts-common/footer.html` |
| `vendor/medium-zoom/medium-zoom.min.js` | 同上 |
| `vendor/infinitegrid/infinitegrid.min.js` | `head-content.pug` 的 `GLOBAL_CONFIG.infinitegrid.js` |
| `vendor/waline/waline.min.{css,js}` | `parts-common/waline-comment.html` + `_config.nova.yml` 的 `waline_css`/`waline_js` |
| `vendor/qrcode/qrcode.min.js` | `source/share-qr/index.html`（分享二维码页，`d575f63` 新增） |

源包以精确版本固定在 `devDependencies`（`@fortawesome/fontawesome-free@7.3.1` / `medium-zoom@1.1.0` / `pjax@0.2.8` / `@egjs/infinitegrid@4.13.0`），仅用于需要**重新生成 vendor 时**；构建本身不依赖它们。


---

## 配置图鉴

| 配置件 | 位置 | 内容 | 维护提示 |
| --- | --- | --- | --- |
| Node 构建期 | `scripts/site-config.js` | `SITE` | 从 `_config.yml` 读；改域名改 yml |
| 前端运行时 | `source/rose-galaxy/js/lib/site-config.js` | `window.NOVA_SITE.bili`(云函数代理/UID/收藏夹) | 换 B 站源只改这里；加载顺序:yml inject.head 位于 nova-player.js 之前(defer 保序) |
| 前端工具 | `source/rose-galaxy/js/lib/utils.js` | `window.NOVA_UTILS.formatTime / songName / songArtist` | 播放器/音乐页共用(C7/C10 收敛) |
| 日期工具 | `scripts/lib/date.js` | `fmtDate` | |
| 文章更新时间 | `scripts/post-date.js` | 改写 `post.updated`(git 提交日优先) | 改文章日期只用 front matter `updated:`；**勿依赖 `_config.yml` 的 `updated_option: mtime`** |
| 设计令牌 | `source/css/custom.css :root` | `--nova-rose`/`--nova-rose-rgb`(玫瑰 A2)、`--font-serif`/`--font-sans`(字体 C11) | 全站色值/字体引用变量, 改主题色/字体只改这里 |
| 主题配置 | `_config.nova.yml` | 导航菜单/搜索/注入(共享件+播放器)/aside/waline | inject.head 顺序=文档顺序（原 `_config.butterfly.yml`）|
| 站点配置 | `_config.yml` | url / permalink:`posts/:title/` / tag_dir:`articles` | |

---

## 样式规范

三层职责（**改动必须对号入座**）：

| 层 | 文件 | 规则 |
| --- | --- | --- |
| 上游(勿动) | `source/css/index.css` | Butterfly 副本；头部已标"请勿修改" |
| 全站覆盖 | `source/css/custom.css` | 唯一覆盖去处；头部有总目录注释；分段 `/* ---- 段名 ---- */` 保留日期与意图 |
| 页级 | `source/rose-galaxy/css/{page}-page.css` | 每页一文件；类名前缀 `nova-` |

关键规则位置：

- **页脚横幅**：`custom.css` 中 `html[data-theme=dark|light] body:not(.nova-home-active) footer#footer`(玫瑰横幅 archive-bg.webp，深 `#080c17`/浅 `#d5d4de` 底)；首页为自定义 `.nova-footer` 排除在外；页级 css 中**不要再定义 footer 背景**(曾因覆盖导致横幅消失/矛盾,已收敛)
- **#page-header 层叠（R6 标注）**：涉及 7 个文件(custom 19 处 / index 58 处 / 页级 19 处)——改 header 前需全局检索 `#page-header`；大部分为分层覆盖设计(主题底→全站覆盖→页级 hero)，勿简单增加规则，考虑现有层叠
- **版本号约定**：所有 css/js 引用带 `?v=<日期>-<标签>`(当前 `20260831-p48`)。**引用文件内容变更时必须 bump**——`_config.yml` 的 `version:` 是**唯一来源**:全站 29 处引用已全部写成 `?v=__VERSION__` 占位符(_config.nova.yml 13 + themes/nova 7 + themes/butterfly 7 + `asset-version.js` 自身 2),由 `asset-version.js` 的 `after_render:html` 过滤器渲染后替换 → **改版本号只需动 `_config.yml` 一行,无需再到各处同步字面量**(2026-09-13 核实:产物中已无任何硬编码站点版本号;实测 p47→p48 全站 462 处引用一次生效)。
  主题自带的 `?v=5.7.0`(`/js/utils.js`、`/js/search/local-search.js`、`/css/index.css`)属上游文件,不在本机制内,保持原样。

  > 附带数据：全仓 `?v=` 引用总量约 25–34 处（含生成器里以 `__VERSION__` 占位、由 `scripts/asset-version.js` 渲染的部分），但**需要手动同步的字面量只有上面 22 处**——其余是自动注入。

---

## 构建与部署

### 单仓 · 单分支（源码 + 产物同走 `main`，Pages 从 `/docs` 发布）

源码与产物都在**本仓 `main` 分支**上，没有第二个分支、没有兄弟目录 —— 克隆这一个仓库就能完成「构建 → 提交 → 上线」：

| 位置 | 内容 | 说明 |
| --- | --- | --- |
| 本仓 `main` 分支 | 源码（pug/scripts/source/_config）+ 产物 `docs/` | 所有改动都在这里做，改完推 `origin main` |
| GitHub Pages | 直接以 **main 分支的 `/docs` 目录**为发布源 | 产物由构建生成；**上线只由 `docs/` 的内容决定** |

- **`hexo generate` 直接输出到本仓 `docs/`** —— `_config.yml` 的 `public_dir: docs`（`docs/` 不被 `.gitignore` 忽略, 它就是产物目录兼发布源）。产物目录一律用 `tools/lib/public-dir.js` 解析，勿在脚本里硬编码目录名。
- **评论后端不在本仓**：Waline 是**独立仓库**、独立部署在 Vercel；前端通过 `_config.nova.yml` 的 `waline.serverURL`（`https://yibao11-github-io.vercel.app`）按 URL 引用它，前端改动通常不需要动它。
- **源码与上线在同一个提交里**：没有"只推源码""只推产物"两条线了 —— `git push origin main` 之后 Pages 自动重建；**只改源码不构建 ⇒ 线上不会变**，因为 Pages 只发布 `docs/`。

### 发布流程（改源码 → 构建 → 提交推送 → 线上验证）

1. 在本仓改源码并本地验证：`npm run build` + `npm test` + `npm run verify` 全绿
2. 产物按第 1 步生成进本仓 `docs/`（无需复制；生成即落位，且已被 main 跟踪）
3. **用户明确批准**后一次性提交推送（源码与产物在同一个提交里一起走）：
   ```powershell
   git add -A && git commit -m "..." && git push origin main
   ```
4. 线上验证：curl 关键路由(首页 / moments / articles / posts 示例 / projects / sitemap.xml) + 抽查资源版本号

> ⚠️ **`hexo deploy` 不要再用**（`npm run deploy` 同样别跑）：`_config.yml` 的 deploy 段仍指向 `yibao11.github.io` 的 **`public` 分支**，它会重建 `.deploy_git` 并强推一条与发布源无关的历史 —— 既不生效，又可能让"线上停在旧版"（历史断裂时 Pages 不重建，需 `commit-tree` 修复）。产物统一由 `main` 分支的 `docs/` 推。

```bash
npm run build     # hexo generate && node tools/minify.js && node tools/smoke.js
npm run server    # 本地预览(默认 4000; 惯用 -p 4015)
npm test          # 69 项单元测试
npm run verify    # 结构断言 11 项; 加 --strict 为 19 项(含基线比对)
```

> **`npm run build` 失败即非零退出** —— 2.1 修复(阶段2)后 minify 单文件失败会置非零,冒烟检查失败同样非零。构建返回非零**不要忽略**。
> 改脚本/配置/**模板**后 preview 必须重启 server(见 Hexo 坑③);改模板后 build 需 `--force`(见坑⑬)。

---

## 发布审批规则

> 强制规则（2026-08-27 立此存照；分期台账 STRUCTURE-REFACTOR.md 已归档下架，历史见 `CHANGELOG.md`）：

1. 所有改动在本仓完成并本地验证（`npm run build` + `npm test` + `npm run verify`）；需要隔离试验时另建临时副本（不属于产品链路），其改动最终仍要回到本仓。
2. **未经用户明确批准，禁止任何提交/推送/部署**（git push / GitHub Pages / `main` 分支 / Waline 后端仓库）。发布动作必须逐次明确授权。
3. 结构性/行为性决策先询问用户。
4. 修复完成后只汇报验证结果并请求批准；禁止以"已验证/惯例/之前授权过"为由自行发布。
5. GitHub 提交注释一律**英文简洁**(如 "Globalize page CSS into inject.head … v20260831-p37")。
6. **源码与上线在同一个提交里**:改完推 `origin main`(源码 + `docs/` 产物一起走);Pages 只发布 `docs/`,所以**只改源码不构建（`docs/` 没变）线上就不会变**。

---

## Agent 操作守则

>**零容忍项, 违反=误触**

1. **不改** `source/css/index.css`(Butterfly 上游副本, 标注"勿改")；**站点模板在 `themes/nova/`**(`theme: nova`) —— 改模板改 nova, 不要改 `themes/butterfly/`(原版主题保留未启用, 其 `includes/third-party/pjax.pug`、`additional-js.pug` 在本站渲染链中不存在, 勿依赖/勿开启 `theme.pjax`)。
2. **不删 `source/rose-galaxy/vendor/`**(本地化的第三方库: fontawesome / pjax / medium-zoom / infinitegrid / waline / qrcode)。它们**在源码里没有任何 `require`/`import`**,只由 `head-content.pug`/`footer.html`/`waline-comment.html`/`share-qr` 以路径引用 —— **静态扫描会误判为"未使用资源"**。删了会整站丢图标/丢 PJAX/丢图片缩放/丢评论。
3. **编辑前先停 hexo server**(Windows 文件锁 → edit `ReplaceFileW EIO`);改 `scripts/*.js`、`_config*.yml`、**模板 `.pug`/`.html`** 后必须**重启 server** 再验证。
4. **改模板后必须全量重建**:`npm run build` 走增量缓存,改了 `.pug` 也不会重生成所有页面 → 需 `.\node_modules\.bin\hexo.cmd generate --force`。**判据检查通过 ≠ 目标页已更新**。
5. **页级 CSS 只有一处来源**:`_config.nova.yml inject.head`。**勿**恢复 head extraCss / body 内 PAGE_STYLES 双份机制(2026-09-03 A 方案已全局化, 死代码已清)。
6. **发布流程**:`npm run build`(产物自动落本仓 `docs/`,已被 main 跟踪)→ 用户批准后 `git add -A && git commit -m "..." && git push origin main`。**`hexo deploy` 已弃用**(它会在仓库根下重建 `.deploy_git`,强推一条与发布源无关的 `public` 分支历史)。
7. **SCF 云函数**:响应勿加自定义 `Content-Length`(网关注入双 CT);前端 fetch 按响应体字节判定 base64, 勿再改回 audio 直连(网关注入 `application/json`, 实测不可行)。
8. **hero 双海报只加载当前主题那一张**(单图策略 2026-09-13):`night.webp`/`day.webp` 通过 `--nova-hero-bg` 变量二选一(未生效的变量值不触发请求),另一张由 `nova-ux.js initHeroThemeSwap` 在切主题时按需加载 + 交叉淡入。**勿改回"两图都写在 CSS 里 + opacity 切换"** —— 浏览器会为 `opacity:0` 的 `::after` 也发请求,深色模式下白下载 `day.webp` 271 KB(实测)。

## Hexo 工程坑

1. **hexo 用 vm 包装加载 scripts/*.js**：`(async function(exports, require, module, __filename, __dirname, hexo){...})`——`hexo` 只作为参数传给**被直接加载的脚本**；**内部 `require` 的模块拿不到 hexo**（写共享模块勿在顶层用 hexo——曾致 "hexo is not defined"/"not a function"）。共享模块要么不依赖 hexo（如 site-config.js 直接读 yml），要么导出工厂由生成器传参——后者同样可能有加载顺序问题，**首选零依赖方案**。
2. **hexo 会执行 scripts/ 下所有 .js**：一次性工具(顶层立即写文件)放这里会污染源文件——`pure_parts.js`/`extract_parts.js`/`slice_footer.js` 曾把 page-parts 与 footer.html 覆盖回旧版（"双 nav/横幅丢失"的元凶），后来连同 `py-tools/` 目录一并移除。
3. **hexo server 不热加载配置/模板/插件**：改 `scripts/`、`_config*.yml`、**`.pug`/`.html` 模板**后必须**重启 server**；且 **server 会用内存旧脚本/旧模板重新生成并覆盖 `docs/`**——改动生成器后请**先停 server** 验证，验证完再重启。**server 占用文件时编辑器会报 `ReplaceFileW EIO`**，改文件前先停 server。
   ⚠️ 实测(2026-09-11)：改了 `head.pug` 后用本地预览(当时 4007)，页面**仍请求 CDN**，而 `generate` 产物已正确 —— 即 **server 用缓存的旧模板渲染**。识别方法：对比"server 返回的 HTML"与"产物目录里的文件"。
4. **浏览器缓存**：CSS/JS 版本号未变时，强刷(Ctrl+Shift+R)或隐私窗口验证。
5. **hexo partial `cache: true` 会缓存旧模板**：改 partial 后不生效，改用 `include` 或删 db.json 后重新 generate（**别顺手 `hexo clean`**——它会删掉整个产物目录，见坑⑲）。
6. **Hexo excerpt 是渲染后的 HTML**：生成摘要须先剥离 HTML 标签，否则残留未闭合标签破坏卡片 DOM。
7. **hexo generate 不删孤儿文件**：删除文章/页面后**不要用 `hexo clean`**（它会删掉整个产物目录 `docs/`，见坑⑲）——用 `npx hexo generate --force` 重建；个别残留的空目录（如旧 `posts/<标题>/`）手动删掉即可。
8. **headless 截图陷阱**：虚拟时钟会冻结入场动画、缓存旧 CSS，验证用全新 profile + 像素采样。
9. **基线 `publicFiles` 随资源增减变化**：每次加/删资源都会让 `npm run verify -- --strict` 失败，属预期 → 用 `--update-baseline` 刷新；**但要在删完临时文件之后再刷**，否则基线会记下错误数字。
10. **SCF 网关注入**:`Content-Type: application/json` 被强制附加(双头),二进制音频经 **base64 文本**传输;`audio.src` 直连会被浏览器拒播——前端必须 fetch→字节判定→base64 解码→Blob。
11. **`hexo deploy` 会另起一条 public 历史**:它在仓库根下建 `.deploy_git` 并强推 public 分支,新提交若成孤儿(无共同祖先)Pages 不会重建,线上停在旧版。**已弃用**——`_config.yml` 的 deploy 段仍指向 `public` 分支,而 Pages 只认 main 的 `/docs`,推上去既不生效又添乱;产物统一随 `main` 提交(见「构建与部署」)。
12. **主题版 PJAX / additional-js 为孤儿**:自制 `base.pug` 无渲染链,`theme.pjax.enable` 永远不要开(注释已写);要改 PJAX 只改 `parts-common/footer.html`。
13. **agent 编辑纪律**:删除任何文件前确认「它是上游副本/一次性工具/被其他文件引用」;一次性脚本严禁放入 `scripts/`(hexo 会执行脚本目录全部 .js)。
14. **hexo 增量构建:改模板不会重生成所有页面**(2026-09-11 实测):改了 `themes/**/projects.pug` 后 `npm run build` 报 `3 files generated`,`docs/projects/index.html` 里**旧内容仍在**。→ 改 `.pug`/`.html` 后必须 `hexo generate --force`;**判据检查通过 ≠ 该页已更新**。
15. **pug 在 `script.` 块内写 `//-` 不会被当注释**:它会被原样输出到产物 JS 文本里(实测产物出现 `//- 阶段5...`)。模板注释(`//-`、`//`)要写在**脚本块之外**。
16. **`head_begin` 注入时机 `document.body` 不存在**:`scripts/inject-theme.js` 通过 injector 注入 `<head>`,此时 body 尚未解析 → 用 `document.body.classList.contains(...)` 判页面类型**永远为假**(曾导致首页 hero preload 完全没生效)。该时机请改用 URL 路径判定,如 `location.pathname === '/'`。
17. **"零影响"测试会被运行时 DOM 欺骗**:静态扫 CSS 规则命中数得 `nova-player.css` = 0/240,据此判定"可删注入"是**错的** —— `.nova-mini-player` 由 `nova-player.js` 的 `buildMiniBar()` **运行时创建**(注释写明"非音乐页常驻"),静态永远看不到。→ 剔除/删除测试必须**触发真实交互**(如点播放)后再测;否则只能证明"当前静态状态无影响"。
18. **minify 的 ENOENT 是竞态,不是"偶发"**(协调窗口定位,阶段2.1 已修):根因是 `walk()` 先枚举 `docs/` 全部文件形成快照,再由 `statSync`/`readFileSync` 逐个读取,而这两个 IO **位于 try 之外**——快照与读取之间文件消失即抛未捕获异常,`main().catch` 直接 `process.exit(1)`,构建红掉。触发者是**并发写同一 `docs/`**,最可能是 `hexo server` 与 `hexo generate` 同时运行(所以"重跑一次就好"只是碰运气避开窗口,**不是修复**)。
    → **阶段 2.1 已实施修复**:那两个 IO 已移入 try;且该文件已从 `scripts/` 移到 `tools/minify.js`。校验方法:读 `tools/minify.js`,`statSync`/`readFileSync` 应在 `try {}` 块内。
    本站另在**单文件失败非零退出**与**构建后冒烟检查(11 项)**两处加固,`npm run build` 返回非零不可忽略。

19. **`hexo clean` 会删掉整个产物目录 `docs/`**(2026-10-01 实测:输出 `Deleted public folder.`,连手工放进产物目录里的探针文件一起删):产物目录现在**同时是 GitHub Pages 的发布源**,被清掉后 `docs/` 整个消失、线上全 404,**必须重新 `npm run build`** 才能恢复 —— 所以 `npm run clean`(=`hexo clean`)只在"确定马上重建"时用。需要强制重生成时用 `npx hexo generate --force`(坑⑭ 的 `--force` 就是这条路径,不必先 clean);`npm run build` 本身只覆盖不删除,重复构建不会清掉遗留文件(坑⑦ 的孤儿文件正是这么留下的)。

---

## 常见任务

- **写文章**：见 README「加文章」。
- **加工程**：见 README「加工程」。
- **换 B 站收藏夹源**：改 `source/rose-galaxy/js/lib/site-config.js` 的 `NOVA_SITE.bili` → bump `utils.js?` 无需，但 **bump site-config.js 引用处版本号**(yml inject) 防缓存。
- **换页脚横幅图**：替换 `source/img/hero/archive-bg.webp`(保持文件名)；改色 → `custom.css` 两套规则；**勿在页级 css 加 footer 背景**。
- **换页面 hero 背景**：页面级 css(`{page}-page.css`)中对应 `#page-header`/`.nova-hero-bg` 规则 → 图片放 `img/hero/` → bump 该 css 版本号。
  - **首页(深浅双海报)**:不写 `background-image`,而是给两个主题变量各写一张 —— `html[data-theme="dark"] body.nova-home-active{--nova-hero-bg:url(night)}` / `[light]{...url(day)}`;换图只改变量值。`::after` 交叉淡入层默认无背景(单图策略),由 `nova-ux.js initHeroThemeSwap` 在切主题时注入 → **勿在 CSS 里给 `::after` 写死背景图**,那会让两张海报都被无条件下载(实测非当前主题那张白下载 271 KB)。
- **PJAX 过渡伪影(R1-B, 2026-09-05)**：切换页面瞬间的整屏"玫瑰色蒙版"是页面重挂时全屏层 CSS transition 首帧过渡造成的(非展示层/浏览器问题)。机制 = `custom.css` 的 `html.nova-no-transitions *` 冻结规则 + `nova-ux.js` `beginNavigation`/`finishNavigation` 加/移除该 html 类(切换 250ms 后解锁)。**勿删这两处**;若优化过渡,需同时保留机制,否则伪影复发。
- **工程按钮图标(linkIcon)**：`projects-data.js` 工程条目可选 `linkIcon` 字段(如 `'kurtips'`),`projects-generator.js` 两层映射已透传,`project-detail.pug` 按字段渲染对应图标(`source/img/projects/kurtips-fox.png` 为 KurTips 官方标识,官方无 SVG 资源);无该字段的工程保持 GitHub 图标。
- **更新工程(日期同步)**：替换/新增 `source/assets/projects/<工程名>/` 下资源 → 工程页"最近更新"与首页 LATEST SIGNAL 自动更新为目录内最新文件 mtime(无需改代码);无文件时回退 `projects-data.js` 的 `date`(仅年份)。
- **版本号升级**：只改 `_config.yml` 的 `version:` 一行(权威源) → 重建即可,全站 29 处 `?v=__VERSION__` 占位符由 `asset-version.js` 自动替换。**不需要**再手工同步任何字面量(2026-09-13 起)。
  验证方法:`npm run build` 后全仓搜 `20260831-p<旧号>` 应只剩代码注释里的历史标记(CSS/JS 注释中"某功能于 vX 引入"),不应出现在 `?v=` URL 里。
- **发说说(瞬间页)**：管理员在瞬间页评论区留言即说说——「评论即说说」由 `moments-feed.js` 渲染(说说流仅在页面加载/PJAX 时拉取,**无自动重拉/轮询**);评论区管理员评论在**本次会话内保持可见可管理(如删除),刷新后自动隐藏**(一次性扫描,非持续观察);右侧「最近状态」收藏为本地 localStorage(`nova-moments-mood-v2`):点心形增删、最新置顶、7 条内完整展示超出滚动、服务端已删除说的收藏自动清除(prune 对账)。
- **发布**：见「构建与部署」+「审批规则」。

---

## 排障清单

| 症状 | 常见原因 → 处理 |
| --- | --- |
| 页面元素/样式缺失、图片 404 | 浏览器缓存旧引用 → Ctrl+F5；仍存在则检查版本号是否已 bump |
| 切页瞬间整屏"玫瑰色蒙版"一闪（由下而上收起） | 页面重挂时 CSS transition 首帧伪影(R1-B 已修复) → 检查 `custom.css` 的 `html.nova-no-transitions` 规则与 `nova-ux.js` 的加/移除钩子是否完好;曾被误判为展示层/浏览器问题,勿再排查显示/硬件链路 |
| 首页 hero 塌陷、白区 | 曾因 LATEST/闭合链双份(P1b 提取遗留)——检查 `home-parts/top.html` 占位 `<!--NOVA-LATEST-->` 与 `mid.html` 无旧闭合链；产物中 `nova-latest-signal`/`nova-scroll-hint` 应各 1 处 |
| 生成器不输出(xml/索引缺失) | `scripts/` 加载失败(hexo is not defined / not a function) → 检查共享模块是否顶层用了 hexo；`ERROR Script load failed` 必先看 |
| 文件被"还原" | `scripts/` 混入一次性工具 → 立即移出；从 git 恢复受影响的文件 |
| 改动不生效 | hexo server 未重启(内存旧脚本/旧产物) → 停 server→`hexo generate --force`→重启（**勿用 `hexo clean`**：它会删掉整个产物目录 `docs/`，见坑⑲） |
| **改了模板但目标页没变** | hexo 增量构建未重生成该页 → `hexo generate --force`；不要因为冒烟检查通过就以为页面已更新（坑⑬） |
| **预览用旧模板、产物却正确** | `hexo server` 缓存了 pug 模板 → 重启 server；对比"server 返回 HTML"与"docs/ 产物"可确认（坑③） |
| **整站图标消失 / PJAX 失效 / 图片不能放大** | `source/rose-galaxy/vendor/` 被当"未使用资源"删了 → 从 git 恢复；这 4 个库只由 `head.pug`/`footer.html` 路径引用，源码里搜不到（操作守则 2） |
| **首页 hero 预加载没生效** | 检查 `inject-theme.js` 是否又用了 `document.body` 判首页（该注入时机 body 不存在）→ 改用 `location.pathname`（坑⑮） |
| **首页出现两张海报都下载 / 非当前主题那张白下载 271 KB** | CSS 里给 `.nova-hero-bg::after` 写死了背景图 → 改回无背景(单图策略);换图只改 `--nova-hero-bg` 变量（操作守则 8） |
| **切主题后海报空白不切换** | `nova-ux.js initHeroThemeSwap` 是否被删/未调用（须在 `initInitialLoading()` 后调用, 且仅首页生效）;它靠 `MutationObserver` 监听 `data-theme`, 覆盖时间制/按钮/URL 四种来源 |
| **产物 HTML 里出现 `//-` 文本** | pug 注释写在了 `script.` 块内 → 移到脚本块外（坑⑭） |
| footer 横幅异常 | 页级 css 又有 footer 背景规则 → 删；`custom.css` 两套规则(md 主题前缀)是唯一来源 |
| 评论不见 | Waline 按 path 存储——页面路径变更后旧评论不显示(非 bug)；需迁移在数据层处理 |
| 新说说发布后左侧流不出现 | 说说流仅在页面加载/PJAX 时拉取(设计如此,无自动重拉)→ 刷新页面即可;评论区管理员评论会话内可见属预期(刷新后隐藏);右侧收藏点心形即实时增删 |
