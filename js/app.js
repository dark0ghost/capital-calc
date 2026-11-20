import { solve, monthlyRate, annualFromMonthly, effectiveAnnual, tax } from './calc.js';

const $ = (id) => document.getElementById(id);
const SYMBOL = { RUB: '₽', USD: '$', EUR: '€', CNY: '¥' };
const money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const pct = (d) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d });

const parse = (s) => {
  const v = String(s).replace(/[\s ]/g, '').replace(',', '.');
  return v === '' ? NaN : Number(v);
};

// canonical state: capital, rate (annual fraction), income (net per month)
const state = { capital: NaN, rate: 0.16, income: 100_000 };
let recent = ['rate', 'income']; // two last edited groups; the third is computed

const fields = {
  capital: { group: 'capital', get: () => state.capital, set: (v) => (state.capital = v), fmt: (v) => money.format(v) },
  rateY: { group: 'rate', get: () => state.rate * 100, set: (v) => (state.rate = v / 100), fmt: (v) => pct(2).format(v) },
  rateM: {
    group: 'rate',
    get: () => monthlyRate(state.rate, isDeposit()) * 100,
    set: (v) => (state.rate = annualFromMonthly(v / 100, isDeposit())),
    fmt: (v) => pct(3).format(v),
  },
  incM: { group: 'income', get: () => state.income, set: (v) => (state.income = v), fmt: (v) => money.format(v) },
  incY: { group: 'income', get: () => state.income * 12, set: (v) => (state.income = v / 12), fmt: (v) => money.format(v) },
};

const isDeposit = () => $('kind').value === 'deposit';

const opts = () => {
  const simple = isDeposit();
  // ponytail: exemption is in ₽, so applied to RUB deposits only
  const exempt = simple && $('currency').value === 'RUB' ? 1_000_000 * ((parse($('keyRate').value) || 0) / 100) : 0;
  return { fee: simple ? 0 : (parse($('fee').value) || 0) / 100, tax: Number($('tax').value) / 100, exempt, simple };
};

const target = () => ['capital', 'rate', 'income'].find((g) => !recent.includes(g));

function render(skipId) {
  for (const [id, f] of Object.entries(fields)) {
    if (id === skipId) continue;
    const v = f.get();
    $(id).value = Number.isFinite(v) ? f.fmt(v) : '';
  }
  document.querySelectorAll('.block').forEach((b) => b.classList.toggle('calc', b.dataset.group === target()));

  const o = opts();
  const { capital: c, rate: r, income } = state;
  const ok = c > 0 && income > 0 && Number.isFinite(r);
  const sym = SYMBOL[$('currency').value];
  const gross = ok ? 12 * c * monthlyRate(r - o.fee, o.simple) : NaN;
  $('sNet').textContent = ok ? `${pct(2).format((income * 12 * 100) / c)}% год.` : '—';
  $('sTax').textContent = ok ? `${money.format(tax(gross, o))} ${sym}` : '—';
  $('sFee').textContent = ok ? `${money.format(12 * c * (monthlyRate(r, o.simple) - monthlyRate(r - o.fee, o.simple)))} ${sym}` : '—';
  $('sReinv').textContent = ok ? `${money.format(c * (1 + effectiveAnnual(r - o.fee, o.simple)))} ${sym}` : '—';
}

function recalc(skipId) {
  const t = target();
  state[t] = solve(t, state, opts());
  render(skipId);
}

for (const [id, f] of Object.entries(fields)) {
  const el = $(id);
  el.addEventListener('input', () => {
    f.set(parse(el.value));
    recent = [...recent.filter((g) => g !== f.group), f.group].slice(-2);
    recalc(id);
  });
  el.addEventListener('blur', () => render());
}

for (const id of ['fee', 'keyRate']) $(id).addEventListener('input', () => recalc());
$('kind').addEventListener('change', () => {
  $('feeBox').hidden = isDeposit();
  $('keyBox').hidden = !isDeposit();
  recalc();
});
$('tax').addEventListener('change', () => recalc());
$('currency').addEventListener('change', () => {
  document.querySelectorAll('.cur').forEach((e) => (e.textContent = SYMBOL[$('currency').value]));
  recalc();
});
$('currency').dispatchEvent(new Event('change'));
