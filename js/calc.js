// Money market / overnight repo model:
// a fund places cash in 1-day repo at ~RUSFAR, interest accrues every calendar
// day (act/365) and is reinvested into the unit price. "Monthly income" is what
// you can sell off each month while keeping the capital intact.
// Deposit / savings account (simple=true): interest r/12 paid monthly, no compounding
// when withdrawn; reinvested = monthly capitalization.

const DAYS = 365;

/** Monthly yield for a nominal annual rate (daily accrual, or r/12 for deposits). */
export const monthlyRate = (annual, simple) => (simple ? annual / 12 : (1 + annual / DAYS) ** (DAYS / 12) - 1);

/** Inverse of monthlyRate. */
export const annualFromMonthly = (m, simple) => (simple ? m * 12 : ((1 + m) ** (12 / DAYS) - 1) * DAYS);

/** Effective annual yield if everything is reinvested. */
export const effectiveAnnual = (annual, simple) => (simple ? (1 + annual / 12) ** 12 : (1 + annual / DAYS) ** DAYS) - 1;

// ponytail: flat NDFL rate chosen by user (13–22%), no progressive brackets.
// opts.exempt — tax-free yearly interest (deposits: 1 000 000 ₽ × max key rate), 0 for funds.
export const tax = (gross, opts) => Math.max(0, gross - (opts.exempt || 0)) * (opts.tax || 0);
export const netFromGross = (g, opts) => g - tax(g, opts);

export function grossFromNet(n, opts) {
  const t = opts.tax || 0, e = opts.exempt || 0;
  return n <= e ? n : (n - t * e) / (1 - t);
}

/**
 * Solve for the missing value.
 * capital — money, rate — nominal annual fraction (before fund fee),
 * income — net monthly income, opts.fee — annual fund fee fraction,
 * opts.tax — NDFL rate fraction, opts.exempt — tax-free income, opts.simple — deposit mode.
 */
export function solve(target, { capital, rate, income }, opts) {
  const fee = opts.fee || 0;
  if (target === 'income') {
    const net = rate - fee;
    if (!(capital > 0) || !(net > 0)) return NaN;
    return netFromGross(12 * capital * monthlyRate(net, opts.simple), opts) / 12;
  }
  if (target === 'capital') {
    const net = rate - fee;
    if (!(income > 0) || !(net > 0)) return NaN;
    return grossFromNet(12 * income, opts) / 12 / monthlyRate(net, opts.simple);
  }
  if (target === 'rate') {
    if (!(capital > 0) || !(income > 0)) return NaN;
    return annualFromMonthly(grossFromNet(12 * income, opts) / 12 / capital, opts.simple) + fee;
  }
  return NaN;
}
