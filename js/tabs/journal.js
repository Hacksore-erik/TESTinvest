import { state, formatRub, parseMoney } from '../core.js';
import { analyzeJournal, OP_TYPES } from '../services.js';

// ============================================================
// ===== TEMPLATE =============================================
// ============================================================
export function template() {
  return `
    <div class="header">
      <div class="header-top">
        <div class="header-title-wrap">
          <h1>Журнал</h1>
          <span class="alfa-badge">DEV</span>
        </div>
        <div class="avatar">И</div>
      </div>
      <div class="subtitle">Дневник решений · не список сделок</div>
    </div>

    <div class="container">
      <div class="card card-hero fade-up">
        <div class="section-title blue">Статистика за год</div>
        <div class="row"><span class="lbl">Всего операций</span><span class="val" id="journalTotalOps">—</span></div>
        <div class="row"><span class="lbl">Покупок</span><span class="val green" id="journalBuys">—</span></div>
        <div class="row"><span class="lbl">Продаж</span><span class="val red" id="journalSells">—</span></div>
        <div class="row"><span class="lbl">Дивидендов и купонов</span><span class="val green" id="journalDividends">—</span></div>
      </div>

      <div class="section-header fade-up"><h2>Последние операции</h2></div>
      <div id="journalList">
        <div class="empty-state">
          <div class="icon">📖</div>
          <div class="title">Нет данных</div>
          <div class="desc">Подключи токен на вкладке «Портфель»</div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// ===== MOUNT ================================================
// ============================================================
export function mount(root) {
  root.innerHTML = template();
  render(root);
}

// ============================================================
// ===== RENDER ===============================================
// ============================================================
export function render(root) {
  const j = analyzeJournal(state.operations);

  root.querySelector('#journalTotalOps').textContent = j.total;
  root.querySelector('#journalBuys').textContent = j.buys;
  root.querySelector('#journalSells').textContent = j.sells;
  root.querySelector('#journalDividends').textContent = j.dividends;

  const container = root.querySelector('#journalList');

  if (state.operations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📖</div>
        <div class="title">Нет операций</div>
        <div class="desc">Подключи токен на вкладке «Портфель»</div>
      </div>
    `;
    return;
  }

  const sorted = [...state.operations]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  container.innerHTML = sorted.map(op => {
    const type = OP_TYPES[op.type] || 'Операция';
    const payment = parseMoney(op.payment);
    const date = op.date
      ? new Date(op.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—';
    const displayName = state.instrumentNames[op.figi] || op.figi || '—';
    const subName = op.figi && state.instrumentNames[op.figi] ? op.figi : '';
    const paymentClass = payment >= 0 ? 'green' : 'red';
    const sign = payment >= 0 ? '+' : '';

    return `
      <div class="journal-item tappable fade-up">
        <div class="journal-head">
          <div class="journal-type">${type}</div>
          <div class="journal-date">${date}</div>
        </div>
        <div class="journal-title">${displayName}</div>
        ${subName ? `<div class="journal-sub">${subName}</div>` : ''}
        <div class="journal-block">
          <div class="lbl">Сумма</div>
          <div class="txt ${paymentClass}">${sign}${formatRub(Math.abs(payment))}</div>
        </div>
      </div>
    `;
  }).join('');
}