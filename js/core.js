import { initGlobalHandlers } from './logger.js';

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
  REFRESH_MS: 30000,
  VERSION: '0.3.0',
  BUILD: 'DEV'
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

const PROFILE_KEY = 'kompas_profile';

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { name: 'Инвестор', avatar: null };
    const data = JSON.parse(raw);
    return {
      name: data.name || 'Инвестор',
      avatar: data.avatar || null
    };
  } catch (e) {
    return { name: 'Инвестор', avatar: null };
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {}
}

// ============================================================
// ===== GLOBAL AVATAR (шапка всех вкладок) ===================
// ============================================================
export function applyGlobalAvatar() {
  const profile = loadProfile();
  const initial = ((profile.name || 'Инвестор').trim()[0] || 'И').toUpperCase();

  document.querySelectorAll('.header .avatar').forEach(el => {
    if (profile.avatar) {
      el.textContent = '';
      el.style.backgroundImage = `url(${profile.avatar})`;
      el.classList.add('has-photo');
    } else {
      el.textContent = initial;
      el.style.backgroundImage = '';
      el.classList.remove('has-photo');
    }
  });
}

// Реакция на изменение профиля
window.addEventListener('kompas:profile-changed', () => applyGlobalAvatar());

// ============================================================
// ===== SVG ICONS — outline + filled =========================
// ============================================================
const ICONS = {
  path: {
    outline: `
      <svg viewBox="0 0 24 24" class="ico-outline">
        <circle cx="12" cy="12" r="9"/>
        <path d="M15.5 8.5 L13.5 13.5 L8.5 15.5 L10.5 10.5 Z"/>
      </svg>
    `,
    filled: `
      <svg viewBox="0 0 24 24" class="ico-filled">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm3.5 6.5l-2 5-5 2 2-5 5-2z"/>
      </svg>
    `
  },
  portfolio: {
    outline: `
      <svg viewBox="0 0 24 24" class="ico-outline">
        <rect x="4" y="13" width="4" height="6" rx="1"/>
        <rect x="10" y="9" width="4" height="10" rx="1"/>
        <rect x="16" y="5" width="4" height="14" rx="1"/>
      </svg>
    `,
    filled: `
      <svg viewBox="0 0 24 24" class="ico-filled">
        <rect x="4" y="13" width="4" height="7" rx="1"/>
        <rect x="10" y="9" width="4" height="11" rx="1"/>
        <rect x="16" y="5" width="4" height="15" rx="1"/>
      </svg>
    `
  },
  mirror: {
    outline: `
      <svg viewBox="0 0 24 24" class="ico-outline">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    `,
    filled: `
      <svg viewBox="0 0 24 24" class="ico-filled">
        <path d="M12 5c-6.5 0-10 7-10 7s3.5 7 10 7 10-7 10-7-3.5-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
      </svg>
    `
  },
  journal: {
    outline: `
      <svg viewBox="0 0 24 24" class="ico-outline">
        <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4z"/>
        <path d="M5 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2"/>
        <path d="M9 9h6"/>
        <path d="M9 13h6"/>
      </svg>
    `,
    filled: `
      <svg viewBox="0 0 24 24" class="ico-filled">
        <path d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14V3H5zm3 4h8v2H8V7zm0 4h8v2H8v-2z"/>
      </svg>
    `
  },
  me: {
    outline: `
      <svg viewBox="0 0 24 24" class="ico-outline">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
      </svg>
    `,
    filled: `
      <svg viewBox="0 0 24 24" class="ico-filled">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1H4z"/>
      </svg>
    `
  }
};

// ============================================================
// ===== ROUTER ===============================================
// ============================================================
const TABS = [
  { id: 'path',      label: 'Путь',     icon: ICONS.path },
  { id: 'portfolio', label: 'Портфель', icon: ICONS.portfolio },
  { id: 'mirror',    label: 'Зеркало',  icon: ICONS.mirror },
  { id: 'journal',   label: 'Журнал',   icon: ICONS.journal },
  { id: 'me',        label: 'Профиль',  icon: ICONS.me }
];

const TAB_ORDER = TABS.map(t => t.id);

let currentTab = 'path';

const LONG_PRESS_MS = 180;
const DRAG_THRESHOLD = 8;

let barEl = null;
let isLongPressing = false;
let isDragging = false;
let pressTimer = null;
let pressStartX = 0;
let pressStartY = 0;
let pressedTabId = null;
let scrubbingTabId = null;
let dragJustEnded = false;

export function renderTabBar() {
  barEl = document.getElementById('tabBar');

  barEl.innerHTML = `
    <div class="tab-indicator" id="tabIndicator"></div>
    ${TABS.map(t => `
      <button class="tab ${t.id === currentTab ? 'active' : ''}" data-tab="${t.id}">
        <div class="tab-icon">
          ${t.icon.outline}
          ${t.icon.filled}
        </div>
        <div class="tab-label">${t.label}</div>
      </button>
    `).join('')}
  `;

  barEl.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (dragJustEnded) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      switchTab(btn.dataset.tab);
    });
  });

  initScrubbing();

  setTimeout(() => moveIndicator(currentTab), 0);
  setTimeout(() => moveIndicator(currentTab), 100);
  setTimeout(() => moveIndicator(currentTab), 400);
}

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
    void indicator.offsetWidth;
    indicator.style.transition = '';
  }
}

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

  if (isLongPressing && !isDragging && dist > DRAG_THRESHOLD * 2) {
    if (Math.abs(dy) > Math.abs(dx)) {
      cancelPress();
      return;
    }
  }

  if (isLongPressing && !isDragging && Math.abs(dx) > DRAG_THRESHOLD) {
    clearTimeout(pressTimer);
    enterDragMode();
  }

  if (!isDragging) return;

  const hoveredTabId = getTabAtX(t.clientX);

  if (hoveredTabId && hoveredTabId !== scrubbingTabId) {
    scrubbingTabId = hoveredTabId;
    moveIndicator(hoveredTabId, false);
    barEl.querySelectorAll('.tab').forEach(el => {
      el.classList.toggle('scrub-hover', el.dataset.tab === hoveredTabId);
    });
    haptic(3);
  }
}

