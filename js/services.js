import { state, parseMoney } from './core.js';

// ============================================================
// ===== HELPERS ==============================================
// ============================================================
function isBuy(op) {
  return op.type === 1 || op.type === 'OPERATION_TYPE_BUY';
}
function isSell(op) {
  return op.type === 2 || op.type === 'OPERATION_TYPE_SELL';
}
function isFee(op) {
  return op.type === 8 || op.type === 'OPERATION_TYPE_FEE';
}
function isDividend(op) {
  return op.type === 5 || op.type === 'OPERATION_TYPE_DIVIDEND';
}
function isCoupon(op) {
  return op.type === 6 || op.type === 'OPERATION_TYPE_COUPON';
}

function getYear(op) {
  if (!op.date) return null;
  return parseInt(op.date.split('-')[0]);
}

function getTimestamp(op) {
  if (!op.date) return 0;
  const t = new Date(op.date).getTime();
  return isNaN(t) ? 0 : t;
}

// ============================================================
// ===== FIFO АНАЛИЗ ==========================================
// ============================================================
// Идём по операциям хронологически.
// Для каждой бумаги держим очередь покупок [{qty, price, date}].
// При продаже — берём из очереди FIFO, считаем:
//   - holdDays (sell.date - buy.date)
//   - pnl ((sell.price - buy.price) * qty)
// ============================================================
function computeFIFO(operations) {
  const queues = {}; // figi -> [{qty, price, date}]
  const holdDays = []; // { figi, days, ts }
  const pnls = [];     // { figi, pnl }

  const sorted = [...operations].sort((a, b) => getTimestamp(a) - getTimestamp(b));

  sorted.forEach(op => {
    const figi = op.figi || op.instrumentUid;
    if (!figi) return;

    const qty = parseMoney(op.quantity);
    const price = parseMoney(op.price);
    const ts = getTimestamp(op);

    if (qty <= 0) return;

    if (isBuy(op)) {
      if (!queues[figi]) queues[figi] = [];
      queues[figi].push({ qty, price, date: ts, figi });
      return;
    }

    if (isSell(op)) {
      if (!queues[figi] || queues[figi].length === 0) return;

      let remaining = qty;
      while (remaining > 0 && queues[figi].length > 0) {
        const lot = queues[figi][0];
        const take = Math.min(lot.qty, remaining);

        // Время удержания
        if (lot.date > 0 && ts > 0 && ts >= lot.date) {
          const days = Math.round((ts - lot.date) / (1000 * 60 * 60 * 24));
          holdDays.push({ figi, days, ts });
        }

        // P&L
        const pnl = (price - lot.price) * take;
        pnls.push({ figi, pnl });

        lot.qty -= take;
        remaining -= take;

        if (lot.qty <= 0.000001) queues[figi].shift();
      }
    }
  });

  return { holdDays, pnls };
}

// ============================================================
// ===== TAX SERVICE (2026) ===================================
// ============================================================
export function calculateTax(operations, year = null) {
  let dividendIncome = 0, couponIncome = 0, realizedProfit = 0, commissions = 0;

  operations.forEach(op => {
    if (year !== null && getYear(op) !== year) return;

    const payment = parseMoney(op.payment);

    if (isDividend(op)) dividendIncome += Math.abs(payment);
    else if (isCoupon(op)) couponIncome += Math.abs(payment);
    else if (isSell(op)) { if (payment > 0) realizedProfit += payment; }
    else if (isFee(op)) commissions += Math.abs(payment);
  });

  const totalIncome = dividendIncome + couponIncome + realizedProfit;
  const TH1 = 2400000, TH2 = 5000000, TH3 = 20000000;
  let tax = 0, activeBracket = 13;

  if (totalIncome <= TH1) { tax = totalIncome * 0.13; activeBracket = 13; }
  else if (totalIncome <= TH2) { tax = TH1 * 0.13 + (totalIncome - TH1) * 0.15; activeBracket = 15; }
  else if (totalIncome <= TH3) { tax = TH1 * 0.13 + (TH2 - TH1) * 0.15 + (totalIncome - TH2) * 0.18; activeBracket = 18; }
  else { tax = TH1 * 0.13 + (TH2 - TH1) * 0.15 + (TH3 - TH2) * 0.18 + (totalIncome - TH3) * 0.20; activeBracket = 20; }

  return { totalIncome, tax, activeBracket, commissions, dividendIncome, couponIncome, realizedProfit };
}

