import { renderTabBar } from './core.js';
import * as pathTab from './tabs/path.js';
import * as portfolioTab from './tabs/portfolio.js';
import * as mirrorTab from './tabs/mirror.js';
import * as journalTab from './tabs/journal.js';
import * as meTab from './tabs/me.js';

// ============================================================
// ===== РЕГИСТРАЦИЯ ВКЛАДОК ==================================
// ============================================================
const TABS = {
  'path':      pathTab,
  'portfolio': portfolioTab,
  'mirror':    mirrorTab,
  'journal':   journalTab,
  'me':        meTab
};

// ============================================================
// ===== PUBLIC REFRESH HOOK ==================================
// ============================================================
// portfolio.js после загрузки дёргает window.kompasRefreshAll(),
// чтобы все зависимые вкладки перерисовались с новыми данными
window.kompasRefreshAll = () => {
  const map = {
    'tab-path':      pathTab,
    'tab-me':        meTab,
    'tab-mirror':    mirrorTab,
    'tab-journal':   journalTab
  };
  Object.entries(map).forEach(([id, mod]) => {
    const root = document.getElementById(id);
    if (root && mod.render) {
      try { mod.render(root); } catch (e) { console.warn('Refresh error', id, e); }
    }
  });
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