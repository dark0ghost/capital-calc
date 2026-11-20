import assert from 'node:assert/strict';
import { solve, monthlyRate, annualFromMonthly, tax, grossFromNet } from './calc.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} != ${b}`);

// daily accrual: 16% nominal → ~1.342%/month, round-trip
close(monthlyRate(0.16), (1 + 0.16 / 365) ** (365 / 12) - 1);
close(annualFromMonthly(monthlyRate(0.16)), 0.16);

// flat NDFL and its inverse
close(tax(1000, { tax: 0.22 }), 220);
for (const t of [0, 0.13, 0.22]) close(grossFromNet(1000 - tax(1000, { tax: t }), { tax: t }), 1000);

// deposit exemption: 1 000 000 × 21% = 210 000 tax-free, tax only above
const dep = { tax: 0.13, exempt: 210_000, simple: true };
assert.equal(tax(200_000, dep), 0);
close(tax(310_000, dep), 13_000);
for (const g of [100_000, 210_000, 500_000]) close(grossFromNet(g - tax(g, dep), dep), g);
close(solve('income', { capital: 1e7, rate: 0.12 }, dep), (1.2e6 - 0.13 * (1.2e6 - 210_000)) / 12);

// any two → third, all directions agree
for (const opts of [{ fee: 0 }, { fee: 0.003, tax: 0.13 }, { fee: 0.005, tax: 0.22 }, dep, { ...dep, exempt: 5e6 }]) {
  const capital = 30_000_000, rate = 0.16;
  const income = solve('income', { capital, rate }, opts);
  close(solve('capital', { rate, income }, opts), capital);
  close(solve('rate', { capital, income }, opts), rate);
}

// 1 000 000 at 12%, no fee/tax → ~10 050/month
close(solve('income', { capital: 1e6, rate: 0.12 }, {}), 1e6 * monthlyRate(0.12));
assert.ok(Number.isNaN(solve('capital', { rate: 0.002, income: 1 }, { fee: 0.003 })));

console.log('calc ok');
