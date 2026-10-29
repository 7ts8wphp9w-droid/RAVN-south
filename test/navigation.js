/* Preserve reading position for local actions and browser Back/Forward. */
(() => {
  history.scrollRestoration = 'manual';
  const positions = new Map();
  const key = () => 'ravn-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  let entry = history.state?.ravnEntry || key();
  let depth = history.state?.ravnDepth || 0;
  let route = location.hash;
  let restoring = false;
  let revision = 0;
  history.replaceState({...history.state, ravnEntry: entry, ravnDepth: depth}, '');
  const remember = () => positions.set(entry, {x: scrollX, y: scrollY});
  const move = pos => window.scrollTo({left: pos.x, top: pos.y, behavior: 'instant'});
  const stopRestoring = () => { restoring = false; revision++; };
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(type =>
    window.addEventListener(type, stopRestoring, {passive: true}));
  window.addEventListener('scroll', () => { if (!restoring) remember(); }, {passive: true});
  const originalRender = render;
  function restore(pos) {
    const token = ++revision;
    restoring = true;
    move(pos);
    requestAnimationFrame(() => {
      if (revision !== token) return;
      move(pos);
      // Late-loading photographs must not discard a restored reading position.
      const images = [...document.querySelectorAll('main img')].filter(img => !img.complete);
      Promise.all(images.map(img => new Promise(resolve => {
        img.addEventListener('load', resolve, {once: true});
        img.addEventListener('error', resolve, {once: true});
      }))).then(() => {
        if (revision !== token) return;
        move(pos); restoring = false; remember();
      });
    });
  }
  render = function() {
    const pos = {x: scrollX, y: scrollY};
    originalRender();
    restore(pos);
  };
  function show(pos) {
    originalRender();
    const main = document.querySelector('main');
    main.tabIndex = -1;
    main.focus({preventScroll: true});
    restore(pos);
  }
  function navigate(hash) {
    if (hash === route || (hash === '#/' && !route)) return;
    remember();
    entry = key(); depth++;
    history.pushState({ravnEntry: entry, ravnDepth: depth}, '', hash);
    route = location.hash;
    show({x: 0, y: 0});
  }
  navto = p => navigate('#' + p);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-site-back]')) {
      event.preventDefault();
      remember();
      if (depth > 0) history.back(); else navigate('#/');
      return;
    }
    const link = event.target.closest('a[href^="#/"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
    event.preventDefault();
    navigate(link.getAttribute('href'));
  });
  function historyChanged() {
    const state = history.state;
    if (location.hash === route && state?.ravnEntry === entry) return;
    if (!state?.ravnEntry || state.ravnEntry === entry) {
      entry = key(); depth++;
      history.replaceState({...state, ravnEntry: entry, ravnDepth: depth}, '');
    } else {
      entry = state.ravnEntry; depth = state.ravnDepth || 0;
    }
    route = location.hash;
    show(positions.get(entry) || {x: 0, y: 0});
  }
  window.addEventListener('popstate', historyChanged);
  window.addEventListener('hashchange', historyChanged);
  remember();
})();
