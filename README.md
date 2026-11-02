# LiquidHaskell 中文教程

**Programming with Refinement Types** 的完整简体中文译本：12 章正文、原始示例、练习与图示，配有适合中文阅读的静态网页。

原著：**Ranjit Jhala 与上游贡献者**。译文以 [ucsd-progsys/liquidhaskell-tutorial](https://github.com/ucsd-progsys/liquidhaskell-tutorial) 的固定提交 [`077437f`](https://github.com/ucsd-progsys/liquidhaskell-tutorial/tree/077437f37e77d13a28ffabbf9be0330f88055ba6) 为基线，保留 MIT 许可证。中文整理日期：2026-11-02。

![中文教程首页预览](preview-20261102.jpg)

## 开始阅读

下载或克隆本仓库，**直接用浏览器打开 `docs/index.html`**。阅读不需要 Node.js、Haskell、网络连接或在线编译服务；页面、搜索索引、样式、脚本与原图都在仓库中。

```bash
git clone https://github.com/longlong921/liquidhaskell-cn.git
cd liquidhaskell-cn
python3 -m http.server 8000 --directory docs
```

也可以运行上面的本地服务器后，在浏览器访问 `http://localhost:8000`。

### 发布到 GitHub Pages

`docs/` 已包含构建完成的静态站点，可直接作为 GitHub Pages 的发布目录。需要在仓库设置中配置一次：

1. 打开仓库 **Settings → Pages**。
2. 在 **Build and deployment → Source** 选择 **Deploy from a branch**。
3. Branch 选择 **main**，目录选择 **/docs**，保存。
4. 等待 GitHub 的 Pages 部署完成，以设置页面实际显示的网址为准。

这是发布配置说明，不代表仓库上传代码时已经启用了 Pages。静态文件使用相对链接，兼容项目站点的子路径。

发布设置的具体含义见 [GitHub 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 内容

| 章 | 中文标题 | Markdown 源文件 |
| --- | --- | --- |
| 01 | 引言 | [阅读](content/Tutorial_01_Introduction.md) |
| 02 | 逻辑与 SMT | [阅读](content/Tutorial_02_Logic.md) |
| 03 | 精化类型 | [阅读](content/Tutorial_03_Basic.md) |
| 04 | 多态 | [阅读](content/Tutorial_04_Polymorphism.md) |
| 05 | 精化数据类型 | [阅读](content/Tutorial_05_Datatypes.md) |
| 06 | 布尔度量 | [阅读](content/Tutorial_06_Measure_Bool.md) |
| 07 | 数值度量 | [阅读](content/Tutorial_07_Measure_Int.md) |
| 08 | 集合度量 | [阅读](content/Tutorial_08_Measure_Set.md) |
| 09 | 案例：惰性队列 | [阅读](content/Tutorial_09_Case_Study_Lazy_Queues.md) |
| 10 | 案例：键值映射 | [阅读](content/Tutorial_10_Case_Study_Associative_Maps.md) |
| 11 | 案例：指针与字节 | [阅读](content/Tutorial_11_Case_Study_Pointers.md) |
| 12 | 案例：AVL 树 | [阅读](content/Tutorial_12_Case_Study_AVL.md) |

补充页面：[阅读与练习指南](content/guide.md)、[中英术语表](content/glossary.md)、[译本说明与来源](content/about.md)。

Markdown 是网站的维护源文件；其中跨章 `.html` 链接、显式锚点和共享引用由构建器解析。完整的阅读体验请使用 `docs/` 中的网页。

## 网页功能

- 章节导航、本页目录、上下章翻页；
- 全文搜索，支持中文、英文和代码名称；`Ctrl+K` / `⌘+K` 或 `/` 打开搜索；
- 代码复制、明暗主题、手机导航和打印样式；
- 每章英文原文入口与原始 `.lhs` 下载；
- 当前浏览器中的最近阅读记录，无服务器、无统计脚本。

## 翻译原则

正文、示例、练习和实质性脚注完整翻译，不缩写为章节摘要。代码块保留原始标识符、注释及待完成的练习；原图内部的英文标签保留，图注和相邻解释使用中文。原文的隐藏 `comment` 区块不展示，但完整 `.lhs` 文件保存在 `examples/`。

新增的澄清统一标为「译者说明」。它们解释历史 API、`assume`、关闭终止性检查、整数溢出、集合与多重集合等重要边界；原代码中的笔误和占位性质不会被静默改写。

**网站构建通过不代表原文练习已经通过 LiquidHaskell 验证。** 原教程包含故意报错的示例、`undefined`、未完成规格和历史依赖。本项目没有声称这些示例可直接在任意现代 GHC 版本编译。安装与练习前请查看[当前官方说明](https://ucsd-progsys.github.io/liquidhaskell/install/)。

## 维护与构建

需要 **Node.js 20 或更新版本**；检查脚本需要 **Python 3.9 或更新版本**。没有需要联网安装的构建依赖，Marked 17.0.5 及其许可证已随仓库提供。

```bash
node scripts/build.mjs
python3 scripts/check.py
```

对应的 npm 命令是 `npm run build` 和 `npm run check`，无需先运行 `npm install`。

修改 `content/`、`assets/` 或构建器后，重新生成并一并提交 `docs/`。GitHub Actions 会运行构建、检查以及生成文件同步检查。

检查覆盖：17 个中文 HTML 页面、站内链接与锚点、图片和资源、搜索目标、重复 ID，以及 **388 个上游可见代码／终端输出块**在 Markdown 和生成网页中的内容与顺序。检查不会执行 Haskell 示例，也不会保证所有历史外链仍在线。

| 路径 | 用途 |
| --- | --- |
| `content/` | 中文正文、补充页面和共享参考链接 |
| `examples/` | 固定版本的原始 literate Haskell 文件 |
| `img/` | 上游原图 |
| `assets/` | 网页样式、浏览器脚本与图标 |
| `scripts/` | 静态构建器、校验器与带许可证的 Markdown 解析器 |
| `upstream-manifest.json` | 26 个上游原始文件的固定版本与 Git blob 哈希 |
| `docs/` | 已构建、可直接发布或离线打开的网站 |

## 许可

上游版权：**Copyright (c) 2015 Ranjit Jhala**。原文、示例、图示及本译本按 [MIT License](LICENSE) 发布。构建器所用 Marked 的许可证见 [scripts/vendor/LICENSE-marked.md](scripts/vendor/LICENSE-marked.md)。引用链接所指向的第三方材料归其各自权利人所有。
