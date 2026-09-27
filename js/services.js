import { state, formatRub, parseMoney } from './core.js';

// ============================================================
// ===== TAX SERVICE (2026) ===================================
// ============================================================
export function calculateTax(operations) {
  let dividendIncome = 0, couponIncome = 0, realizedProfit = 0, commissions = 0;

  operations.forEach(op => {
    const payment = parseMoney(op.payment);
    const type = op.type || '';

    if (type === 5 || type === 'OPERATION_TYPE_DIVIDEND') dividendIncome += Math.abs(payment);
    else if (type === 6 || type === 'OPERATION_TYPE_COUPON') couponIncome += Math.abs(payment);
    else if (type === 2 || type === 'OPERATION_TYPE_SELL') { if (payment > 0) realizedProfit += payment; }
    else if (type === 8 || type === 'OPERATION_TYPE_FEE') commissions += Math.abs(payment);
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
export function analyzeMirror(operations) {
  const result = {
    sells: 0, avgProfit: 0, avgLoss: 0,
    tradesPerYear: 0, commissionsTotal: 0,
    top2Share: 0, top5Share: 0,
    growthDays: 0, fallDays: 0
  };

  const sells = operations.filter(op => op.type === 2 || op.type === 'OPERATION_TYPE_SELL');
  result.sells = sells.length;

  if (sells.length > 0) {
    const profits = [], losses = [];
    sells.forEach(op => {
      const p = parseMoney(op.payment);
      if (p > 0) profits.push(p); else losses.push(Math.abs(p));
    });
    result.avgProfit = profits.length ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
    result.avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  }

  const yearOps = operations.filter(op => {
    if (!op.date) return false;
    const year = parseInt(op.date.split('-')[0]);
    return year === 2026 || year === 2025;
  });
  result.tradesPerYear = yearOps.length;

  const feeOps = operations.filter(op => op.type === 8 || op.type === 'OPERATION_TYPE_FEE');
  result.commissionsTotal = feeOps.reduce((sum, op) => sum + Math.abs(parseMoney(op.payment)), 0);

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

  const daily = {};
  operations.forEach(op => {
    if (!op.date) return;
    const day = op.date.split('T')[0];
    if (!daily[day]) daily[day] = { count: 0, volume: 0 };
    daily[day].count++;
    daily[day].volume += parseMoney(op.payment);
  });
  Object.keys(daily).forEach(d => {
    if (daily[d].volume >= 0) result.growthDays++; else result.fallDays++;
  });

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
  const buys = operations.filter(op => op.type === 1 || op.type === 'OPERATION_TYPE_BUY');
  const sells = operations.filter(op => op.type === 2 || op.type === 'OPERATION_TYPE_SELL');
  const divs = operations.filter(op =>
    [5, 6, 'OPERATION_TYPE_DIVIDEND', 'OPERATION_TYPE_COUPON'].includes(op.type)
  );
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