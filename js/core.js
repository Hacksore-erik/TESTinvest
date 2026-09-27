// ============================================================
// ===== STATE ================================================
// ============================================================
export const state = {
  token: null,
  account: null,
  portfolio: null,
  operations: [],
  totalValue: 0,
  investedValue: 0,
  instrumentNames: {}
};

export const CONFIG = {
  GOAL: 1000000,
  YEARS_LEFT: 3.25,
  API_URL: 'https://invest-public-api.tinkoff.ru/rest',
  TOKEN_KEY: 'kompas_token',
  REFRESH_MS: 30000
};

// ============================================================
// ===== UTILS ================================================
// ============================================================
export const formatRub = (value) =>
  Math.round(value).toLocaleString('ru-RU') + ' ₽';

export const formatPercent = (value) =>
  (value >= 0 ? '+' : '') + value.toFixed(1) + '%';

export const parseMoney = (value) => {
  if (!value) return 0;
  return parseFloat(value.units || 0) + (value.nano || 0) / 1e9;
};

export const haptic = () => {
  if (navigator.vibrate) navigator.vibrate(5);
};

// ============================================================
// ===== STORAGE ==============================================
// ============================================================
export function saveToken(token) {
  try { localStorage.setItem(CONFIG.TOKEN_KEY, token); } catch (e) {}
}

export function loadSavedToken() {
  try { return localStorage.getItem(CONFIG.TOKEN_KEY); } catch (e) { return null; }
}

export function clearToken() {
  try { localStorage.removeItem(CONFIG.TOKEN_KEY); } catch (e) {}
}

// ============================================================
// ===== SVG ICONS ============================================
// ============================================================
const ICONS = {
  path: `
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9"/>
      <path d="M15.5 8.5 L13.5 13.5 L8.5 15.5 L10.5 10.5 Z"/>
    </svg>
  `,
  portfolio: `
    <svg viewBox="0 0 24 24">
      <path d="M3 20h18"/>
      <rect x="4" y="13" width="4" height="6" rx="1"/>
      <rect x="10" y="9" width="4" height="10" rx="1"/>
      <rect x="16" y="5" width="4" height="14" rx="1"/>
    </svg>
  `,
  mirror: `
    <svg viewBox="0 0 24 24">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  `,
  journal: `
    <svg viewBox="0 0 24 24">
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4z"/>
      <path d="M5 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2"/>
      <path d="M9 9h6"/>
      <path d="M9 13h6"/>
    </svg>
  `,
  me: `
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
    </svg>
  `
};

// ============================================================
// ===== ROUTER ===============================================
// ============================================================
const TABS = [
  { id: 'path',      label: 'Путь',     icon: ICONS.path },
  { id: 'portfolio', label: 'Портфель', icon: ICONS.portfolio },
  { id: 'mirror',    label: 'Зеркало',  icon: ICONS.mirror },
  { id: 'journal',   label: 'Журнал',   icon: ICONS.journal },
  { id: 'me',        label: 'Я',        icon: ICONS.me }
];

let currentTab = 'path';

export function renderTabBar() {
  const bar = document.getElementById('tabBar');

  bar.innerHTML = `
    <div class="tab-indicator" id="tabIndicator"></div>
    ${TABS.map(t => `
      <button class="tab ${t.id === currentTab ? 'active' : ''}" data-tab="${t.id}">
        <div class="tab-icon">${t.icon}</div>
        <div class="tab-label">${t.label}</div>
      </button>
    `).join('')}
  `;

  bar.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Первичное позиционирование ползунка
  requestAnimationFrame(() => moveIndicator(currentTab));
}

function moveIndicator(tabId) {
  const indicator = document.getElementById('tabIndicator');
  const tab = document.querySelector(`.tab[data-tab="${tabId}"]`);
  if (!indicator || !tab) return;

  const tabRect = tab.getBoundingClientRect();
  const barRect = tab.parentElement.getBoundingClientRect();
  const offsetX = tabRect.left - barRect.left;

  indicator.style.width = tabRect.width + 'px';
  indicator.style.transform = `translateX(${offsetX}px)`;
}

export function switchTab(id) {
  if (!TABS.find(t => t.id === id)) return;
  currentTab = id;

  document.querySelectorAll('.tab-content').forEach(c =>
    c.classList.toggle('active', c.id === 'tab-' + id)
  );
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === id)
  );

  moveIndicator(id);

  window.scrollTo({ top: 0, behavior: 'smooth' });
  haptic();
}

export function getCurrentTab() {
  return currentTab;
}

// Пересчёт ползунка при повороте экрана / изменении размера
window.addEventListener('resize', () => moveIndicator(currentTab));