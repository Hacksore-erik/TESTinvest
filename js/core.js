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

export const haptic = (ms = 5) => {
  if (navigator.vibrate) navigator.vibrate(ms);
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

const TAB_ORDER = TABS.map(t => t.id);

let currentTab = 'path';

// ------------------------------------------------------------
// Long-press + drag состояние
// ------------------------------------------------------------
const LONG_PRESS_MS = 180;      // через сколько зажим активируется
const DRAG_THRESHOLD = 8;        // px — минимальное движение, чтобы считать drag

let barEl = null;
let isLongPressing = false;      // ждём срабатывания таймера
let isDragging = false;          // уже в режиме drag
let pressTimer = null;
let pressStartX = 0;
let pressStartY = 0;
let pressedTabId = null;
let scrubbingTabId = null;       // на какой вкладке сейчас палец при drag

export function renderTabBar() {
  barEl = document.getElementById('tabBar');

  barEl.innerHTML = `
    <div class="tab-indicator" id="tabIndicator"></div>
    ${TABS.map(t => `
      <button class="tab ${t.id === currentTab ? 'active' : ''}" data-tab="${t.id}">
        <div class="tab-icon">${t.icon}</div>
        <div class="tab-label">${t.label}</div>
      </button>
    `).join('')}
  `;

  // --- Клики (для тапа без зажатия) ---
  barEl.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Если был drag — клик игнорируем (иначе сработает второе переключение)
      if (dragJustEnded) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      switchTab(btn.dataset.tab);
    });
  });

  // --- Long-press + drag ---
  initScrubbing();

  // Первичное позиционирование ползунка
  setTimeout(() => moveIndicator(currentTab), 0);
  setTimeout(() => moveIndicator(currentTab), 100);
  setTimeout(() => moveIndicator(currentTab), 400);
}

// ------------------------------------------------------------
// Позиция ползунка
// ------------------------------------------------------------
function moveIndicator(tabId, animated = true) {
  const indicator = document.getElementById('tabIndicator');
  if (!indicator || !barEl) return;

  const tab = barEl.querySelector(`.tab[data-tab="${tabId}"]`);
  if (!tab) return;

  const barRect = barEl.getBoundingClientRect();
  const tabRect = tab.getBoundingClientRect();

  const offsetX = tabRect.left - barRect.left;
  const width = tabRect.width;

  if (!animated) indicator.style.transition = 'none';
  indicator.style.width = width + 'px';
  indicator.style.transform = `translateX(${offsetX}px)`;
  if (!animated) {
    // форсируем reflow, чтобы transition применился снова
    void indicator.offsetWidth;
    indicator.style.transition = '';
  }
}

// ------------------------------------------------------------
// Long-press scrubbing
// ------------------------------------------------------------
function initScrubbing() {
  barEl.style.touchAction = 'none';
  barEl.style.userSelect = 'none';
  barEl.style.webkitUserSelect = 'none';

  barEl.addEventListener('touchstart', onTouchStart, { passive: false });
  barEl.addEventListener('touchmove', onTouchMove, { passive: false });
  barEl.addEventListener('touchend', onTouchEnd);
  barEl.addEventListener('touchcancel', onTouchCancel);
}

function onTouchStart(e) {
  if (e.touches.length !== 1) return;

  const t = e.touches[0];
  const targetTab = e.target.closest('.tab');
  if (!targetTab) return;

  pressStartX = t.clientX;
  pressStartY = t.clientY;
  pressedTabId = targetTab.dataset.tab;
  isLongPressing = true;
  isDragging = false;
  scrubbingTabId = null;

  // Запускаем таймер long-press
  pressTimer = setTimeout(() => {
    if (!isLongPressing) return;
    enterDragMode();
  }, LONG_PRESS_MS);
}

function onTouchMove(e) {
  if (!isLongPressing && !isDragging) return;
  if (e.touches.length !== 1) return;

  e.preventDefault();

  const t = e.touches[0];
  const dx = t.clientX - pressStartX;
  const dy = t.clientY - pressStartY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Если палец ушёл вертикально до срабатывания long-press — отменяем
  if (isLongPressing && !isDragging && dist > DRAG_THRESHOLD * 2) {
    if (Math.abs(dy) > Math.abs(dx)) {
      cancelPress();
      return;
    }
  }

  // Если ещё не в drag, но начал двигаться горизонтально — ускоряем вход
  if (isLongPressing && !isDragging && Math.abs(dx) > DRAG_THRESHOLD) {
    clearTimeout(pressTimer);
    enterDragMode();
  }

  if (!isDragging) return;

  // Определяем вкладку под пальцем
  const hoveredTabId = getTabAtX(t.clientX);

  if (hoveredTabId && hoveredTabId !== scrubbingTabId) {
    scrubbingTabId = hoveredTabId;
    moveIndicator(hoveredTabId, false);
    // Подсветить иконку
    barEl.querySelectorAll('.tab').forEach(el => {
      el.classList.toggle('scrub-hover', el.dataset.tab === hoveredTabId);
    });
    haptic(3);
  }
}

