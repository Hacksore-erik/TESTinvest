import { CONFIG } from '../core.js';
import { getErrorCount, downloadLog } from '../logger.js';

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

  // --- Журнал ошибок ---
  errorLogRow.addEventListener('click', () => {
    if (errorLogRow.classList.contains('disabled')) return;
    downloadLog();
  });

  // --- О приложении: раскрытие ---
  aboutRow.addEventListener('click', () => {
    const open = aboutExpand.classList.toggle('open');
    aboutChev.classList.toggle('open', open);
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

  // Если ошибок нет — строка серая, неактивная
  errorLogRow.classList.toggle('disabled', count === 0);
}