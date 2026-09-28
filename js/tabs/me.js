import { state, CONFIG, formatRub, switchTab } from '../core.js';
import { calculateTax } from '../services.js';
import { disconnect as portfolioDisconnect } from './portfolio.js';

// ============================================================
// ===== TEMPLATE =============================================
// ============================================================
export function template() {
  return `
    <div class="header">
      <div class="header-top">
        <div class="header-title-wrap">
          <h1>Я</h1>
          <span class="alfa-badge">Alfa</span>
        </div>
        <div class="avatar">АК</div>
      </div>
      <div class="subtitle">Налоги, цели, настройки</div>
    </div>

    <div class="container">
      <div class="card card-yellow fade-up">
        <div class="section-title yellow">Налоги 2026</div>
        <div class="row"><span class="lbl">Инвестиционный доход</span><span class="val" id="taxIncome">—</span></div>
        <div class="row"><span class="lbl">Прогноз налога</span><span class="val" id="taxForecast">—</span></div>
        <div class="row"><span class="lbl">Уже начислено</span><span class="val" id="taxAccrued">—</span></div>
        <div class="divider"></div>
        <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-tertiary); margin-bottom: 10px;">Прогрессивная шкала</div>
        <div class="tax-scale" id="taxScale">
          <div class="bracket-row" data-bracket="13"><span>до 2,4 млн</span><span>13%</span></div>
          <div class="bracket-row" data-bracket="15"><span>2,4–5 млн</span><span>15%</span></div>
          <div class="bracket-row" data-bracket="18"><span>5–20 млн</span><span>18%</span></div>
        </div>
        <div class="tax-note" id="taxNote">Подключи токен, чтобы увидеть расчёт налога по твоим операциям.</div>
      </div>

      <div class="card card-red fade-up">
        <div class="section-title red">Цена твоих решений за год</div>
        <div class="row"><span class="lbl">Комиссии</span><span class="val" id="costCommissions">—</span></div>
        <div class="row"><span class="lbl">Налог</span><span class="val" id="costTax">—</span></div>
        <div class="row"><span class="lbl">Упущено для цели</span><span class="val" id="costMissed">—</span></div>
        <div class="cost-total">
          <span class="lbl">Итого — цена решений</span>
          <span class="val" id="costTotal">—</span>
        </div>
      </div>

      <div class="section-header fade-up"><h2>Мои цели</h2></div>
      <div class="position tappable fade-up">
        <div class="position-top">
          <div class="position-ticker">🏠 Квартира</div>
          <div class="position-share" id="goal1Share">—</div>
        </div>
        <div class="position-bar"><div class="position-bar-fill green" id="goal1Bar" style="width: 0%"></div></div>
        <div class="position-note"><span id="goal1Note">1 000 000 ₽ к 31.12.2029</span></div>
      </div>

      <div class="section-header fade-up"><h2>Подключения</h2></div>

      <div class="position tappable fade-up" id="connectionRow">
        <div class="position-top">
          <div class="position-ticker">Т-Инвестиции</div>
          <div class="position-share" id="connectionStatus" style="color: var(--text-tertiary); font-size: 13px;">● Не подключено</div>
        </div>
        <div class="position-note"><span>Режим: только чтение</span></div>
      </div>

      <div class="position disabled fade-up">
        <div class="position-top">
          <div class="position-ticker">Другие брокеры</div>
          <div class="position-share position-soon">🔒 Скоро</div>
        </div>
        <div class="position-note"><span>А-Инвестиции · Сбер · ВТБ · БКС</span></div>
      </div>

      <div class="position tappable fade-up" id="disconnectBtn" style="display: none;">
        <div class="position-top">
          <div class="position-ticker" style="color: var(--accent-red);">Отключить</div>
        </div>
        <div class="position-note danger"><span>Удалить токен с устройства</span></div>
      </div>
    </div>
  `;
}

// ============================================================
// ===== MOUNT ================================================
// ============================================================
export function mount(root) {
  root.innerHTML = template();

  root.querySelector('#connectionRow').addEventListener('click', () => switchTab('portfolio'));
  root.querySelector('#disconnectBtn').addEventListener('click', () => portfolioDisconnect());

  render(root);
}

// ============================================================
// ===== RENDER ===============================================
// ============================================================
export function render(root) {
  const hasData = state.operations.length > 0 || state.totalValue > 0;

  const connEl = root.querySelector('#connectionStatus');
  const disconnEl = root.querySelector('#disconnectBtn');
  if (state.token && state.account) {
    connEl.textContent = '● Подключено';
    connEl.style.color = 'var(--accent-green)';
    disconnEl.style.display = 'block';
  } else {
    connEl.textContent = '● Не подключено';
    connEl.style.color = 'var(--text-tertiary)';
    disconnEl.style.display = 'none';
  }

  const progress = Math.min((state.totalValue / CONFIG.GOAL) * 100, 100);
  root.querySelector('#goal1Share').textContent = progress.toFixed(0) + '%';
  root.querySelector('#goal1Bar').style.width = progress + '%';
  root.querySelector('#goal1Note').textContent =
    `${formatRub(state.totalValue)} из ${formatRub(CONFIG.GOAL)}`;

  if (hasData) {
    const taxData = calculateTax(state.operations);
    root.querySelector('#taxIncome').textContent = formatRub(taxData.totalIncome);
    root.querySelector('#taxForecast').textContent = formatRub(taxData.tax);
    root.querySelector('#taxAccrued').textContent =
      formatRub(Math.min(taxData.totalIncome, 2400000) * 0.13);

    root.querySelectorAll('.bracket-row').forEach(row => {
      const bracket = parseInt(row.dataset.bracket);
      row.classList.toggle('active', bracket === taxData.activeBracket);
    });

    const note = root.querySelector('#taxNote');
    if (taxData.totalIncome > 2400000) {
      const extra = taxData.tax - Math.min(taxData.totalIncome, 2400000) * 0.13;
      note.innerHTML = `Ты превысил порог 2,4 млн ₽.<br>Доплатить самостоятельно: <span class="hl">${formatRub(extra)}</span>.`;
    } else if (taxData.totalIncome > 2000000) {
      note.innerHTML = `Ты близко к порогу 2,4 млн ₽.<br>Прогноз налога: <span class="hl">${formatRub(taxData.tax)}</span>.`;
    } else {
      note.innerHTML = `Инвестиционный доход в пределах порога 2,4 млн ₽.<br>Ставка: <span class="hl">13%</span>.`;
    }

    root.querySelector('#costCommissions').textContent = formatRub(taxData.commissions);
    root.querySelector('#costTax').textContent = formatRub(taxData.tax);
    root.querySelector('#costMissed').textContent = formatRub(state.totalValue * 0.05);
    root.querySelector('#costTotal').textContent =
      formatRub(taxData.commissions + taxData.tax + state.totalValue * 0.05);
  }
}