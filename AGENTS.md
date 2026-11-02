# Maintenance instructions

This repository is the Simplified Chinese translation of the LiquidHaskell
tutorial, pinned to the upstream commit recorded in `scripts/chapters.mjs`.

- Edit `content/*.md` and `assets/`; regenerate `docs/` with
  `node scripts/build.mjs` and commit generated changes together with sources.
- Translate all visible narrative, substantive footnotes, and exercises.
  Use readable Chinese and preserve the technical meaning.
- Preserve every visible upstream code/transcript block and its order.
  Do not silently fix intentionally failing examples, stubs, or upstream bugs.
  Explain problems separately under a clearly labeled `译者说明`.
- Keep `examples/*.lhs` and upstream images faithful to the pinned source.
  Upstream hidden comment blocks are omitted from the reading view only.
- Use consistent terms: 精化类型, 谓词, 度量函数, 验证条件, 不变量,
  子类型关系, 未解释函数, 蕴含.
- Do not claim that website checks prove Haskell examples, termination, machine
  overflow safety, trusted FFI code, or specifications left as exercises.
- Preserve upstream copyright and license notices; record third-party licenses.
- Keep the generated site usable offline and under a GitHub Pages project
  subpath. Use relative internal URLs and local runtime assets.
- Run `python3 scripts/check.py` after rebuilding. Investigate failures instead
  of weakening preservation/link checks. Browser-check UI changes when possible.
- Keep the implementation small: static HTML/CSS/JavaScript, a vendored Markdown
  renderer at build time, and a Python standard-library verification script.
