# 接管须知

> **这是原站主写给新站主的交接文档。**
> 站点已从原站主名下**完整移交**给新站主：源码仓库、评论后端、音乐后端，以及 GitHub / Vercel / Neon / 腾讯云四个平台的账号，全部归新站主所有。
> **不需要再注册任何账号**，直接用已经交接给你的账号登录即可。
>
> 建议顺序：先读这一页 → 再读 `AGENT.md`（长期维护手册，写得很全）。
> 更新：2026-10-02

## 0. 三十秒定位

| 项 | 值 |
| --- | --- |
| 线上 | <https://jaheecn.github.io> |
| 技术 | Hexo 8.1.2 + 自制主题 **nova**（基于 Butterfly 5.7.0 改造） |
| 主仓库 | `https://github.com/Jaheecn/Jaheecn.github.io`（**main 分支** = 源码 + 产物） |
| 评论后端仓 | `https://github.com/Jaheecn/waline` |
| 发布方式 | GitHub Pages ← **main 分支的 `/docs` 目录** |
| 现有内容 | 12 篇文章 · 5 个工程 · 79 首音乐 |
| 本地目录 | `main/` 和 `waline/`（两个并列的独立 git 仓库） |

一句话：在 `main/` 里改源码 → 构建出 `docs/` → 推 main → Pages 自动发布。评论和音乐是**两个外部后端**，不在这个仓库里。

---

## 1. ⚠️ 第一件事：让本地仓库连上线上（必做）

原站主打包给你的 `site` 里，git 历史是**和线上平行的另一条** —— **文件内容一模一样**（两边最终的 tree 都是 `6f426ba1`），但提交号不同。原因是原站主那边用的是 GitHub API 推送而不是 `git push`，API 造出的提交对象和本地提交内容相同、SHA 不同。所以直接 `git pull` 会多出一个合并提交，`git push` 还可能被拒。

**在动手改任何东西之前**，执行这两条一次性对齐（`main/` 和 `waline/` 各做一次）：

```powershell
cd main
git fetch origin
git reset --hard origin/main
```

验证：`git log --oneline -1` 出来的提交号，应该和 `git ls-remote origin main` 的结果一致，`git status` 应显示 `nothing to commit`。之后 `git pull` / `git push` 就都是干净的了。

```powershell
cd ..\waline
git fetch origin
git reset --hard origin/main
```

> `git reset --hard` **不会删你的文件**，只把 git 记录对齐到线上；但它会丢弃**尚未提交**的改动，所以要在开始改东西之前做。
> `git push` 第一次会让你登录 GitHub，用已经交接给你的账号（`Jaheecn`）。

### 关于四个平台的账号

GitHub / Vercel / Neon / 腾讯云都已完成移交。**建议**把初始密码改成自己的、并给 GitHub 开两步验证 —— 不做也照样能用，只是初始密码经过了第三方传递，始终有点风险。

---

## 2. 在本机跑起来

需要 Node.js 18+。包里**已经带了 `node_modules/`**，所以可以直接启动：

```powershell
cd main
npm run server     # 本地预览 http://localhost:4000
```

改完东西必跑这三条（全绿才算过）：

```powershell
npm run build                # 构建 + 压缩 + 冒烟检查（11 项）
npm test                     # 单元测试（69 项）
npm run verify -- --strict    # 结构断言 + 基线比对（19 项）
```

**`npm run build` 非零退出就是真的失败了**，别忽略。

---

## 3. 评论后端：登录即可，不用注册

评论后端是 **Vercel + Neon Postgres**，项目名 `jaheecn-github-io`，**管理员账号已经建好并交接给你了**，不需要再注册。

管理后台：<https://jaheecn-github-io.vercel.app/ui> —— 用交接给你的那组账号直接登录。

**为什么要关心它**：这个站的「说说」页内容 = 管理员在评论区的留言（设计叫「评论即说说」）。所以：

- 在**说说页评论区**用管理员账号发一条 → 说说页就会出现卡片；
- 管理员评论**不会**出现在普通评论区，而是被抽出来单独当说说卡片显示。

没发过内容时，说说页会显示成这样 —— **这不是坏了**：

```
TOTAL MOMENTS  —     LATEST UPDATE  —
TO BE CONTINUED / 生活仍在继续。
```

Waline 是**按页面路径分开存评论**的：`/about/`、`/moments/`、每篇文章各是独立评论区。

---

## 4. 建议清掉一条测试残留

原站主验收时在 **`/about/`（关于页）** 留了 **1 条测试评论**（正文 `text`、昵称「匿名」），是公开可见的。登 <https://jaheecn-github-io.vercel.app/ui> 后台按页面 `/about/` 删掉即可。

