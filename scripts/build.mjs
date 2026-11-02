import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { Marked, marked } from './vendor/marked.mjs';
import { chapters, parts, upstream } from './chapters.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'docs');
const read = path => readFileSync(join(root, path), 'utf8');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plain = value => value.replace(/<[^>]*>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const slug = value => plain(value).toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-|-$/g, '') || 'section';
const search = [];
const referenceText = read('content/references.md').replace(/:\s+\/blog\//g, ': https://ucsd-progsys.github.io/liquidhaskell/blogposts/');
const icon = (name) => {
  const paths = {
    search: '<circle cx="10.7" cy="10.7" r="6.7"/><path d="m16 16 4.5 4.5"/>',
    theme: '<path d="M20.5 13.1A8.7 8.7 0 0 1 10.9 3.5 8.7 8.7 0 1 0 20.5 13.1Z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    book: '<path d="M12 5v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v14c-4-1-7 0-9 2-2-2-5-3-9-2Z"/>'
  };
  return `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
};

function sidebar(active) {
  return `<aside class="sidebar" id="chapter-navigation" aria-label="教程导航">
    <a class="sidebar-home ${active === 'index' ? 'active' : ''}" href="index.html">${icon('book')} 阅读首页</a>
    ${parts.map(part => `<div class="nav-group"><p class="nav-label">${['I', 'II', 'III'][part.number - 1]} · ${part.title}</p><ol start="${chapters.find(c => c.part === part.number).number}">${chapters.filter(c => c.part === part.number).map(chapter => `<li><a href="${chapter.slug}.html" ${active === chapter.slug ? 'aria-current="page" class="active"' : ''}><span class="nav-number">${String(chapter.number).padStart(2, '0')}</span><span>${chapter.title}</span></a></li>`).join('')}</ol></div>`).join('')}
    <div class="nav-extras"><a href="guide.html" ${active === 'guide' ? 'aria-current="page" class="active"' : ''}>阅读与练习指南</a><a href="glossary.html" ${active === 'glossary' ? 'aria-current="page" class="active"' : ''}>中英术语表</a><a href="about.html" ${active === 'about' ? 'aria-current="page" class="active"' : ''}>译本说明与来源</a></div>
    <div class="sidebar-note"><span class="status-dot"></span>12 章完整译文<br><small>原文示例 · 练习 · 译者说明</small></div>
  </aside>`;
}

function shell({ title, description, active, body, toc = [], wide = false }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="description" content="${escape(description)}">
  <meta name="theme-color" content="#f7f8f4">
  <title>${escape(title)} · LiquidHaskell 中文教程</title>
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/style.css">
  <script>try{const t=localStorage.getItem('lh-cn-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}</script>
  <script src="search-index.js" defer></script>
  <script src="assets/app.js" defer></script>
</head>
<body data-page="${escape(active)}">
  <a class="skip-link" href="#main-content">跳到正文</a>
  <header class="topbar"><div class="topbar-inner">
    <button class="icon-button mobile-menu" id="menu-toggle" aria-label="打开章节导航" aria-controls="chapter-navigation" aria-expanded="false">${icon('menu')}</button>
    <a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">λ</span><span>LiquidHaskell <span class="brand-language">中文教程</span></span></a>
    <div class="top-actions"><button class="search-button" data-open-search aria-label="搜索教程">${icon('search')}<span>搜索教程</span><kbd>Ctrl K</kbd></button><button class="icon-button" id="theme-toggle" aria-label="切换明暗主题" title="切换明暗主题">${icon('theme')}</button><a class="repo-link" href="https://github.com/longlong921/liquidhaskell-cn">GitHub ${icon('arrow')}</a></div>
  </div></header>
  <div class="layout ${wide ? 'layout-wide' : ''}">${sidebar(active)}<main id="main-content" tabindex="-1">${body}<footer class="page-footer"><p>原著 Ranjit Jhala 与贡献者 · 中文翻译与讲解</p><p><a href="about.html">来源与译本说明</a><span>·</span><a href="LICENSE">MIT License</a><span>·</span><a href="${upstream.website}Tutorial_01_Introduction.html">英文教程</a></p></footer></main>${toc.length ? `<aside class="toc" aria-label="本页目录"><p>本页内容</p><nav>${toc.map(item => `<a class="toc-depth-${item.depth}" href="#${escape(item.id)}">${escape(item.title)}</a>`).join('')}</nav><a class="back-top" href="#main-content">回到顶部 ↑</a></aside>` : ''}</div>
  <button class="nav-backdrop" id="nav-backdrop" aria-label="关闭章节导航" tabindex="-1" hidden></button>
  <dialog class="search-dialog" id="search-dialog" aria-labelledby="search-title"><div class="search-dialog-header"><h2 id="search-title">搜索教程</h2><button class="dialog-close" id="search-close" aria-label="关闭搜索">Esc</button></div><label for="search-input" class="sr-only">输入中文、英文或代码名称</label><div class="search-input-wrap">${icon('search')}<input id="search-input" type="search" placeholder="试试「不变量」、measure、ByteString…" autocomplete="off"></div><p class="search-status" id="search-status" role="status">搜索全部章节与术语；多个关键词用空格分隔。</p><ol id="search-results" class="search-results"></ol></dialog>
  <div class="sr-only" id="live-status" aria-live="polite"></div>
</body>
</html>`;
}

function renderMarkdown(source) {
  const toc = [];
  const seen = new Map();
  const parser = new Marked({ gfm: true, renderer: {
    heading({ text, depth }) {
      const anchor = text.match(/\s*\{#([^}]+)\}\s*$/);
      const raw = text.replace(/\s*\{#[^}]+\}\s*$/, '');
      const label = marked.parseInline(raw);
      const base = anchor ? anchor[1] : slug(label);
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      const id = count ? `${base}-${count + 1}` : base;
      if (depth === 1) return `<span class="chapter-anchor" id="${escape(id)}"></span>\n`;
      if (depth <= 3) toc.push({ id, title: plain(label), depth });
      return `<h${depth} id="${escape(id)}">${label}<a class="heading-anchor" href="#${escape(id)}" aria-label="链接到${escape(plain(label))}">#</a></h${depth}>\n`;
    },
    code({ text, lang }) {
      const language = (lang || 'text').split(/\s/)[0];
      const label = ({ haskell: 'Haskell', bash: 'Shell', sh: 'Shell', text: '输出 / 示例', json: 'JSON' })[language] || language;
      return `<div class="code-block"><div class="code-toolbar"><span>${escape(label)}</span><button class="copy-code" type="button" aria-label="复制这段代码">复制</button></div><pre><code class="language-${escape(language)}">${escape(text)}\n</code></pre></div>\n`;
    }
  }});
  return { html: parser.parse(`${source}\n\n${referenceText}`), toc };
}

function indexSections(title, file, html) {
  html = html.replace(/<div class="code-toolbar">[\s\S]*?<\/div>/g, '');
  const sections = html.split(/<h[23] id="([^"]+)">([\s\S]*?)<\/h[23]>/g);
  const introduction = plain(sections[0]);
  if (introduction) search.push({ title, url: file, text: introduction });
  for (let i = 1; i < sections.length; i += 3) {
    search.push({ title: `${title} · ${plain(sections[i + 1]).replace(/#$/, '')}`, url: `${file}#${sections[i]}`, text: plain(sections[i + 2] || '') });
  }
}

function chapterPage(chapter, index) {
  const { html, toc } = renderMarkdown(read(`content/${chapter.slug}.md`));
  indexSections(`${String(chapter.number).padStart(2, '0')} ${chapter.title}`, `${chapter.slug}.html`, html);
  const previous = chapters[index - 1];
  const next = chapters[index + 1];
  const navItem = (item, label) => item ? `<a href="${item.slug}.html"><small>${label}</small><strong>${String(item.number).padStart(2, '0')} ${item.title}</strong></a>` : `<a href="${label === '上一章' ? 'index.html' : 'glossary.html'}"><small>${label === '上一章' ? '从这里开始' : '继续查阅'}</small><strong>${label === '上一章' ? '教程首页' : '中英术语表'}</strong></a>`;
  const body = `<div class="reading-progress" aria-hidden="true"><span id="reading-progress"></span></div><header class="chapter-header"><p class="eyebrow">第 ${String(chapter.number).padStart(2, '0')} 章 <span>/</span> ${parts[chapter.part - 1].title}</p><h1>${chapter.title}</h1><p class="chapter-subtitle">${chapter.subtitle}</p><div class="chapter-links"><a href="${upstream.website}${chapter.slug}.html">对照英文原文 ↗</a><a href="examples/${chapter.slug}.lhs" download>下载原始示例 ↓</a></div></header><div class="reading-note"><strong>阅读提示</strong> 代码与练习保留原貌；标为「译者说明」的内容是补充讲解。运行前请阅读<a href="guide.html#environment">环境说明</a>。</div><article class="prose">${html}</article><nav class="chapter-pagination" aria-label="章节翻页">${navItem(previous, '上一章')}${navItem(next, '下一章')}</nav>`;
  return shell({ title: `${chapter.number}. ${chapter.title}`, description: chapter.summary, active: chapter.slug, body, toc });
}

function homePage() {
  const body = `<section class="hero"><p class="eyebrow"><span class="status-dot"></span> Programming with Refinement Types · 中文译本</p><h1>把正确性，<br>写进<span>类型</span>里。</h1><p class="hero-description">用熟悉的 Haskell，加上一点逻辑。<br>从「这个值是什么」，走到「这个值满足什么条件」。</p><div class="hero-actions"><a class="button-primary" href="${chapters[0].slug}.html" id="continue-reading">开始阅读 ${icon('arrow')}</a><a class="button-secondary" href="guide.html">阅读与练习指南</a></div><p class="hero-meta">12 章 · 3 个部分 · 保留原文示例与练习</p><div class="hero-example"><div class="example-label"><span>类型 + 条件</span><span class="example-language">Haskell</span></div><pre><code><span class="code-comment">-- 结果不只是 Int，还必须大于 0</span>\n<span class="code-annotation">{-@ type Positive = {v:Int | v &gt; 0} @-}</span></code></pre><p><span class="example-dot"></span> 把约定交给验证器，在运行之前检查。</p></div></section>
  <section class="learning-path" aria-labelledby="path-heading"><div class="section-heading"><div><p class="eyebrow">阅读路线</p><h2 id="path-heading">循序渐进，理解每一个约束。</h2></div><a href="glossary.html">查阅术语表 ↗</a></div>${parts.map(part => `<section class="part-section" aria-labelledby="part-${part.number}"><div class="part-heading"><span>${['I', 'II', 'III'][part.number - 1]}</span><div><h3 id="part-${part.number}">${part.title}</h3><p>${part.description}</p></div></div><div class="chapter-grid">${chapters.filter(c => c.part === part.number).map(c => `<a class="chapter-card" href="${c.slug}.html"><span class="card-number">${String(c.number).padStart(2, '0')}</span><div><h4>${c.title}</h4><p>${c.summary}</p></div><span class="card-arrow" aria-hidden="true">↗</span></a>`).join('')}</div></section>`).join('')}</section>
  <section class="home-note"><h2>开始之前，先知道这几件事。</h2><p>这是一份完整中文译本，按上游 literate Haskell 源码校订。阅读只需要浏览器；完成练习需要匹配版本的 GHC、LiquidHaskell 和 SMT 求解器。原教程包含有意报错的代码与待补全的练习。</p><a href="about.html">了解来源、版本和翻译约定 ${icon('arrow')}</a></section>`;
  return shell({ title: '从类型到正确性', description: 'LiquidHaskell 官方教程的完整中文译本：12 章讲解精化类型、SMT、度量函数与数据结构验证，保留示例与练习。', active: 'index', body, wide: true });
}

// Read all sources before replacing the generated directory.
const generated = new Map([['index.html', homePage()]]);
for (const [index, chapter] of chapters.entries()) generated.set(`${chapter.slug}.html`, chapterPage(chapter, index));
for (const [name, title, description] of [['guide', '阅读与练习指南', '运行环境、练习方法与验证边界。'], ['glossary', '中英术语表', '精化类型与程序验证中的常用术语。'], ['about', '译本说明与来源', '翻译范围、来源版本、许可与维护方式。']]) {
  const { html, toc } = renderMarkdown(read(`content/${name}.md`));
  indexSections(title, `${name}.html`, html);
  generated.set(`${name}.html`, shell({ title, description, active: name, toc, body: `<header class="chapter-header"><p class="eyebrow">阅读辅助</p><h1>${title}</h1><p class="chapter-subtitle">${description}</p></header><article class="prose">${html}</article>` }));
}
generated.set('404.html', shell({ title: '没有找到这一页', description: '返回教程目录继续阅读。', active: '404', body: '<section class="not-found"><p class="eyebrow">404</p><h1>这一页暂时找不到。</h1><p>可以从章节目录继续，也可以搜索你关心的概念。</p><a class="button-primary" href="index.html">返回首页 →</a></section>', wide: true }));
mkdirSync(output, { recursive: true });
for (const entry of readdirSync(output)) rmSync(join(output, entry), { recursive: true, force: true });
for (const [path, html] of generated) writeFileSync(join(output, path), html);
for (const name of ['assets', 'img', 'examples']) cpSync(join(root, name), join(output, name), { recursive: true });
cpSync(join(root, 'LICENSE'), join(output, 'LICENSE'));
writeFileSync(join(output, '.nojekyll'), '');
writeFileSync(join(output, 'search-index.js'), `window.LH_SEARCH_INDEX=${JSON.stringify(search).replace(/</g, '\\u003c')};\n`);
writeFileSync(join(output, 'source-manifest.json'), JSON.stringify({ ...upstream, chapters: chapters.map(({ number, slug, title }) => ({ number, slug, title })) }, null, 2) + '\n');
console.log(`Built ${generated.size} HTML pages and ${search.length} searchable sections in docs/.`);
