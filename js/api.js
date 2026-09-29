import { state, CONFIG, parseMoney } from './core.js';
import { logError, codeFromStatus } from './logger.js';

// ============================================================
// ===== API CALL =============================================
// ============================================================
export async function apiCall(service, method, body = {}) {
  let res;
  try {
    res = await fetch(`${CONFIG.API_URL}/${service}/${method}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    // Сетевые ошибки: offline, DNS, CORS, abort
    const code = e.name === 'AbortError' ? 'E-NET-003' : 'E-NET-001';
    logError(code, e.message || 'Сетевая ошибка', {
      service,
      method
    });
    throw e;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const code = codeFromStatus(res.status);
    logError(code, `HTTP ${res.status}`, {
      service,
      method,
      status: res.status,
      body: text.slice(0, 500)
    });
    throw new Error(`${res.status}: ${text}`);
  }

  try {
    return await res.json();
  } catch (e) {
    logError('E-PARSE-001', 'Не удалось разобрать JSON', {
      service,
      method
    });
    throw e;
  }
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
      // Уже залогировано внутри apiCall — просто пропускаем
      console.warn('Не удалось загрузить название для', p.figi);
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
  if (accounts.length === 0) {
    logError('E-DATA-001', 'Не найдено ни одного счёта', {
      accountsReturned: accounts.length
    });
    throw new Error('Не найдено ни одного счёта');
  }
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
      // Ошибка уже залогирована внутри apiCall
      console.warn('Автообновление не удалось');
    }
  }, CONFIG.REFRESH_MS);
}

export function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}