---

## 5. 日常改动 & 发布

```powershell
# 1. 改源码（themes/nova/ 的模板、source/_posts/ 的文章、source/ 的样式…）
# 2. 验证
npm run build
npm test
npm run verify -- --strict
# 3. 发布
git add -A
git commit -m "English concise message"
git push origin main
```

> **核心认知：只改源码、不重新 `npm run build`，线上什么都不会变。**
> 因为 Pages 发布的只有 `docs/`。源码和产物必须在**同一个提交**里一起推。

推送后 1–2 分钟 Pages 重建，打开 <https://jaheecn.github.io> 确认。

---

## 6. 🚫 六条红线

| # | 不要做 | 后果 / 出事怎么办 |
| --- | --- | --- |
| 1 | **别跑 `npm run clean`（`hexo clean`）**，除非立刻要重建 | 它删掉**整个 `docs/`**，而 `docs/` 就是线上 → **全站 404**。出事就立刻 `npm run build` 再推 |
| 2 | **别跑 `npm run deploy` / `hexo deploy`** | 会另建 `.deploy_git` 强推一条无关的 `public` 历史，Pages 可能不再重建、线上停在旧版。产物统一走 main 的 `docs/` |
| 3 | **别删 `source/rose-galaxy/vendor/`** | 里面的库在源码里**搜不到任何引用**（只按路径加载），静态扫描必然误判成「没用的资源」。删了会丢图标 / PJAX / 图片缩放 / 评论。恢复：`git checkout -- source/rose-galaxy/vendor/` |
| 4 | **别改 `source/css/index.css`** | 那是 Butterfly 上游原版副本（文件里标了「勿改」） |
| 5 | **改 `.pug` / `.html` 后只用 `npm run build` 不够** | 增量缓存不会重生成所有页面 → 用 `npx hexo generate --force` |
| 6 | **编辑文件前先停 `hexo server`** | Windows 文件锁会报 `ReplaceFileW EIO`；server 还会用内存里的旧模板覆盖 `docs/` |

---

## 7. 两条外部后端

### 评论：Vercel + Neon Postgres

项目名 `jaheecn-github-io`，后端代码在 `https://github.com/Jaheecn/waline`，数据在 Neon。管理后台 `/ui`。

- **改了环境变量必须 Redeploy 才生效**（Vercel 规则）。
- **前端有 5 处写死了后端地址**，以后换域名必须全改，漏一处会出现「某些页面评论打到旧后端」：

```
themes/nova/layout/parts-common/waline-comment.html        第 11 行
themes/butterfly/layout/parts-common/waline-comment.html   第 11 行
themes/nova/layout/project-detail.pug                      第 164 行
themes/butterfly/layout/project-detail.pug                 第 164 行
source/rose-galaxy/js/moments-feed.js                      第 10 行
```

（成对出现，是因为 `themes/nova/` 和 `themes/butterfly/` 是两份并列的主题副本。）

### 音乐：腾讯云函数

函数 `yibao-netease-proxy`（广州 / Python 3.13 / 入口 `index.main_handler`），前端引用在 `source/rose-galaxy/js/lib/site-config.js` 第 12 行。腾讯云账号已随交接移交（**账号 ID `100053383049`**）。

它读网易云歌单 → 返回 CDN 直链 → 前端直接把直链给 `audio.src`。三个坑：

1. **触发器必须是「函数 URL」**（腾讯云 API 网关已于 2025-06-30 停服，建不了了），授权类型选**开放**，否则跨域被拒。
2. **函数代码里不能有任何非 ASCII 字符**，中文注释也不行 —— 控制台按 GBK 解 UTF-8 会变乱码，部署后报 `SyntaxError: invalid non-printable character U+E576`。
3. `/stream2`（兜底代理）的响应**别自己加 `Content-Length`**。

> 函数欠费 / 停用 / 被删，音乐页会**静默失效**（前端只显示「收藏夹加载失败」）。建议设个余额提醒。

---

## 8. 想改东西，照着找

| 改什么 | 去哪 |
| --- | --- |
| 站名 / 作者 / 域名 / 版本号 | `main/_config.yml`（`title` / `author` / `url` / `version`） |
| 导航栏、页脚、搜索弹窗文案 | `themes/nova/layout/parts-common/*.html`（**硬编码 HTML，不是 pug**） |
| 各页面标题与描述 | `themes/nova/layout/*.pug` |
| 关于页正文 | `themes/nova/layout/page-parts/about.html` |
| 文章 | `source/_posts/*.md` |
| 工程列表 / 详情长文 | `scripts/projects-data.js` / `scripts/projects-intro.js` |
| 工程封面图 | `source/img/projects/<id>.webp` 与 `demo-<id>.webp` |
| 页面 hero 背景 | `source/img/hero/*.webp` |
| 头像 | `source/img/brand/headpicture.jpg` |
| 全局样式微调 | `source/css/custom.css` |

