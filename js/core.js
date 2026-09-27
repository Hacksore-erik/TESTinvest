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
// ===== ROUTER ===============================================
// ============================================================
const TABS = [
  { id: 'path',      label: 'Путь',     icon: '🧭' },
  { id: 'portfolio', label: 'Портфель', icon: '📊' },
  { id: 'mirror',    label: 'Зеркало',  icon: '🪞' },
  { id: 'journal',   label: 'Журнал',   icon: '📖' },
  { id: 'me',        label: 'Я',        icon: '👤' }
];

let currentTab = 'path';

export function renderTabBar() {
  const bar = document.getElementById('tabBar');
  bar.innerHTML = TABS.map(t => `
    <button class="tab ${t.id === currentTab ? 'active' : ''}" data-tab="${t.id}">
      <div class="tab-icon">${t.icon}</div>
      <div class="tab-label">${t.label}</div>
    </button>
  `).join('');

  bar.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
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

  window.scrollTo({ top: 0, behavior: 'smooth' });
  haptic();
}

export function getCurrentTab() {
  return currentTab;
}