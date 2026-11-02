(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const readPreference = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const savePreference = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Reading works with storage disabled. */ } };
  const liveStatus = $('#live-status');

  const themeToggle = $('#theme-toggle');
  function isDark() {
    const theme = document.documentElement.dataset.theme;
    return theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function labelTheme() {
    themeToggle.setAttribute('aria-label', isDark() ? '切换为浅色主题' : '切换为深色主题');
    themeToggle.title = themeToggle.getAttribute('aria-label');
  }
  labelTheme();
  themeToggle.addEventListener('click', () => {
    const theme = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    savePreference('lh-cn-theme', theme);
    labelTheme();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', labelTheme);

  const menuToggle = $('#menu-toggle');
  const navigation = $('#chapter-navigation');
  const backdrop = $('#nav-backdrop');
  function closeMenu(returnFocus = true) {
    navigation.classList.remove('is-open');
    backdrop.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '打开章节导航');
    document.body.style.overflow = '';
    if (returnFocus) menuToggle.focus();
  }
  menuToggle.addEventListener('click', () => {
    if (navigation.classList.contains('is-open')) return closeMenu();
    navigation.classList.add('is-open');
    backdrop.hidden = false;
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', '关闭章节导航');
    document.body.style.overflow = 'hidden';
    (navigation.querySelector('[aria-current="page"]') || navigation.querySelector('a')).focus();
  });
  backdrop.addEventListener('click', () => closeMenu());
  navigation.addEventListener('click', event => { if (event.target.closest('a') && navigation.classList.contains('is-open')) closeMenu(false); });
  window.matchMedia('(max-width: 640px)').addEventListener('change', event => { if (!event.matches) closeMenu(false); });

  const searchDialog = $('#search-dialog');
  const searchInput = $('#search-input');
  const searchResults = $('#search-results');
  const searchStatus = $('#search-status');
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase();
  const entries = (window.LH_SEARCH_INDEX || []).map(entry => ({ ...entry, matchTitle: normalize(entry.title), matchText: normalize(entry.text) }));
  let searchOpener;
  function openSearch(opener) {
    if (navigation.classList.contains('is-open')) closeMenu(false);
    searchOpener = opener || document.activeElement;
    if (!searchDialog.open) searchDialog.showModal();
    searchInput.focus();
    searchInput.select();
  }
  function closeSearch() { searchDialog.close(); }
  document.querySelectorAll('[data-open-search]').forEach(button => button.addEventListener('click', () => openSearch(button)));
  $('#search-close').addEventListener('click', closeSearch);
  searchDialog.addEventListener('close', () => { if (searchOpener instanceof HTMLElement) searchOpener.focus(); });
  searchDialog.addEventListener('click', event => {
    if (event.target !== searchDialog) return;
    const rect = searchDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSearch();
  });
  searchInput.addEventListener('input', () => {
    const query = normalize(searchInput.value.trim()).slice(0, 200);
    searchResults.replaceChildren();
    if (!query) {
      searchStatus.textContent = '搜索全部章节与术语；多个关键词用空格分隔。';
      return;
    }
    const terms = query.split(/\s+/);
    const matches = entries.filter(entry => terms.every(term => entry.matchTitle.includes(term) || entry.matchText.includes(term)))
      .map(entry => ({ entry, score: terms.reduce((sum, term) => sum + (entry.matchTitle.includes(term) ? 8 : 1), 0) }))
      .sort((a, b) => b.score - a.score);
    searchStatus.textContent = matches.length ? `找到 ${matches.length} 个相关小节${matches.length > 12 ? '，显示前 12 个' : ''}。` : '没有找到结果。可以试试英文术语、函数名，或更短的关键词。';
    for (const { entry } of matches.slice(0, 12)) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = entry.url;
      const title = document.createElement('strong');
      title.textContent = entry.title;
      const snippet = document.createElement('p');
      const position = Math.max(0, entry.matchText.indexOf(terms[0]));
      const start = Math.max(0, position - 35);
      snippet.textContent = `${start ? '…' : ''}${entry.text.slice(start, start + 135)}${entry.text.length > start + 135 ? '…' : ''}`;
      link.append(title, snippet);
      link.addEventListener('click', closeSearch);
      item.append(link);
      searchResults.append(item);
    }
  });
  searchDialog.addEventListener('keydown', event => {
    const links = [...searchResults.querySelectorAll('a')];
    if (!links.length || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const index = links.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') links[Math.min(index + 1, links.length - 1)].focus();
    else if (index <= 0) searchInput.focus();
    else links[index - 1].focus();
  });
  document.addEventListener('keydown', event => {
    const target = event.target;
    const typing = target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable);
    if ((event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) || (event.key === '/' && !typing && !searchDialog.open)) {
      event.preventDefault();
      openSearch();
    }
    if (event.key === 'Escape' && navigation.classList.contains('is-open')) closeMenu();
    if (event.key === 'Tab' && navigation.classList.contains('is-open')) {
      const links = [...navigation.querySelectorAll('a')];
      if (event.shiftKey && document.activeElement === links[0]) { event.preventDefault(); menuToggle.focus(); }
      else if (!event.shiftKey && document.activeElement === links.at(-1)) { event.preventDefault(); menuToggle.focus(); }
      else if (document.activeElement === menuToggle) { event.preventDefault(); (event.shiftKey ? links.at(-1) : links[0]).focus(); }
    }
  });

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return; } catch { /* Use selection-based copying if permission is denied. */ }
    }
    const previousFocus = document.activeElement;
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
    if (!copied) throw new Error('Clipboard unavailable');
  }
  document.querySelectorAll('.copy-code').forEach(button => button.addEventListener('click', async () => {
    const code = button.closest('.code-block').querySelector('code');
    try {
      await copyText(code.textContent.replace(/\n$/, ''));
      button.textContent = '已复制';
      liveStatus.textContent = '代码已复制到剪贴板。';
    } catch {
      button.textContent = '请手动复制';
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      liveStatus.textContent = '自动复制不可用，已选中代码，请手动复制。';
    }
    window.setTimeout(() => { button.textContent = '复制'; }, 2000);
  }));

  const page = document.body.dataset.page;
  if (page.startsWith('Tutorial_')) savePreference('lh-cn-last-page', `${page}.html${location.hash}`);
  const continueReading = $('#continue-reading');
  const lastPage = readPreference('lh-cn-last-page');
  if (continueReading && /^Tutorial_(0[1-9]|1[0-2])_[A-Za-z_]+\.html(?:#[^\s]*)?$/.test(lastPage || '')) {
    continueReading.href = lastPage;
    continueReading.firstChild.textContent = '继续阅读 ';
  }
  window.addEventListener('hashchange', () => { if (page.startsWith('Tutorial_')) savePreference('lh-cn-last-page', `${page}.html${location.hash}`); });
  const progress = $('#reading-progress');
  if (progress) {
    let scheduled = false;
    const update = () => {
      const height = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = `${height > 0 ? Math.min(100, Math.max(0, scrollY / height * 100)) : 100}%`;
      scheduled = false;
    };
    window.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('load', update);
    update();
  }
  const tocLinks = [...document.querySelectorAll('.toc nav a')];
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(records => {
      const visible = records.filter(record => record.isIntersecting);
      if (!visible.length) return;
      const id = visible.at(-1).target.id;
      tocLinks.forEach(link => link.classList.toggle('active', decodeURIComponent(link.hash.slice(1)) === id));
    }, { rootMargin: '-90px 0px -65% 0px' });
    tocLinks.forEach(link => {
      const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      if (heading) observer.observe(heading);
    });
  }
})();
