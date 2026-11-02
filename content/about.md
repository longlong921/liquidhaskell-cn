# 译本说明与来源

本项目是 **Programming with Refinement Types / LiquidHaskell Tutorial** 的非官方简体中文译本，面向正在学习 Haskell 与程序验证的读者。英文原著由 Ranjit Jhala 与上游贡献者编写；中文译本保留原文技术内容，并用较自然的中文解释其含义。

## 翻译范围 {#scope}

完整覆盖原教程的 12 章可见正文、示例、练习与实质性脚注，并保留原图。译文以固定版本的 literate Haskell 源码为基准，结合英文网页的章节结构整理；不是只翻译目录，也不是章节摘要。

上游在 README 中说明，在线 HTML/PDF 与源码可能不同步。因此本译本不能宣称与当前英文网页逐字对应；需要精确比较时，请使用下面固定版本的源码。

| 项目 | 来源 |
| --- | --- |
| 英文在线教程 | [LiquidHaskell Tutorial](https://ucsd-progsys.github.io/liquidhaskell-tutorial/Tutorial_01_Introduction.html) |
| 上游仓库 | [ucsd-progsys/liquidhaskell-tutorial](https://github.com/ucsd-progsys/liquidhaskell-tutorial) |
| 源码基线 | [`077437f37e77d13a28ffabbf9be0330f88055ba6`](https://github.com/ucsd-progsys/liquidhaskell-tutorial/tree/077437f37e77d13a28ffabbf9be0330f88055ba6) |
| 上游提交日期 | 2024-09-30 |
| 中文译本整理日期 | 2026-11-02 |
| 中文仓库 | [longlong921/liquidhaskell-cn](https://github.com/longlong921/liquidhaskell-cn) |

## 翻译约定 {#conventions}

**正文忠实传达原意。** 在不改变技术含义的前提下，将较长的英语句子拆开，补出代词所指对象，并用直观表述解释论证中的关键一步。

**代码保留原样。** 函数名、变量名、类型、规格以及有意失败的例子不因翻译而改写。代码注释通常也保留原文，便于与固定版本逐块比较。原图内部的英文标签保留，图片说明与相邻正文用中文解释。

**补充说明明确署为译者说明。** 对过时 API、原文笔误、信任边界或容易产生误解的论断，保留原材料，再解释问题所在。译者说明不是上游作者的原话。

**练习保留为练习。** `undefined`、占位规格和等待补全的函数属于原文设计。网页不会把它们假装成已经验证通过的参考实现。

**排版与链接作必要修复。** LaTeX/Pandoc 宏转换为网页可读的 Markdown；原脚注就近移为「原注」；明显错位的跨章链接、重复锚点和第八章文件名的复数拼写错误作了修正。隐藏的编辑讨论与辅助代码区块不放入正文，完整 `.lhs` 文件仍可下载对照。

## 关于验证范围 {#verification}

网站构建检查覆盖章节、静态链接、资源、搜索目标和原始可见代码的一致性。它没有在这个仓库中运行一套现代 LiquidHaskell 工具链，也没有替原文练习补齐答案。

精化验证所能保证的范围取决于实际规格、模型、可信假设与启用的检查。安装版本、整数溢出、终止性和底层 API 的相关说明集中在[阅读与练习指南](guide.html)，具体例子的注意事项放在对应章节旁。

## 许可与致谢 {#license}

上游使用 **MIT License**，原始版权为 **Copyright (c) 2015 Ranjit Jhala**。本项目保留[完整许可证](LICENSE)，译文、网站代码和排版调整同样按 MIT License 提供。原作者、贡献者及第三方引用材料的权利归各自所有者。

构建时使用的 Markdown 解析器是 [Marked](https://github.com/markedjs/marked)，其副本和 MIT 许可证保存在仓库的 `scripts/vendor/` 中。网页运行本身不需要加载该解析器，也不依赖第三方 CDN。

感谢英文原著作者与贡献者。若发现译文错误，可以在[中文仓库](https://github.com/longlong921/liquidhaskell-cn)提交修订；若属于上游规格或例子本身的问题，修订时请保留版本依据，避免默默改变原文。