// ============================================================
// ===== MIRROR SERVICE =======================================
// ============================================================
export function analyzeMirror(operations, year = null) {
  const result = {
    sells: 0, avgProfit: 0, avgLoss: 0,
    tradesPerYear: 0, commissionsTotal: 0,
    top2Share: 0, top5Share: 0,
    growthDays: 0, fallDays: 0,
    // Новые поля
    avgHoldDays: null,
    minHoldDays: null,
    maxHoldDays: null,
    minHoldFigi: null,
    maxHoldFigi: null,
    profitableShare: null,
    unprofitableShare: null
  };

  // Фильтр по году
  const yearOps = year === null
    ? operations
    : operations.filter(op => getYear(op) === year);

  // ----- Диспозиция -----
  const sells = yearOps.filter(isSell);
  result.sells = sells.length;

  if (sells.length > 0) {
    const profits = [], losses = [];
    sells.forEach(op => {
      const p = parseMoney(op.payment);
      if (p > 0) profits.push(p);
      else losses.push(Math.abs(p));
    });
    result.avgProfit = profits.length ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
    result.avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  }

  // ----- Овертрейдинг -----
  result.tradesPerYear = yearOps.length;

  const feeOps = yearOps.filter(isFee);
  result.commissionsTotal = feeOps.reduce((sum, op) => sum + Math.abs(parseMoney(op.payment)), 0);

  // ----- Концентрация (по текущему портфелю, год не влияет) -----
  if (state.portfolio) {
    const positions = (state.portfolio.positions || [])
      .map(p => ({ value: parseMoney(p.quantity) * parseMoney(p.currentPrice) }))
      .sort((a, b) => b.value - a.value);
    const total = positions.reduce((sum, p) => sum + p.value, 0);
    if (total > 0) {
      result.top2Share = positions.slice(0, 2).reduce((s, p) => s + p.value, 0) / total * 100;
      result.top5Share = positions.slice(0, 5).reduce((s, p) => s + p.value, 0) / total * 100;
    }
  }

  // ----- Дни роста / падения -----
  const daily = {};
  yearOps.forEach(op => {
    if (!op.date) return;
    const day = op.date.split('T')[0];
    if (!daily[day]) daily[day] = { volume: 0 };
    daily[day].volume += parseMoney(op.payment);
  });
  Object.keys(daily).forEach(d => {
    if (daily[d].volume >= 0) result.growthDays++;
    else result.fallDays++;
  });

  // ----- FIFO: holdDays и PnL -----
  const { holdDays, pnls } = computeFIFO(yearOps);

  if (holdDays.length > 0) {
    const days = holdDays.map(h => h.days);
    result.avgHoldDays = days.reduce((a, b) => a + b, 0) / days.length;

    // Min
    let minItem = holdDays[0];
    let maxItem = holdDays[0];
    holdDays.forEach(h => {
      if (h.days < minItem.days) minItem = h;
      if (h.days > maxItem.days) maxItem = h;
    });
    result.minHoldDays = minItem.days;
    result.maxHoldDays = maxItem.days;
    result.minHoldFigi = minItem.figi;
    result.maxHoldFigi = maxItem.figi;
  }

  if (pnls.length > 0) {
    const profitable = pnls.filter(p => p.pnl > 0).length;
    const unprofitable = pnls.filter(p => p.pnl <= 0).length;
    const total = pnls.length;
    result.profitableShare = (profitable / total) * 100;
    result.unprofitableShare = (unprofitable / total) * 100;
  }

  return result;
}

// ============================================================
// ===== JOURNAL SERVICE ======================================
// ============================================================
export const OP_TYPES = {
  1: 'Покупка', 2: 'Продажа', 5: 'Дивиденды',
  6: 'Купоны', 7: 'Налог', 8: 'Комиссия'
};

export function analyzeJournal(operations) {
  const buys = operations.filter(isBuy);
  const sells = operations.filter(isSell);
  const divs = operations.filter(op => isDividend(op) || isCoupon(op));
  return {
    total: operations.length,
    buys: buys.length,
    sells: sells.length,
    dividends: divs.length
  };
}

// ============================================================
// ===== INSIGHT ==============================================
// ============================================================
export function generateInsight(operations) {
  if (!operations.length) {
    return 'Загрузи токен на вкладке «Портфель», чтобы увидеть персональный инсайт.';
  }

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recent = operations.filter(op => op.date && new Date(op.date) > monthAgo);

  if (recent.length > 20) {
    return `За последние 30 дней ты совершил <span class="insight-highlight">${recent.length} операций</span>. Средний инвестор — 12. Больше сделок ≠ лучше результат.`;
  }
  if (recent.length > 0) {
    return `За последние 30 дней ты совершил <span class="insight-highlight">${recent.length} операций</span>. Это в пределах разумного.`;
  }
  return `За последние 30 дней ты не совершал операций. Это признак дисциплины.`;
}