function onTouchEnd(e) {
  if (isDragging) {
    const finalTabId = scrubbingTabId || pressedTabId;

    barEl.classList.remove('scrubbing');
    barEl.querySelectorAll('.tab').forEach(el => el.classList.remove('scrub-hover'));

    isDragging = false;
    isLongPressing = false;
    scrubbingTabId = null;

    dragJustEnded = true;
    setTimeout(() => { dragJustEnded = false; }, 50);

    if (finalTabId && finalTabId !== currentTab) {
      switchTab(finalTabId);
    } else if (finalTabId) {
      moveIndicator(currentTab);
    }

    if (e.cancelable) e.preventDefault();
    return;
  }

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

function enterDragMode() {
  isDragging = true;
  isLongPressing = false;
  barEl.classList.add('scrubbing');

  const startTabId = getTabAtX(pressStartX) || pressedTabId;
  if (startTabId) {
    scrubbingTabId = startTabId;
    moveIndicator(startTabId, false);
    barEl.querySelectorAll('.tab').forEach(el => {
      el.classList.toggle('scrub-hover', el.dataset.tab === startTabId);
    });
  }
  haptic(8);
}

function getTabAtX(clientX) {
  if (!barEl) return null;
  const tabs = barEl.querySelectorAll('.tab');
  for (const tab of tabs) {
    const rect = tab.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right) {
      return tab.dataset.tab;
    }
  }
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

  // Обновить аватары в шапке (после отрисовки новой вкладки)
  setTimeout(applyGlobalAvatar, 0);
}

export function getCurrentTab() {
  return currentTab;
}

export function getTabOrder() {
  return TAB_ORDER.slice();
}

window.addEventListener('resize', () => moveIndicator(currentTab));
window.addEventListener('orientationchange', () =>
  setTimeout(() => moveIndicator(currentTab), 100));
window.addEventListener('load', () => moveIndicator(currentTab));

// ============================================================
// ===== STICKY HEADER (сжатие при скролле) ===================
// ============================================================
const SCROLL_THRESHOLD = 70;
let headerTicking = false;

function lerp(from, to, t) {
  return from + (to - from) * t;
}

export function initStickyHeader() {
  updateHeader();
}

function updateHeader() {
  const header = document.querySelector('.tab-content.active .header');
  if (!header) {
    headerTicking = false;
    return;
  }

  const titleEl = header.querySelector('h1');
  const badgeEl = header.querySelector('.alfa-badge');
  const subtitleEl = header.querySelector('.subtitle');
  const avatarEl = header.querySelector('.avatar');

  const y = window.scrollY || window.pageYOffset || 0;
  const rawProgress = Math.min(Math.max(y / SCROLL_THRESHOLD, 0), 1);
  const p = 1 - Math.pow(1 - rawProgress, 3);

  if (titleEl) {
    titleEl.style.fontSize = lerp(34, 22, p).toFixed(2) + 'px';
    titleEl.style.letterSpacing = lerp(-0.028, -0.032, p).toFixed(4) + 'em';
  }
  if (badgeEl) {
    badgeEl.style.fontSize      = lerp(10, 9, p).toFixed(2) + 'px';
    badgeEl.style.paddingTop    = lerp(4, 3, p).toFixed(2) + 'px';
    badgeEl.style.paddingBottom = lerp(4, 3, p).toFixed(2) + 'px';
    badgeEl.style.paddingLeft   = lerp(9, 7, p).toFixed(2) + 'px';
    badgeEl.style.paddingRight  = lerp(9, 7, p).toFixed(2) + 'px';
    badgeEl.style.transform     = 'translateY(' + lerp(-4, -2, p).toFixed(2) + 'px)';
  }
  if (subtitleEl) {
    subtitleEl.style.opacity   = Math.max(0, 1 - p * 1.2).toFixed(3);
    subtitleEl.style.maxHeight = Math.max(0, 24 - p * 24).toFixed(2) + 'px';
  }
  if (avatarEl) {
    const size = lerp(40, 34, p);
    avatarEl.style.width    = size.toFixed(2) + 'px';
    avatarEl.style.height   = size.toFixed(2) + 'px';
    avatarEl.style.fontSize = lerp(15, 13, p).toFixed(2) + 'px';
  }
  header.style.paddingTop = 'calc(env(safe-area-inset-top, 14px) + ' + lerp(12, 6, p).toFixed(2) + 'px)';
  header.style.paddingBottom = lerp(12, 8, p).toFixed(2) + 'px';
  header.classList.toggle('scrolled', rawProgress > 0.05);

  headerTicking = false;
}

function onHeaderScroll() {
  if (!headerTicking) {
    requestAnimationFrame(updateHeader);
    headerTicking = true;
  }
}

window.addEventListener('scroll', onHeaderScroll, { passive: true });

// ============================================================
// ===== SWIPE NAVIGATION =====================================
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
    if (e.target.closest('.tab-bar')) return;
    if (e.target.closest('.pager-viewport')) return;
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

// ============================================================
// ===== INIT GLOBAL ERROR HANDLERS ===========================
// ============================================================
initGlobalHandlers();

// ============================================================
// ===== INIT GLOBAL AVATAR ===================================
// ============================================================
applyGlobalAvatar();