function onTouchEnd(e) {
  if (isDragging) {
    // Завершаем drag — переключаем вкладку, на которой палец
    const finalTabId = scrubbingTabId || pressedTabId;

    barEl.classList.remove('scrubbing');
    barEl.querySelectorAll('.tab').forEach(el => el.classList.remove('scrub-hover'));

    isDragging = false;
    isLongPressing = false;
    scrubbingTabId = null;

    // Флаг: клик, который сейчас придёт от touchend, надо проигнорировать
    dragJustEnded = true;
    setTimeout(() => { dragJustEnded = false; }, 50);

    if (finalTabId && finalTabId !== currentTab) {
      switchTab(finalTabId);
    } else if (finalTabId) {
      // Уже на этой вкладке — просто вернуть ползунок на место
      moveIndicator(currentTab);
    }

    if (e.cancelable) e.preventDefault();
    return;
  }

  // Отпустили до срабатывания long-press — обычный тап, отдаём клику
  cancelPress();
}

function onTouchCancel() {
  cancelPress();
  if (isDragging) {
    barEl.classList.remove('scrubbing');
    barEl.querySelectorAll('.tab').forEach(el => el.classList.remove('scrub-hover'));
    isDragging = false;
    scrubbingTabId = null;
    moveIndicator(currentTab);
  }
}

function cancelPress() {
  clearTimeout(pressTimer);
  pressTimer = null;
  isLongPressing = false;
  pressedTabId = null;
}

// ------------------------------------------------------------
// Вход в режим «скраббинга»
// ------------------------------------------------------------
function enterDragMode() {
  isDragging = true;
  isLongPressing = false;

  barEl.classList.add('scrubbing');

  // Начинаем со вкладки, на которой палец
  const startTabId = getTabAtX(pressStartX) || pressedTabId;
  if (startTabId) {
    scrubbingTabId = startTabId;
    moveIndicator(startTabId, false);

    barEl.querySelectorAll('.tab').forEach(el => {
      el.classList.toggle('scrub-hover', el.dataset.tab === startTabId);
    });
  }

  // Лёгкая вибрация — сигнал, что режим активен
  haptic(8);
}

// ------------------------------------------------------------
// Какая вкладка под координатой X
// ------------------------------------------------------------
function getTabAtX(clientX) {
  if (!barEl) return null;
  const tabs = barEl.querySelectorAll('.tab');
  for (const tab of tabs) {
    const rect = tab.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right) {
      return tab.dataset.tab;
    }
  }
  // Если левее первой — вернуть первую, правее последней — последнюю
  const first = tabs[0];
  const last = tabs[tabs.length - 1];
  if (first && last) {
    const firstRect = first.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    if (clientX < firstRect.left) return first.dataset.tab;
    if (clientX > lastRect.right) return last.dataset.tab;
  }
  return null;
}

// Флаг: клик, который прилетит после drag, надо проигнорировать
let dragJustEnded = false;

// ------------------------------------------------------------
// Публичные функции роутера
// ------------------------------------------------------------
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
  haptic(5);
}

export function getCurrentTab() {
  return currentTab;
}

export function getTabOrder() {
  return TAB_ORDER.slice();
}

// Пересчёт при изменениях layout
window.addEventListener('resize', () => moveIndicator(currentTab));
window.addEventListener('orientationchange', () =>
  setTimeout(() => moveIndicator(currentTab), 100));
window.addEventListener('load', () => moveIndicator(currentTab));

// ============================================================
// ===== SWIPE NAVIGATION (по контенту) =======================
// ============================================================
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isTracking = false;
let isHorizontalSwipe = false;

const SWIPE_THRESHOLD_X = 50;
const SWIPE_THRESHOLD_Y = 50;
const SWIPE_MAX_TIME = 700;

function initSwipe() {
  const app = document.querySelector('.app');
  if (!app) return;

  app.addEventListener('touchstart', (e) => {
    // Таб-бар обрабатывается скраббингом — не мешаем
    if (e.target.closest('.tab-bar')) return;
    if (e.target.closest('input, textarea')) {
      isTracking = false;
      return;
    }

    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = Date.now();
    isTracking = true;
    isHorizontalSwipe = false;
  }, { passive: true });

  app.addEventListener('touchmove', (e) => {
    if (!isTracking) return;

    const t = e.touches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;

    if (!isHorizontalSwipe && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);
    }

    if (!isHorizontalSwipe && Math.abs(dy) > SWIPE_THRESHOLD_Y) {
      isTracking = false;
    }
  }, { passive: true });

  app.addEventListener('touchend', (e) => {
    if (!isTracking) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const dt = Date.now() - touchStartTime;

    const wasHorizontal = isHorizontalSwipe;
    isTracking = false;
    isHorizontalSwipe = false;

    if (!wasHorizontal) return;
    if (dt > SWIPE_MAX_TIME) return;
    if (Math.abs(dy) > SWIPE_THRESHOLD_Y) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD_X) return;

    const currentIndex = TAB_ORDER.indexOf(currentTab);

    if (dx < 0 && currentIndex < TAB_ORDER.length - 1) {
      switchTab(TAB_ORDER[currentIndex + 1]);
    } else if (dx > 0 && currentIndex > 0) {
      switchTab(TAB_ORDER[currentIndex - 1]);
    }
  }, { passive: true });

  app.addEventListener('touchcancel', () => {
    isTracking = false;
    isHorizontalSwipe = false;
  }, { passive: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSwipe);
} else {
  initSwipe();
}