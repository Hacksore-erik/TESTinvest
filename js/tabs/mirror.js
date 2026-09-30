import { state, formatRub } from '../core.js';
import { analyzeMirror, calculateTax } from '../services.js';

// ============================================================
// ===== TEMPLATE =============================================
// ============================================================
export function template() {
  const year = state.mirrorYear || 2026;
  const years = [2026, 2025, 2024];

  return `
    <div class="header">
      <div class="header-top">
        <div class="header-title-wrap">
          <h1>Зеркало</h1>
          <span class="alfa-badge">DEV</span>
        </div>
        <div class="avatar">И</div>
      </div>
      <div class="subtitle">Честная картина твоего поведения</div>
    </div>

    <div class="container">
      <div class="hint-bar fade-up">
        <div class="icon">🪞</div>
        <div class="text">Это анализ твоего поведения.</div>
      </div>

      <div class="year-row fade-up">
        <div class="year-label">Период</div>
        <div class="year-select-wrap">
          <select class="year-select" id="mirrorYearSelect">
            ${years.map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="card card-neutral fade-up">
        <div class="mirror-title">Ты рано фиксируешь прибыль и долго держишь убытки</div>
        <div class="row"><span class="lbl">Средняя продажа с плюсом</span><span class="val green" id="avgProfit">—</span></div>
        <div class="row"><span class="lbl">Средняя продажа с минусом</span><span class="val red" id="avgLoss">—</span></div>
        <div class="mirror-footer" id="dispositionFooter">Подключи токен, чтобы увидеть свои паттерны.</div>
      </div>

      <div class="card card-neutral fade-up">
        <div class="mirror-title">Сколько ты держишь бумаги</div>
        <div class="row"><span class="lbl">Среднее время удержания</span><span class="val" id="avgHoldDays">—</span></div>
        <div class="row"><span class="lbl">Самая короткая</span><span class="val" id="minHoldDays">—</span></div>
        <div class="row"><span class="lbl">Самая долгая</span><span class="val" id="maxHoldDays">—</span></div>
        <div class="mirror-footer" id="holdingFooter">Подключи токен для анализа.</div>
      </div>

      <div class="card card-neutral fade-up">
        <div class="mirror-title">Прибыльные и убыточные сделки</div>
        <div class="row"><span class="lbl">Прибыльные сделки</span><span class="val green" id="profitableShare">—</span></div>
        <div class="row"><span class="lbl">Убыточные сделки</span><span class="val red" id="unprofitableShare">—</span></div>
        <div class="mirror-footer" id="winRateFooter">Подключи токен для анализа.</div>
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

  const select = root.querySelector('#mirrorYearSelect');
  if (select) {
    select.addEventListener('change', (e) => {
      state.mirrorYear = parseInt(e.target.value);
      render(root);
    });
  }

  render(root);
}

// ============================================================
// ===== RENDER ===============================================
// ============================================================
export function render(root) {
  export function render(root) {
  // ============ ВРЕМЕННЫЙ ДЕБАГ ============
  (() => {
    try {
      const container = root.querySelector('.container');
      if (!container) return;
      const old = container.querySelector('#__debug');
      if (old) old.remove();

      const dbg = {
        totalOps: state.operations.length,
        mirrorYear: state.mirrorYear,
        uniqueTypes: [...new Set(state.operations.map(op => op.type))],
        uniqueYears: [...new Set(state.operations.map(op => op.date))].slice(0, 20),
        first3: state.operations.slice(0, 3).map(op => ({
          type: op.type,
          date: op.date,
          figi: op.figi,
          uid: op.instrumentUid,
          qty: op.quantity,
          price: op.price,
          payment: op.payment
        }))
      };

      const pre = document.createElement('pre');
      pre.id = '__debug';
      pre.style.cssText = 'background:#000;color:#0f0;padding:12px;font-size:10px;white-space:pre-wrap;word-break:break-all;border-radius:8px;margin-bottom:12px;max-height:60vh;overflow:auto;user-select:text;-webkit-user-select:text;font-family:monospace';
      pre.textContent = JSON.stringify(dbg, null, 2);
      container.prepend(pre);
    } catch (e) {
      const pre = document.createElement('pre');
      pre.style.cssText = 'background:#500;color:#fff;padding:12px;font-size:11px';
      pre.textContent = 'DEBUG ERROR: ' + e.message;
      root.querySelector('.container')?.prepend(pre);
    }
  })();
  // ============ КОНЕЦ ДЕБАГА ============
  const year = state.mirrorYear || 2026;
  const m = analyzeMirror(state.operations, year);

  // ----- Диспозиция -----
  if (m.sells > 0) {
    root.querySelector('#avgProfit').textContent = formatRub(m.avgProfit);
    root.querySelector('#avgLoss').textContent = '−' + formatRub(m.avgLoss);
    root.querySelector('#dispositionFooter').innerHTML =
      `На основе <span class="hl">${m.sells} продаж</span> за ${year} год.`;
  } else {
    root.querySelector('#avgProfit').textContent = '—';
    root.querySelector('#avgLoss').textContent = '—';
    root.querySelector('#dispositionFooter').innerHTML =
      `Нет продаж за ${year} год.`;
  }

  // ----- Время удержания -----
  const avgHoldEl = root.querySelector('#avgHoldDays');
  const minHoldEl = root.querySelector('#minHoldDays');
  const maxHoldEl = root.querySelector('#maxHoldDays');
  const holdingFooter = root.querySelector('#holdingFooter');

  if (m.avgHoldDays !== null) {
    avgHoldEl.textContent = formatDays(m.avgHoldDays);
    minHoldEl.textContent = m.minHoldDays !== null
      ? formatHold(m.minHoldFigi, m.minHoldDays)
      : '—';
    maxHoldEl.textContent = m.maxHoldDays !== null
      ? formatHold(m.maxHoldFigi, m.maxHoldDays)
      : '—';

    holdingFooter.innerHTML = m.avgHoldDays < 30
      ? `Средний инвестор держит бумаги <span class="hl">6–12 месяцев</span>. Твои сделки — короткие.`
      : m.avgHoldDays < 180
        ? `Ты держишь бумаги <span class="hl">умеренно</span>.`
        : `Ты держишь бумаги <span class="hl">долго</span> — хороший признак.`;
  } else {
    avgHoldEl.textContent = '—';
    minHoldEl.textContent = '—';
    maxHoldEl.textContent = '—';
    holdingFooter.innerHTML = `Нет данных за ${year} год.`;
  }

  // ----- Прибыльные / убыточные -----
  const profEl = root.querySelector('#profitableShare');
  const unprofEl = root.querySelector('#unprofitableShare');
  const winFooter = root.querySelector('#winRateFooter');

  if (m.profitableShare !== null) {
    profEl.textContent = m.profitableShare.toFixed(0) + '%';
    unprofEl.textContent = m.unprofitableShare.toFixed(0) + '%';

    winFooter.innerHTML = m.profitableShare > 60
      ? `Большинство твоих сделок — <span class="hl">в плюс</span>.`
      : m.profitableShare > 40
        ? `Примерно половина сделок в плюс. Это <span class="hl">норма</span>.`
        : `Меньше <span class="hl">50%</span> прибыльных сделок — обычно следствие частой торговли.`;
  } else {
    profEl.textContent = '—';
    unprofEl.textContent = '—';
    winFooter.innerHTML = `Нет данных за ${year} год.`;
  }

  // ----- Овертрейдинг -----
  root.querySelector('#tradesCount').textContent = m.tradesPerYear;
  root.querySelector('#commissionTotal').textContent = formatRub(m.commissionsTotal);
  root.querySelector('#overtradingFooter').innerHTML = m.tradesPerYear > 50
    ? `<span class="hl">${m.tradesPerYear} операций</span> за ${year} год. Средний инвестор совершает 40.`
    : m.tradesPerYear > 0
      ? `${m.tradesPerYear} операций за ${year} год. Это в пределах нормы.`
      : `Нет операций за ${year} год.`;

  // ----- Концентрация -----
  if (state.portfolio) {
    root.querySelector('#top2Share').textContent = m.top2Share.toFixed(0) + '%';
    root.querySelector('#top5Share').textContent = m.top5Share.toFixed(0) + '%';

    const risk = m.top2Share > 40 ? 'высокая' : m.top2Share > 25 ? 'умеренная' : 'низкая';
    root.querySelector('#concentrationFooter').innerHTML =
      `Концентрация топ-2: <span class="hl">${m.top2Share.toFixed(0)}%</span>. Риск: ${risk}.`;
  }

  // ----- Дни падения -----
  root.querySelector('#checksGrowth').textContent = m.growthDays + ' дней';
  root.querySelector('#checksFall').textContent = m.fallDays + ' дней';

  if (m.growthDays + m.fallDays >= 5) {
    const ratio = m.fallDays / Math.max(m.growthDays, 1);
    root.querySelector('#checkingPatternFooter').innerHTML = ratio > 1.5
      ? `Ты активнее в дни падения в <span class="hl">${ratio.toFixed(1)} раз</span>. Это эмоциональная реакция.`
      : `Ты сохраняешь спокойствие в дни падения. Хороший признак.`;
  } else {
    root.querySelector('#checkingPatternFooter').innerHTML =
      `Недостаточно данных за ${year} год. Нужно минимум <span class="hl">5 дней</span> с операциями.`;
  }

  // ----- Цена решений -----
  renderCost(root, year);
}

// ============================================================
// ===== ЦЕНА РЕШЕНИЙ =========================================
// ============================================================
function renderCost(root, year) {
  const taxData = calculateTax(state.operations, year);

  root.querySelector('#costCommissions').textContent = formatRub(taxData.commissions);
  root.querySelector('#costTax').textContent = formatRub(taxData.tax);
  root.querySelector('#costMissed').textContent = formatRub(state.totalValue * 0.05);
  root.querySelector('#costTotal').textContent =
    formatRub(taxData.commissions + taxData.tax + state.totalValue * 0.05);
}

// ============================================================
// ===== HELPERS ==============================================
// ============================================================
function formatDays(days) {
  const d = Math.round(days);
  if (d === 1) return '1 день';
  if (d >= 2 && d <= 4) return d + ' дня';
  return d + ' дней';
}

function formatHold(figi, days) {
  const dayStr = formatDays(days);
  const name = (state.instrumentNames && state.instrumentNames[figi]) || null;

  if (!name) return dayStr;
  return `${name} — ${dayStr}`;
}