import { state, loadProfile, saveProfile } from '../core.js';
import { switchTab } from '../core.js';
import { disconnect as portfolioDisconnect } from './portfolio.js';
import { logError } from '../logger.js';

// ============================================================
// ===== TEMPLATE =============================================
// ============================================================
export function template() {
  return `
    <style>
      .connection-status {
        display: flex !important;
        align-items: center;
        gap: 6px;
        margin-left: auto;
        font-size: 13px;
        font-weight: 600;
        color: #9A9A9E;
        transition: color 0.3s ease;
        flex-shrink: 0;
      }
      .connection-status.connected {
        color: #1EA85A !important;
      }
      .connection-status .status-dot {
        display: inline-block !important;
        width: 6px;
        height: 6px;
        min-width: 6px;
        min-height: 6px;
        border-radius: 50%;
        background: currentColor;
        flex-shrink: 0;
      }
      .connection-status.connected .status-dot {
        animation: status-breathe 4s ease-in-out infinite;
      }
    </style>

    <div class="profile-head">
      <div class="profile-avatar" id="profileAvatarBtn">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
        </svg>
        <img id="profileAvatarImg" alt="">
      </div>
      <div class="profile-name" id="profileNameBtn">Инвестор</div>
      <div class="profile-name-hint" id="profileNameHint">Нажми, чтобы изменить имя</div>
      <input type="file" id="profileAvatarInput" accept="image/*" style="display:none">
    </div>

    <div class="pro-card">
      <div class="pro-badge">PRO</div>
      <div class="pro-text">Больше возможностей</div>
      <div class="pro-soon">Скоро</div>
    </div>

    <div class="section-header"><h2>Подключения</h2></div>

    <div class="position" id="connectionRow">
      <div class="position-top">
        <div class="position-ticker">Т-Инвестиции</div>
        <div class="connection-status" id="connectionStatus">
          <span class="status-dot"></span>
          <span class="status-text">Не подключено</span>
        </div>
      </div>
      <div class="position-note"><span>Режим: только чтение</span></div>
    </div>

    <div class="position disabled">
      <div class="position-top">
        <div class="position-ticker">Другие брокеры</div>
        <div class="position-soon">🔒 Скоро</div>
      </div>
      <div class="position-note"><span>А-Инвестиции · Сбер · ВТБ · БКС</span></div>
    </div>

    <div class="position" id="disconnectBtn" style="display: none;">
      <div class="position-top">
        <div class="position-ticker" style="color: var(--accent-red);">Отключить</div>
      </div>
      <div class="position-note danger"><span>Удалить токен с устройства</span></div>
    </div>
  `;
}

// ============================================================
// ===== MOUNT ================================================
// ============================================================
export function mount(root) {
  const avatarBtn = root.querySelector('#profileAvatarBtn');
  const avatarInput = root.querySelector('#profileAvatarInput');
  const nameBtn = root.querySelector('#profileNameBtn');
  const connRow = root.querySelector('#connectionRow');
  const disconnBtn = root.querySelector('#disconnectBtn');

  // --- Аватар: загрузка фото ---
  avatarBtn.addEventListener('click', () => {
    avatarInput.click();
  });

  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Ограничим размер 2 МБ
    if (file.size > 2 * 1024 * 1024) {
      logError('E-DATA-003', 'Фото профиля слишком большое', { size: file.size });
      alert('Фото слишком большое. Выбери меньше 2 МБ.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const profile = loadProfile();
      profile.avatar = reader.result;
      saveProfile(profile);
      applyAvatar(root, profile.avatar);
    };
    reader.onerror = () => {
      logError('E-DATA-004', 'Не удалось прочитать файл', { name: file.name });
    };
    reader.readAsDataURL(file);
  });

  // --- Имя: редактирование ---
  nameBtn.addEventListener('click', () => startEditName(root));

  // --- Подключение ---
  connRow.addEventListener('click', () => switchTab('portfolio'));

  // --- Отключить ---
  disconnBtn.addEventListener('click', () => portfolioDisconnect());
}

// ============================================================
// ===== RENDER ===============================================
// ============================================================
export function render(root) {
  // Профиль из storage
  const profile = loadProfile();
  applyName(root, profile.name);
  applyAvatar(root, profile.avatar);

  // Статус подключения
  const connEl = root.querySelector('#connectionStatus');
  const textEl = connEl.querySelector('.status-text');
  const disconnEl = root.querySelector('#disconnectBtn');

  if (state.token && state.account) {
    connEl.classList.add('connected');
    textEl.textContent = 'Подключено';
    disconnEl.style.display = 'block';
  } else {
    connEl.classList.remove('connected');
    textEl.textContent = 'Не подключено';
    disconnEl.style.display = 'none';
  }
}

// ============================================================
// ===== ИМЯ ==================================================
// ============================================================
function applyName(root, name) {
  const nameBtn = root.querySelector('#profileNameBtn');
  if (nameBtn) nameBtn.textContent = name || 'Инвестор';
}

function startEditName(root) {
  const nameBtn = root.querySelector('#profileNameBtn');
  if (!nameBtn) return;

  const current = nameBtn.textContent.trim() || 'Инвестор';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'profile-name-input';
  input.value = current;
  input.maxLength = 30;

  nameBtn.replaceWith(input);
  input.focus();
  input.select();

  let finished = false;

  const finish = (save) => {
    if (finished) return;
    finished = true;

    const newName = (input.value || '').trim() || 'Инвестор';

    if (save) {
      const profile = loadProfile();
      profile.name = newName;
      saveProfile(profile);
    }

    const newBtn = document.createElement('div');
    newBtn.className = 'profile-name';
    newBtn.id = 'profileNameBtn';
    newBtn.textContent = save ? newName : current;
    newBtn.addEventListener('click', () => startEditName(root));

    input.replaceWith(newBtn);

    // Обновить инициал в шапке
    const headerAvatar = document.getElementById('profileHeaderAvatar');
    if (headerAvatar) {
      headerAvatar.textContent = (newBtn.textContent.trim()[0] || 'И').toUpperCase();
    }
  };

  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
}

// ============================================================
// ===== АВАТАР ===============================================
// ============================================================
function applyAvatar(root, dataUrl) {
  const avatarBtn = root.querySelector('#profileAvatarBtn');
  const avatarImg = root.querySelector('#profileAvatarImg');
  if (!avatarBtn || !avatarImg) return;

  if (dataUrl) {
    avatarImg.src = dataUrl;
    avatarBtn.classList.add('has-photo');
  } else {
    avatarImg.removeAttribute('src');
    avatarBtn.classList.remove('has-photo');
  }
}