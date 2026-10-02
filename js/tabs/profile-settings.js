import { CONFIG } from '../core.js';
import { getErrorCount, downloadLog, clearErrors } from '../logger.js';

// ============================================================
// ===== TEMPLATE =============================================
// ============================================================
export function template() {
  return `
    <div class="section-header"><h2>Приложение</h2></div>

    <div class="settings-group">
      <div class="settings-row disabled">
        <div class="icon">🎨</div>
        <div class="label">Тема</div>
        <div class="badge">Скоро</div>
      </div>
      <div class="settings-row disabled">
        <div class="icon">🔔</div>
        <div class="label">Уведомления</div>
        <div class="badge">Скоро</div>
      </div>
    </div>

    <div class="section-header"><h2>Помощь</h2></div>

    <div class="settings-group">
      <div class="settings-row disabled">
        <div class="icon">💬</div>
        <div class="label">Поддержка</div>
        <div class="badge">Скоро</div>
      </div>
    </div>

    <div class="section-header"><h2>О приложении</h2></div>

    <div class="settings-group">
      <div class="settings-row disabled" id="errorLogRow">
        <div class="icon">🐛</div>
        <div class="label">Журнал ошибок</div>
        <div class="badge" id="errorCount">0</div>
        <div class="chev">›</div>
      </div>
      <div class="settings-row" id="aboutRow">
        <div class="icon">ℹ️</div>
        <div class="label">О приложении</div>
        <div class="chev" id="aboutChev">›</div>
      </div>
      <div class="about-expand" id="aboutExpand">
        <div class="about-inner">
          <div class="about-logo">К</div>
          <div class="about-name">Компас</div>
          <div class="about-version">Версия ${CONFIG.VERSION} (${CONFIG.BUILD})</div>
          <div class="about-note">
            Инвестиционный навигатор для частных инвесторов на Мосбирже.<br>
            Режим только чтение. Не даёт инвестиционных рекомендаций.
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// ===== MOUNT ================================================
// ============================================================
export function mount(root) {
  const errorLogRow = root.querySelector('#errorLogRow');
  const aboutRow = root.querySelector('#aboutRow');
  const aboutExpand = root.querySelector('#aboutExpand');
  const aboutChev = root.querySelector('#aboutChev');

  // --- Журнал ошибок: тап = скачать, долгий тап = очистить ---
  initErrorLogInteractions(root, errorLogRow);

  // --- О приложении: раскрытие ---
  aboutRow.addEventListener('click', () => {
    const open = aboutExpand.classList.toggle('open');
    aboutChev.classList.toggle('open', open);
  });
}

// ============================================================
// ===== ЖУРНАЛ ОШИБОК: тап + долгий тап ======================
// ============================================================
function initErrorLogInteractions(root, row) {
  let pressTimer = null;
  let longPressed = false;
  let startX = 0;
  let startY = 0;

  const startPress = (e) => {
    if (row.classList.contains('disabled')) return;

    longPressed = false;

    // Запомним точку старта — для отмены по свайпу
    const point = e.touches ? e.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;

    pressTimer = setTimeout(() => {
      longPressed = true;

      // Haptic-отклик (iPhone)
      if (navigator.vibrate) navigator.vibrate(15);

      openClearModal(root);
    }, 500);
  };

  const cancelPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  const movePress = (e) => {
    if (!pressTimer) return;
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - startX;
    const dy = point.clientY - startY;
    // Ушёл дальше 12px — отмена
    if (Math.sqrt(dx * dx + dy * dy) > 12) {
      cancelPress();
    }
  };

  const endPress = (e) => {
    const wasTimerActive = pressTimer !== null;
    cancelPress();

    if (longPressed) {
      e.preventDefault();
      return;
    }

    // Если таймер ещё не сработал и это не был долгий тап — обычный тап
    if (wasTimerActive && !row.classList.contains('disabled')) {
      downloadLog();
    }
  };

  // Отключаем стандартное поведение iOS для долгого тапа
  row.style.webkitUserSelect = 'none';
  row.style.userSelect = 'none';
  row.style.webkitTouchCallout = 'none';
  row.style.touchAction = 'manipulation';

  // Запрет контекстного меню iOS (долгий тап по ссылкам/тексту)
  row.addEventListener('contextmenu', (e) => e.preventDefault());

  // Pointer Events — работают и на тач, и на мышь
  row.addEventListener('pointerdown', startPress, { passive: true });
  row.addEventListener('pointermove', movePress, { passive: true });
  row.addEventListener('pointerup', endPress, { passive: false });
  row.addEventListener('pointercancel', cancelPress, { passive: true });
  row.addEventListener('pointerleave', cancelPress, { passive: true });
}

// ============================================================
// ===== МОДАЛКА «ОЧИСТИТЬ ЖУРНАЛ» ============================
// ============================================================
function openClearModal(root) {
  if (root.querySelector('#errorClearModal')) return;

  const count = getErrorCount();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'errorClearModal';

  backdrop.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-title">Очистить журнал ошибок?</div>
      <div class="modal-desc">
        Будет удалено <span class="hl">${count}</span> ${plural(count, 'запись', 'записи', 'записей')}.
        Это действие нельзя отменить.
      </div>
      <div class="modal-actions">
        <button class="modal-btn cancel" id="errClearCancel">Отмена</button>
        <button class="modal-btn danger" id="errClearConfirm">Очистить</button>
      </div>
    </div>
  `;

  root.appendChild(backdrop);

  requestAnimationFrame(() => backdrop.classList.add('open'));

  const close = () => {
    backdrop.classList.remove('open');
    setTimeout(() => backdrop.remove(), 250);
  };

  backdrop.querySelector('#errClearCancel').addEventListener('click', close);

  backdrop.querySelector('#errClearConfirm').addEventListener('click', () => {
    clearErrors();
    close();
    setTimeout(() => render(root), 260);
  });

  // Тап на фон — закрыть
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
}

// ============================================================
// ===== RENDER ===============================================
// ============================================================
export function render(root) {
  const errorLogRow = root.querySelector('#errorLogRow');
  const errorCount = root.querySelector('#errorCount');
  if (!errorLogRow || !errorCount) return;

  const count = getErrorCount();
  errorCount.textContent = String(count);

  errorLogRow.classList.toggle('disabled', count === 0);
}

// ============================================================
// ===== СКЛОНЕНИЕ ============================================
// ============================================================
function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}