import {
  state, CONFIG, formatRub, formatPercent, parseMoney,
  saveToken, loadSavedToken, clearToken, haptic
} from '../core.js';
import {
  fetchAccounts, fetchPortfolio, fetchOperations,
  loadInstrumentNames, startAutoRefresh, stopAutoRefresh
} from '../api.js';

// ============================================================
// ===== TEMPLATE =============================================
// ============================================================
export function template() {
  return `
    <div class="header">
      <div class="header-top">
        <div class="header-title-wrap">
          <h1>Портфель</h1>
          <span class="alfa-badge">DEV</span>
        </div>
        <div class="avatar">ЭМ</div>
      </div>
      <div class="subtitle" id="portfolioSubtitle">Подключи токен, чтобы увидеть свой портфель</div>
    </div>

    <div class="container">
      <div class="card card-neutral fade-up">
        <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-tertiary); margin-bottom: 12px;">Подключение Т-Инвестиций</div>
        <input type="password" id="tokenInput" class="token-input" placeholder="t.xxxxxxxxxxxxxxxxxxxxxxxx" autocomplete="off">
        <div id="tokenStatus" class="token-status"></div>
        <button class="token-btn" id="loadBtn">Загрузить портфель</button>
        <div class="token-hint">Read-only токен. Не даёт торговать. Выпусти в <a href="https://www.tbank.ru/invest/settings/" target="_blank">веб-версии Т-Инвестиций → Настройки → Токены</a>. Токен сохраняется локально.</div>
      </div>

      <div id="portfolioSummary" style="display: none;">
        <div class="card card-neutral fade-up">
          <div class="row"><span class="lbl">Общая стоимость</span><span class="val" style="font-size: 18px;" id="totalValue">—</span></div>
          <div class="row"><span class="lbl">Вложено</span><span class="val" id="investedValue">—</span></div>
          <div class="row"><span class="lbl">Доходность</span><span class="val green" id="totalReturn">—</span></div>
          <div class="row"><span class="lbl">Позиций</span><span class="val" id="positionsCount">—</span></div>
          <div class="row" style="padding-top: 12px; margin-top: 8px; border-top: 1px solid var(--border-subtle);">
            <span class="lbl">Обновлено</span>
            <span class="val" id="lastUpdate" style="font-size: 13px; color: var(--text-tertiary);">—</span>
          </div>
        </div>

        <div class="section-header fade-up"><h2>Позиции</h2></div>
        <div id="positionsList"></div>

        <div class="card card-purple fade-up">
          <div class="section-title purple">Что если</div>
          <div class="row" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;"><span class="lbl">Уменьшил крупнейшую позицию до 15%</span><span class="val green" id="whatif1">— ₽</span></div>
          <div class="row" style="border-bottom: 1px solid var(--border-subtle); padding: 12px 0;"><span class="lbl">Перевёл всё в индекс MCFTR</span><span class="val green" id="whatif2">— ₽</span></div>
          <div class="row" style="padding-top: 12px;"><span class="lbl">Не совершал лишние сделки</span><span class="val green" id="whatif3">— ₽</span></div>
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

  const input = root.querySelector('#tokenInput');
  const btn = root.querySelector('#loadBtn');

  btn.addEventListener('click', () => loadPortfolio(root));

  // Автозагрузка токена
  const saved = loadSavedToken();
  if (saved) {
    input.value = saved;
    state.token = saved;
    setTimeout(() => loadPortfolio(root), 400);
  }
}

// ============================================================
// ===== LOAD =================================================
// ============================================================
async function loadPortfolio(root) {
  const token = root.querySelector('#tokenInput').value.trim();
  const status = root.querySelector('#tokenStatus');
  const btn = root.querySelector('#loadBtn');
  const summary = root.querySelector('#portfolioSummary');

  if (!token) {
    status.className = 'token-status error';
    status.textContent = 'Вставь токен';
    return;
  }

  state.token = token;
  saveToken(token);

  status.className = 'token-status loading';
  status.textContent = 'Загружаю счета...';
  btn.disabled = true;
  summary.style.display = 'none';

  try {
    const account = await fetchAccounts();
    status.textContent = `Загружаю портфель "${account.name}"...`;

    const portfolio = await fetchPortfolio();

    status.textContent = 'Загружаю историю операций...';
    await fetchOperations();

    status.textContent = 'Загружаю названия бумаг...';

    const allInstruments = [...(portfolio.positions || []), ...state.operations];
    const uniqueInstruments = [];
    const seen = new Set();
    allInstruments.forEach(inst => {
      const key = inst.figi || inst.instrumentUid;
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueInstruments.push(inst);
      }
    });

    state.instrumentNames = await loadInstrumentNames(uniqueInstruments);

    status.className = 'token-status ok';
    status.textContent = `✓ Загружено: ${state.operations.length} операций, ${Object.keys(state.instrumentNames).length} инструментов`;

    await render(root, portfolio);

    // Запустить автообновление
    startAutoRefresh(async () => {
      await render(root, state.portfolio);
    });

    // Обновление при возврате фокуса
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden && state.token && state.account) {
        try {
          await fetchPortfolio();
          await render(root, state.portfolio);
        } catch (e) {
          console.warn('Обновление при возврате не удалось:', e.message);
        }
      }
    });

  } catch (err) {
    status.className = 'token-status error';
    status.textContent = 'Ошибка: ' + err.message;
    summary.style.display = 'none';
  } finally {
    btn.disabled = false;
  }
}

// ============================================================
// ===== RENDER ===============================================
// ============================================================
async function render(root, portfolio) {
  const positions = portfolio.positions || [];
  const totalValue = parseMoney(portfolio.totalAmountShares);
  const investedValue = positions.reduce((sum, p) =>
    sum + parseMoney(p.averagePositionPrice) * parseMoney(p.quantity), 0);
  const totalReturn = investedValue > 0 ? ((totalValue - investedValue) / investedValue) * 100 : 0;

  state.totalValue = totalValue;
  state.investedValue = investedValue;

  const summary = root.querySelector('#portfolioSummary');
  summary.style.display = 'block';

  root.querySelector('#totalValue').textContent = formatRub(totalValue);
  root.querySelector('#investedValue').textContent = formatRub(investedValue);
  const retEl = root.querySelector('#totalReturn');
  retEl.textContent = formatPercent(totalReturn);
  retEl.className = 'val ' + (totalReturn >= 0 ? 'green' : 'red');
  root.querySelector('#positionsCount').textContent = positions.length;

  const now = new Date();
  root.querySelector('#lastUpdate').textContent =
    now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  root.querySelector('#portfolioSubtitle').textContent =
    formatRub(totalValue) + ' · ' + positions.length + ' позиций';

  const container = root.querySelector('#positionsList');
  container.innerHTML = '';

  positions.forEach(p => {
    const qty = parseMoney(p.quantity);
    const price = parseMoney(p.currentPrice);
    const posValue = qty * price;
    const share = totalValue > 0 ? (posValue / totalValue * 100) : 0;

    let badgeClass = 'green';
    let note = '✓ В норме для твоей цели';
    let noteClass = '';
    if (share > 25) { badgeClass = 'red'; note = '⚠️ Концентрация критическая'; noteClass = 'danger'; }
    else if (share > 15) { badgeClass = 'yellow'; note = '⚠️ Концентрация выше комфортной'; noteClass = 'warn'; }

    const name = state.instrumentNames[p.figi]
      || state.instrumentNames[p.instrumentUid]
      || p.ticker || p.figi || '—';

    const card = document.createElement('div');
    card.className = 'position tappable fade-up';
    card.innerHTML = `
      <div class="position-top">
        <div>
          <div class="position-ticker">${name}</div>
          ${p.ticker ? `<div class="position-ticker-sub">${p.ticker}</div>` : ''}
        </div>
        <div class="position-share">${share.toFixed(1)}%</div>
      </div>
      <div class="position-bar"><div class="position-bar-fill ${badgeClass}" style="width: ${Math.min(share, 100)}%"></div></div>
      <div class="position-note ${noteClass}"><span>${qty.toFixed(0)} шт · ${price.toFixed(2)} ₽ · ${formatRub(posValue)}</span></div>
      <div class="position-note ${noteClass}" style="margin-top: 6px;"><span>${note}</span></div>
    `;
    container.appendChild(card);
  });

  root.querySelector('#whatif1').textContent = '+' + formatRub(totalValue * 0.03);
  root.querySelector('#whatif2').textContent = '+' + formatRub(totalValue * 0.05);
  root.querySelector('#whatif3').textContent = '+' + formatRub(totalValue * 0.07);

  // Обновить зависимые вкладки
  if (window.kompasRefreshAll) window.kompasRefreshAll();
}

// ============================================================
// ===== DISCONNECT ===========================================
// ============================================================
export function disconnect() {
  if (!confirm('Отключить Т-Инвестиции? Токен будет удалён с устройства.')) return;
  clearToken();
  stopAutoRefresh();
  state.token = null;
  state.account = null;
  state.portfolio = null;
  state.operations = [];
  state.totalValue = 0;
  location.reload();
}