> **反直觉的一点**：`_config.nova.yml` 看起来最像「主题配置文件」，但**全仓库没有任何代码读它**（只有三处注释提到）。改它不影响任何输出。真正的渲染源是 `themes/nova/layout/` 里的硬编码片段。

---

## 9. `AGENT.md` 里唯一需要重新理解的一条

那份手册写得很全，照着做基本不会错。只有一条前提变了：

> 手册里反复强调「**未经用户明确批准，禁止任何提交 / 推送 / 部署**」—— 那是原站主用来约束 AI 助手的。

**现在你就是那位「用户」。** 建议保留这个习惯（让 AI 先给你看改动和验证结果，你点头再推），只是批准人换成了你自己。

---

## 10. 移交时没有一起换掉的两样东西

1. **首页主视觉和头像**：`source/img/hero/night.webp`（深色主题）、`day.webp`（浅色主题）、`source/img/brand/headpicture.jpg`（关于页头像）。原站主沿用了这套图，**纯装饰、图内没有人名**。想换就换成自己的，**文件名保持不变**即可。
2. **12 篇文章**：5 篇 Markdown 语法教程 + 5 篇古典赋（别赋 / 哀江南赋 / 洛神赋 / 离骚 / 雪赋）+ 2 篇古典诗词（月下小令 / 西江月）。**没有任何个人隐私内容**，古典诗文本身是公版。可以留作示例，也可以删掉换自己的；删文章后**别用 `hexo clean`**，用 `npx hexo generate --force` 重建。

更早那位站主的品牌名、邮箱、GitHub、B 站账号、下载包等**已经全部清理干净**，不用管。

---

## 11. 常见故障

| 症状 | 原因 → 处理 |
| --- | --- |
| 评论不显示 / 说说计数是 `—` | ① 先确认网络能上外网（后端在 Vercel）；② 能上还空 ⇒ **就是真的没评论**（见 §3）；③ 自检：浏览器打开 `https://jaheecn-github-io.vercel.app/comment?path=/moments/`，返回 `{"count":0,…}` 即后端正常 |
| 整站图标消失 / PJAX 失效 / 图片不能放大 | `vendor/` 被删 → `git checkout -- source/rose-galaxy/vendor/` |
| 改了模板但目标页没变 | `npx hexo generate --force` |
| 改动完全不生效 | `hexo server` 没重启 → 停 server → `--force` 重建 → 重启 |
| 想清缓存 | **别用 `hexo clean`**；用 `--force`，或删 `db.json` 后重建 |
| `--strict` 报文件数对不上 | 增删资源后基线过期 → `npm run verify -- --update-baseline`（确认无临时文件残留再刷） |
| 推送被拒 / Permission denied | 确认登录的是 `Jaheecn` 本人；本机可能存着别的 GitHub 账号的凭据 |
| 打不开自己站 / 转圈很久 | GitHub Pages 需要外网稳定可达，属环境问题 |

---

## 12. 当前状态（2026-10-02）

12 篇文章 · 5 个工程 · 79 首音乐 · `docs/` 121 个文件 · 版本号 `20260831-p49` · 单测 69 项 · 结构断言 19 项

- **版本号**只改 `_config.yml` 里 `version:` **一行**，重建即可 —— 全站 29 处 `?v=__VERSION__` 由 `scripts/asset-version.js` 自动替换。
- 每次构建 `data/music-playlist.json` 会有 **1 行 diff**（回写时间戳，属设计行为，不是错误）。
- 浏览量已随换站清零（`data/views-cache.json` 的 `pv` 为空），从 0 重新累计。

---

## 常用命令

```powershell
npm run server                          # 本地预览 http://localhost:4000
npm run build                           # 构建 + 压缩 + 冒烟 11 项
npm test                                # 单元测试 69 项
npm run verify -- --strict              # 结构 + 基线 19 项
npm run verify -- --update-baseline     # 增删资源后刷新基线
npx hexo generate --force               # 改模板后强制重建
git add -A && git commit -m "..." && git push origin main
```

**永远不要用**：`npm run clean`（除非立刻重建）、`npm run deploy`、`hexo deploy`。
