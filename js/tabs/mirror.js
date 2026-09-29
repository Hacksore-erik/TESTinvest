import { state, formatRub } from '../core.js';
import { analyzeMirror, calculateTax } from '../services.js';

// ============================================================
// ===== TEMPLATE =============================================
// ============================================================
export function template() {
  return `
    <div class="header">
      <div class="header-top">
        <div class="header-title-wrap">
          <h1>Зеркало</h1>
          <span class="alfa-badge">DEV</span>
        </div>
        <div class="avatar">ЭМ</div>
      </div>
      <div class="subtitle">Честная картина твоего поведения</div>
    </div>

    <div class="container">
      <div class="hint-bar fade-up">
        <div class="icon">🪞</div>
        <div class="text">Это <span class="hl">не обвинения</span>. Это закономерности, которые стоят тебе денег и времени.</div>
      </div>

      <div class="card card-neutral fade-up">
        <div class="mirror-title">Ты рано фиксируешь прибыль и долго держишь убытки</div>
        <div class="row"><span class="lbl">Средняя прибыль</span><span class="val green" id="avgProfit">—</span></div>
        <div class="row"><span class="lbl">Средний убыток</span><span class="val red" id="avgLoss">—</span></div>
        <div class="mirror-footer" id="dispositionFooter">Подключи токен, чтобы увидеть свои паттерны.</div>
      </div>

      <div class="card card-neutral fade-up">
        <div class="mirror-title">Ты слишком много торгуешь</div>
        <div class="row"><span class="lbl">Сделок за год</span><span class="val" id="tradesCount">—</span></div>
        <div class="row"><span class="lbl">Комиссии за год</span><span class="val yellow" id="commissionTotal">—</span></div>
        <div class="mirror-footer" id="overtradingFooter">Подключи токен для анализа.</div>
      </div>

      <div class="card card-neutral fade-up">
        <div class="mirror-title">Ты держишь яйца в двух корзинах</div>
        <div class="row"><span class="lbl">Топ-2 бумаги</span><span class="val yellow" id="top2Share">—</span></div>
        <div class="row"><span class="lbl">Топ-5 бумаг</span><span class="val" id="top5Share">—</span></div>
        <div class="mirror-footer" id="concentrationFooter">Подключи токен для анализа.</div>
      </div>

      <div class="card card-neutral fade-up">
        <div class="mirror-title">Ты чаще проверяешь портфель, когда он падает</div>
        <div class="row"><span class="lbl">Сделок в дни роста</span><span class="val" id="checksGrowth">—</span></div>
        <div class="row"><span class="lbl">Сделок в дни падения</span><span class="val red" id="checksFall">—</span></div>
        <div class="mirror-footer" id="checkingPatternFooter">Подключи токен, чтобы увидеть анализ твоих операций.</div>
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
  const m = analyzeMirror(state.operations);

  // Диспозиция
  if (m.sells > 0) {
    root.querySelector('#avgProfit').textContent = formatRub(m.avgProfit);
    root.querySelector('#avgLoss').textContent = '−' + formatRub(m.avgLoss);
    root.querySelector('#dispositionFooter').innerHTML =
      `На основе <span class="hl">${m.sells} продаж</span> за период. ${
        m.avgLoss > m.avgProfit
          ? 'Ты фиксируешь убытки больше, чем прибыль.'
          : 'У тебя положительное соотношение прибыли и убытков.'
      }`;
  }

  // Овертрейдинг
  root.querySelector('#tradesCount').textContent = m.tradesPerYear;
  root.querySelector('#commissionTotal').textContent = formatRub(m.commissionsTotal);
  root.querySelector('#overtradingFooter').innerHTML = m.tradesPerYear > 50
    ? `<span class="hl">${m.tradesPerYear} операций</span> за год. Средний инвестор совершает 40.`
    : `${m.tradesPerYear} операций за год. Это в пределах нормы.`;

  // Концентрация
  if (state.portfolio) {
    root.querySelector('#top2Share').textContent = m.top2Share.toFixed(0) + '%';
    root.querySelector('#top5Share').textContent = m.top5Share.toFixed(0) + '%';

    const risk = m.top2Share > 40 ? 'высокая' : m.top2Share > 25 ? 'умеренная' : 'низкая';
    root.querySelector('#concentrationFooter').innerHTML =
      `Концентрация топ-2: <span class="hl">${m.top2Share.toFixed(0)}%</span>. Риск: ${risk}.`;
  }

  // Поведение в дни падения
  root.querySelector('#checksGrowth').textContent = m.growthDays + ' дней';
  root.querySelector('#checksFall').textContent = m.fallDays + ' дней';

  if (m.growthDays + m.fallDays >= 5) {
    const ratio = m.fallDays / Math.max(m.growthDays, 1);
    root.querySelector('#checkingPatternFooter').innerHTML = ratio > 1.5
      ? `Ты активнее в дни падения в <span class="hl">${ratio.toFixed(1)} раз</span>. Это эмоциональная реакция.`
      : `Ты сохраняешь спокойствие в дни падения. Хороший признак.`;
  } else {
    root.querySelector('#checkingPatternFooter').innerHTML =
      `Недостаточно данных. Нужно минимум <span class="hl">5 дней</span> с операциями.`;
  }

  // Цена решений
  renderCost(root);
}

// ============================================================
// ===== ЦЕНА РЕШЕНИЙ =========================================
// ============================================================
function renderCost(root) {
  const hasData = state.operations.length > 0 || state.totalValue > 0;
  if (!hasData) return;

  const taxData = calculateTax(state.operations);

  root.querySelector('#costCommissions').textContent = formatRub(taxData.commissions);
  root.querySelector('#costTax').textContent = formatRub(taxData.tax);
  root.querySelector('#costMissed').textContent = formatRub(state.totalValue * 0.05);
  root.querySelector('#costTotal').textContent =
    formatRub(taxData.commissions + taxData.tax + state.totalValue * 0.05);
}