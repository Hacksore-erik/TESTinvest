import { state, parseMoney } from './core.js';

// ============================================================
// ===== HELPERS ==============================================
// ============================================================
function isBuy(op) {
  const t = op.type;
  return t === 1
    || t === 'OPERATION_TYPE_BUY'
    || t === 'Покупка ценных бумаг'
    || t === 'Покупка';
}

function isSell(op) {
  const t = op.type;
  return t === 2
    || t === 'OPERATION_TYPE_SELL'
    || t === 'Продажа ценных бумаг'
    || t === 'Продажа';
}

function isFee(op) {
  const t = op.type;
  return t === 8
    || t === 'OPERATION_TYPE_FEE'
    || t === 'Удержание комиссии за операцию'
    || t === 'Комиссия';
}

function isDividend(op) {
  const t = op.type;
  return t === 5
    || t === 'OPERATION_TYPE_DIVIDEND'
    || t === 'Выплата дивидендов'
    || t === 'Дивиденды';
}

function isCoupon(op) {
  const t = op.type;
  return t === 6
    || t === 'OPERATION_TYPE_COUPON'
    || t === 'Выплата купонов'
    || t === 'Купоны';
}

// ============================================================
// ===== ДАТЫ =================================================
// ============================================================
function parseOpDate(dateStr) {
  if (!dateStr) return null;

  if (dateStr.indexOf('.') !== -1 && dateStr.indexOf('T') === -1) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  let normalized = dateStr;
  const dotIndex = dateStr.indexOf('.');
  if (dotIndex !== -1) {
    const beforeDot = dateStr.slice(0, dotIndex);
    const afterDot = dateStr.slice(dotIndex + 1);
    let msEnd = afterDot.length;
    for (let i = 0; i < afterDot.length; i++) {
      const ch = afterDot[i];
      if (ch === 'Z' || ch === '+' || ch === '-') { msEnd = i; break; }
    }
    const ms = afterDot.slice(0, msEnd).slice(0, 3);
    const rest = afterDot.slice(msEnd);
    normalized = beforeDot + '.' + (ms || '0') + rest;
  }

  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function getYear(op) {
  const d = parseOpDate(op.date);
  return d ? d.getFullYear() : null;
}

function getTimestamp(op) {
  const d = parseOpDate(op.date);
  return d ? d.getTime() : 0;
}

// ============================================================
// ===== FIFO =================================================
// ============================================================
function computeFIFO(operations) {
  const queues = {};
  const holdDays = [];
  const pnls = [];

  const sorted = [...operations].sort((a, b) => {
    const ta = getTimestamp(a);
    const tb = getTimestamp(b);
    if (ta !== tb) return ta - tb;
    const priority = (op) => (isBuy(op) ? 0 : 1);
    return priority(a) - priority(b);
  });

  sorted.forEach(op => {
    const figi = op.figi || op.instrumentUid;
    if (!figi) return;

    const qty = parseMoney(op.quantity);
    const price = parseMoney(op.price);
    const ts = getTimestamp(op);

    if (qty <= 0) return;

    if (isBuy(op)) {
      if (!queues[figi]) queues[figi] = [];
      queues[figi].push({ qty, price, date: ts });
      return;
    }

    if (isSell(op)) {
      if (!queues[figi] || queues[figi].length === 0) return;

      let remaining = qty;
      while (remaining > 0 && queues[figi].length > 0) {
        const lot = queues[figi][0];
        const take = Math.min(lot.qty, remaining);

        if (lot.date > 0 && ts > 0) {
          const days = Math.round((ts - lot.date) / (1000 * 60 * 60 * 24));
          if (days >= 0) {
            holdDays.push({ figi, days });
          }
        }

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
// ===== TAX ==================================================
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
// ===== MIRROR ===============================================
// ============================================================
export function analyzeMirror(operations, year = null) {
  const result = {
    // Диспозиция (FIFO P&L)
    sells: 0,
    totalDeals: 0,
    profitableCount: 0,
    profitableSum: 0,
    unprofitableCount: 0,
    unprofitableSum: 0,
    totalPnl: 0,
    // Овертрейдинг
    tradesPerYear: 0,
    commissionsTotal: 0,
    // Концентрация
    top2Share: 0,
    top5Share: 0,
    // Дни
    growthDays: 0,
    fallDays: 0,
    // Время удержания
    avgHoldDays: null,
    minHoldDays: null,
    maxHoldDays: null,
    minHoldFigi: null,
    maxHoldFigi: null,
    // Win rate
    profitableShare: null,
    unprofitableShare: null
  };

  const yearOps = year === null
    ? operations
    : operations.filter(op => getYear(op) === year);

  // ----- FIFO один раз -----
  const { holdDays, pnls } = computeFIFO(yearOps);

  // ----- Диспозиция по FIFO -----
  const sells = yearOps.filter(isSell);
  result.sells = sells.length;

  if (pnls.length > 0) {
    let profitableCount = 0;
    let profitableSum = 0;
    let unprofitableCount = 0;
    let unprofitableSum = 0;

    pnls.forEach(p => {
      if (p.pnl >= 0) {
        profitableCount++;
        profitableSum += p.pnl;
      } else {
        unprofitableCount++;
        unprofitableSum += Math.abs(p.pnl);
      }
    });

    result.totalDeals = pnls.length;
    result.profitableCount = profitableCount;
    result.profitableSum = profitableSum;
    result.unprofitableCount = unprofitableCount;
    result.unprofitableSum = unprofitableSum;
    result.totalPnl = profitableSum - unprofitableSum;
  }

  // ----- Овертрейдинг -----
  result.tradesPerYear = yearOps.length;

  const feeOps = yearOps.filter(isFee);
  result.commissionsTotal = feeOps.reduce(
    (sum, op) => sum + Math.abs(parseMoney(op.payment)), 0
  );

  // ----- Концентрация -----
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

  // ----- Дни -----
  const daily = {};
  yearOps.forEach(op => {
    const d = parseOpDate(op.date);
    if (!d) return;
    const day = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    if (!daily[day]) daily[day] = { volume: 0 };
    daily[day].volume += parseMoney(op.payment);
  });
  Object.keys(daily).forEach(d => {
    if (daily[d].volume >= 0) result.growthDays++;
    else result.fallDays++;
  });

  // ----- Время удержания -----
  if (holdDays.length > 0) {
    const days = holdDays.map(h => h.days);
    result.avgHoldDays = days.reduce((a, b) => a + b, 0) / days.length;

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

  // ----- Win rate -----
  if (pnls.length > 0) {
    const profitable = pnls.filter(p => p.pnl >= 0).length;
    const unprofitable = pnls.filter(p => p.pnl < 0).length;
    const total = pnls.length;
    result.profitableShare = (profitable / total) * 100;
    result.unprofitableShare = (unprofitable / total) * 100;
  }

  return result;
}

// ============================================================
// ===== JOURNAL ==============================================
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
  const recent = operations.filter(op => {
    const d = parseOpDate(op.date);
    return d && d > monthAgo;
  });

  if (recent.length > 20) {
    return `За последние 30 дней ты совершил <span class="insight-highlight">${recent.length} операций</span>. Средний инвестор — 12. Больше сделок ≠ лучше результат.`;
  }
  if (recent.length > 0) {
    return `За последние 30 дней ты совершил <span class="insight-highlight">${recent.length} операций</span>. Это в пределах разумного.`;
  }
  return `За последние 30 дней ты не совершал операций. Это признак дисциплины.`;
}