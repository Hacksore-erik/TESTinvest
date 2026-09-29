import { state } from '../core.js';
import * as profileData from './profile-data.js';
import * as profileSettings from './profile-settings.js';

// ============================================================
// ===== TEMPLATE =============================================
// ============================================================
export function template() {
  return `
    <div class="header">
      <div class="header-top">
        <div class="header-title-wrap">
          <h1>Профиль</h1>
          <span class="alfa-badge">DEV</span>
        </div>
        <div class="avatar" id="profileHeaderAvatar">И</div>
      </div>
      <div class="subtitle">Данные и настройки</div>
    </div>

    <div class="segmented" id="profileSegmented">
      <div class="segmented-thumb" id="profileThumb"></div>
      <button class="segment active" data-page="0">Данные</button>
      <button class="segment" data-page="1">Настройки</button>
    </div>

    <div class="pager-viewport" id="profilePager">
      <div class="pager-track" id="profileTrack">
        <div class="pager-page" id="profilePageData"></div>
        <div class="pager-page" id="profilePageSettings"></div>
      </div>
    </div>
  `;
}

// ============================================================
// ===== MOUNT ================================================
// ============================================================
let currentPage = 0;
let swipedBound = false;

export function mount(root) {
  root.innerHTML = template();

  const pageData = root.querySelector('#profilePageData');
  const pageSettings = root.querySelector('#profilePageSettings');

  // Вставляем содержимое страниц
  pageData.innerHTML = profileData.template();
  pageSettings.innerHTML = profileSettings.template();

  // Монтируем подмодули
  profileData.mount(pageData);
  profileSettings.mount(pageSettings);

  // Сегмент-контрол
  const segments = root.querySelectorAll('.segment');
  segments.forEach((seg, i) => {
    seg.addEventListener('click', () => setPage(root, i));
  });

  // Pager swipe
  initPagerSwipe(root);

  // Первичный рендер
  render(root);
}

// ============================================================
// ===== RENDER ===============================================
// ============================================================
export function render(root) {
  // Рендер подмодулей
  const pageData = root.querySelector('#profilePageData');
  const pageSettings = root.querySelector('#profilePageSettings');

  if (pageData) profileData.render(pageData);
  if (pageSettings) profileSettings.render(pageSettings);

  // Обновляем аватар в шапке (инициал из имени)
  updateHeaderAvatar(root);
}

// ============================================================
// ===== PAGER ================================================
// ============================================================
function setPage(root, page) {
  currentPage = page;

  const track = root.querySelector('#profileTrack');
  const thumb = root.querySelector('#profileThumb');
  const segments = root.querySelectorAll('.segment');

  if (track) track.style.transform = `translateX(-${page * 100}%)`;
  if (thumb) thumb.classList.toggle('right', page === 1);
  segments.forEach((s, i) => s.classList.toggle('active', i === page));
}

// ============================================================
// ===== SWIPE PAGER ==========================================
// ============================================================
function initPagerSwipe(root) {
  if (swipedBound) return;
  swipedBound = true;

  const pager = root.querySelector('#profilePager');
  if (!pager) return;

  let startX = 0;
  let startY = 0;
  let tracking = false;
  let horizontal = false;

  pager.addEventListener('touchstart', (e) => {
    if (e.target.closest('input, textarea')) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
    horizontal = false;
  }, { passive: true });

  pager.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    if (!horizontal && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      horizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (horizontal) e.preventDefault();
  }, { passive: false });

  pager.addEventListener('touchend', (e) => {
    if (!tracking) return;
    const dx = e.changedTouches[0].clientX - startX;
    const wasH = horizontal;
    tracking = false;
    horizontal = false;

    if (!wasH) return;
    if (dx < -50 && currentPage < 1) setPage(root, 1);
    else if (dx > 50 && currentPage > 0) setPage(root, 0);
  }, { passive: true });

  pager.addEventListener('touchcancel', () => {
    tracking = false;
    horizontal = false;
  }, { passive: true });
}

// ============================================================
// ===== HEADER AVATAR ========================================
// ============================================================
function updateHeaderAvatar(root) {
  const el = root.querySelector('#profileHeaderAvatar');
  if (!el) return;

  // Имя из localStorage
  let name = 'Инвестор';
  try {
    const raw = localStorage.getItem('kompas_profile');
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.name) name = data.name;
    }
  } catch (e) {}

  el.textContent = (name.trim()[0] || 'И').toUpperCase();
}