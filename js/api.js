import { state, CONFIG, parseMoney } from './core.js';

// ============================================================
// ===== API CALL =============================================
// ============================================================
export async function apiCall(service, method, body = {}) {
  const res = await fetch(`${CONFIG.API_URL}/${service}/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${state.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

// ============================================================
// ===== INSTRUMENT NAMES =====================================
// ============================================================
export async function loadInstrumentNames(positions) {
  const names = {};
  const promises = positions.map(async (p) => {
    try {
      const id = p.figi || p.instrumentUid;
      if (!id) return;
      const idType = p.figi ? 'INSTRUMENT_ID_TYPE_FIGI' : 'INSTRUMENT_ID_TYPE_UID';
      const result = await apiCall(
        'tinkoff.public.invest.api.contract.v1.InstrumentsService',
        'GetInstrumentBy',
        { idType, id }
      );
      const name = result.instrument?.name;
      if (name) {
        names[p.figi] = name;
        names[p.instrumentUid] = name;
      }
    } catch (e) {
      console.warn('Не удалось загрузить название для', p.figi, e.message);
    }
  });

  await Promise.race([
    Promise.all(promises),
    new Promise(resolve => setTimeout(resolve, 6000))
  ]);

  return names;
}

// ============================================================
// ===== PORTFOLIO SERVICE ====================================
// ============================================================
export async function fetchPortfolio() {
  const data = await apiCall(
    'tinkoff.public.invest.api.contract.v1.OperationsService',
    'GetPortfolio',
    { accountId: state.account.id }
  );
  state.portfolio = data;
  state.totalValue = parseMoney(data.totalAmountShares);
  return data;
}

export async function fetchOperations() {
  const data = await apiCall(
    'tinkoff.public.invest.api.contract.v1.OperationsService',
    'GetOperations',
    {
      accountId: state.account.id,
      from: '2024-01-01T00:00:00Z',
      to: '2026-12-31T23:59:59Z'
    }
  );
  state.operations = data.operations || [];
  return state.operations;
}

export async function fetchAccounts() {
  const data = await apiCall(
    'tinkoff.public.invest.api.contract.v1.UsersService',
    'GetAccounts',
    {}
  );
  const accounts = data.accounts || [];
  if (accounts.length === 0) throw new Error('Не найдено ни одного счёта');
  const account = accounts.find(a => a.status === 1) || accounts[0];
  state.account = account;
  return account;
}

// ============================================================
// ===== AUTO REFRESH =========================================
// ============================================================
let refreshInterval = null;

export function startAutoRefresh(onUpdate) {
  stopAutoRefresh();
  refreshInterval = setInterval(async () => {
    if (!state.token || !state.account || document.hidden) return;
    try {
      await fetchPortfolio();
      if (onUpdate) await onUpdate();
    } catch (e) {
      console.warn('Автообновление не удалось:', e.message);
    }
  }, CONFIG.REFRESH_MS);
}

export function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}