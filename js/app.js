import { renderTabBar } from './core.js';
import * as pathTab from './tabs/path.js';
import * as portfolioTab from './tabs/portfolio.js';
import * as meTab from './tabs/me.js';

// ============================================================
// ===== ЗАГЛУШКИ ДЛЯ MIRROR / JOURNAL ========================
// ============================================================
function placeholderMount(title) {
  return (root) => {
    root.innerHTML = `
      <div class="header">
        <div class="header-top">
          <div class="header-title-wrap">
            <h1>${title}</h1>
            <span class="alfa-badge">Alfa</span>
          </div>
          <div class="avatar">АК</div>
        </div>
      </div>
      <div class="container">
        <div class="card card-neutral">
          <div class="empty-state">
            <div class="icon">🚧</div>
            <div class="title">Вкладка в разработке</div>
            <div class="desc">Наполним на Шаге 4</div>
          </div>
        </div>
      </div>
    `;
  };
}

// ============================================================
// ===== РЕГИСТРАЦИЯ ВКЛАДОК ==================================
// ============================================================
const TABS = {
  'path':      pathTab,
  'portfolio': portfolioTab,
  'mirror':    { mount: placeholderMount('Зеркало') },
  'journal':   { mount: placeholderMount('Журнал') },
  'me':        meTab
};

// ============================================================
// ===== PUBLIC REFRESH HOOK ==================================
// ============================================================
// portfolio.js после загрузки дёргает window.kompasRefreshAll(),
// чтобы "Путь" и "Я" перерисовались с новыми данными
window.kompasRefreshAll = () => {
  const pathRoot = document.getElementById('tab-path');
  const meRoot = document.getElementById('tab-me');
  if (pathRoot && pathTab.render) pathTab.render(pathRoot);
  if (meRoot && meTab.render) meTab.render(meRoot);
};

// ============================================================
// ===== INIT =================================================
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  renderTabBar();

  Object.entries(TABS).forEach(([id, mod]) => {
    const root = document.getElementById('tab-' + id);
    if (root && mod.mount) {
      try {
        mod.mount(root);
      } catch (e) {
        console.error('Ошибка монтирования вкладки', id, e);
        root.innerHTML = `<div class="container"><div class="card card-neutral"><div class="empty-state"><div class="icon">⚠️</div><div class="title">Ошибка загрузки вкладки</div><div class="desc">${e.message}</div></div></div></div>`;
      }
    }
  });
});