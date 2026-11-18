import type { ID, Organization, OrgMember } from '@/types';
import { createRng, isoDay, parseDay } from '@/mocks/random';
import { agentsOf } from './orgs';

/**
 * Simulated market and portfolios for an investment organization. Everything
 * is derived from the organization's seed, so numbers are stable across
 * reloads. Each portfolio is rebalanced to its target weights on a schedule
 * and drifts in between. A stock's contribution over a period is its profit
 * in money divided by the portfolio's value at the start, so the contributions
 * of a period add up exactly to the portfolio's return (cash earns nothing).
 */

export interface Stock {
  ticker: string;
  name: string;
  sector: string;
}

export interface Holding {
  ticker: string;
  shares: number;
}

export interface Portfolio {
  id: ID;
  name: string;
  strategy: string;
  /** Months between rebalances back to the target weights. */
  rebalanceMonths: number;
  /** Shares held today. */
  holdings: Holding[];
  /** Cash today. */
  cash: number;
  /** Shares held at each day's close (after any rebalance that day), by ticker. */
  sharesAt: Record<string, number[]>;
  cashAt: number[];
}

export interface MarketBook {
  /** Trading days (weekdays), yyyy-mm-dd, oldest first. Index 0 is inception. */
  days: string[];
  prices: Record<string, number[]>;
  /** Market index level (starts at 100). */
  benchmark: number[];
  portfolios: Portfolio[];
}

export const UNIVERSE: Stock[] = [
  { ticker: 'NWTC', name: 'Northwind Technologies', sector: 'Technology' },
  { ticker: 'HLXS', name: 'Helix Semiconductors', sector: 'Technology' },
  { ticker: 'CRSF', name: 'Cirrus Software', sector: 'Technology' },
  { ticker: 'QNTN', name: 'Quanta Networks', sector: 'Technology' },
  { ticker: 'MDVN', name: 'Medivan Health', sector: 'Healthcare' },
  { ticker: 'GNRX', name: 'Genorix Bio', sector: 'Healthcare' },
  { ticker: 'CLRC', name: 'Clearcare Devices', sector: 'Healthcare' },
  { ticker: 'ALDB', name: 'Aldbury Bank', sector: 'Financials' },
  { ticker: 'STRL', name: 'Sterling Assurance', sector: 'Financials' },
  { ticker: 'FNCH', name: 'Finch Payments', sector: 'Financials' },
  { ticker: 'BRNT', name: 'Brentmoor Energy', sector: 'Energy' },
  { ticker: 'SLRW', name: 'Solarwave Power', sector: 'Energy' },
  { ticker: 'OKLM', name: 'Oaklane Markets', sector: 'Consumer' },
  { ticker: 'VRDA', name: 'Verda Foods', sector: 'Consumer' },
  { ticker: 'PTRL', name: 'Petrel Apparel', sector: 'Consumer' },
  { ticker: 'TRKN', name: 'Trackline Rail', sector: 'Industrials' },
  { ticker: 'KSTL', name: 'Kestrel Aerospace', sector: 'Industrials' },
  { ticker: 'FRGE', name: 'Forge Machinery', sector: 'Industrials' },
  { ticker: 'AQWT', name: 'Aquawest Utilities', sector: 'Utilities' },
  { ticker: 'GRDL', name: 'Gridline Power', sector: 'Utilities' },
  { ticker: 'CPRM', name: 'Copperhill Mining', sector: 'Materials' },
  { ticker: 'LTHA', name: 'Lithia Materials', sector: 'Materials' },
  { ticker: 'ECHM', name: 'Echo Media', sector: 'Communication' },
  { ticker: 'SGNL', name: 'Signal Telecom', sector: 'Communication' },
  { ticker: 'VLTA', name: 'Volta Robotics', sector: 'Technology' },
  { ticker: 'ORBT', name: 'Orbit Cloud', sector: 'Technology' },
  { ticker: 'PLSE', name: 'Pulse Diagnostics', sector: 'Healthcare' },
  { ticker: 'HRBR', name: 'Harbor Capital Markets', sector: 'Financials' },
  { ticker: 'TDLW', name: 'Tidewell Offshore', sector: 'Energy' },
  { ticker: 'NRTH', name: 'Northgas', sector: 'Energy' },
  { ticker: 'BRKW', name: 'Brookway Home', sector: 'Consumer' },
  { ticker: 'ANVL', name: 'Anvil Construction', sector: 'Industrials' },
  { ticker: 'CLWT', name: 'Clearwater Water', sector: 'Utilities' },
  { ticker: 'GRNT', name: 'Granite Cement', sector: 'Materials' },
  { ticker: 'SLVR', name: 'Silverline Metals', sector: 'Materials' },
  { ticker: 'SKYL', name: 'Skyline Studios', sector: 'Communication' },
];

export const stockOf = (ticker: string) => UNIVERSE.find((s) => s.ticker === ticker)!;

const SECTOR_DRIFT: Record<string, number> = {
  Technology: 0.15, Healthcare: 0.09, Financials: 0.07, Energy: 0.04, Consumer: 0.06,
  Industrials: 0.07, Utilities: 0.04, Materials: 0.05, Communication: 0.08,
};

const STRATEGIES = [
  { name: 'Growth Equity', strategy: 'Fast-growing companies in technology, healthcare and media.', tilt: ['Technology', 'Healthcare', 'Communication'], capital: 25_000_000, rebalanceMonths: 6 },
  { name: 'Income & Dividend', strategy: 'Steady dividend payers in utilities, financials and consumer staples.', tilt: ['Utilities', 'Financials', 'Consumer'], capital: 15_000_000, rebalanceMonths: 3 },
  { name: 'Global Balanced', strategy: 'A spread across every sector for steady returns with lower risk.', tilt: [], capital: 10_000_000, rebalanceMonths: 1 },
];

/** Regulatory limits. The labels match the compliance rules written in src/lib/orgs.ts. */
export const LIMITS = { stock: 0.1, bigHoldings: 0.4, bigHolding: 0.05, sector: 0.35, cash: 0.02 } as const;

const HOLDINGS_PER_PORTFOLIO = 22;
/** The first holdings picked are core positions; the rest are smaller satellites. */
const CORE_HOLDINGS = 5;
const TRADING_DAYS = 252;

const cache = new Map<string, MarketBook>();

/** The simulated market and portfolios of an organization. Cached per seed and day. */
export function marketFor(org: Pick<Organization, 'seed'>, today = new Date()): MarketBook {
  const key = `${org.seed}|${isoDay(today)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const book = simulate(org.seed, today);
  cache.set(key, book);
  return book;
}

function simulate(seed: number, today: Date): MarketBook {
  const rng = createRng(seed);
  const normal = () => {
    const u = Math.max(1e-9, rng.next());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng.next());
  };

  // Inception: early in the year before last, so ITD, YTD and MoM all have history.
  const start = new Date(today.getFullYear() - 2, rng.int(0, 5), 2);
  const days: string[] = [];
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(isoDay(d));
  }

  const marketDrift = 0.06;
  const marketVol = 0.15;
  const market = days.map((_, i) => (i === 0 ? 0 : marketDrift / TRADING_DAYS + (marketVol / Math.sqrt(TRADING_DAYS)) * normal()));
  const benchmark: number[] = [];
  market.forEach((r, i) => benchmark.push(i === 0 ? 100 : benchmark[i - 1]! * Math.exp(r)));

  const prices: Record<string, number[]> = {};
  for (const s of UNIVERSE) {
    const beta = rng.range(0.6, 1.3);
    const drift = (SECTOR_DRIFT[s.sector] ?? 0.06) - marketDrift * beta + rng.range(-0.08, 0.08);
    const vol = rng.range(0.14, 0.32);
    const series: number[] = [rng.range(20, 320)];
    for (let i = 1; i < days.length; i++) {
      const r = beta * market[i]! + drift / TRADING_DAYS + (vol / Math.sqrt(TRADING_DAYS)) * normal();
      series.push(series[i - 1]! * Math.exp(r));
    }
    prices[s.ticker] = series;
  }

  const portfolios = STRATEGIES.map((st, pi) => {
    // At most three names per sector, preferring the tilted sectors.
    const shuffled = [...UNIVERSE].sort(() => rng.next() - 0.5);
    const ordered = [...shuffled.filter((s) => st.tilt.includes(s.sector)), ...shuffled.filter((s) => !st.tilt.includes(s.sector))];
    const picked: Stock[] = [];
    for (const s of ordered) {
      if (picked.length === HOLDINGS_PER_PORTFOLIO) break;
      if (picked.filter((p) => p.sector === s.sector).length < 3) picked.push(s);
    }
    const invested = 0.965;
    const core = picked.slice(0, CORE_HOLDINGS).map(() => rng.range(0.058, 0.072));
    const coreTotal = core.reduce((a, b) => a + b, 0);
    const raw = picked.slice(CORE_HOLDINGS).map(() => rng.range(0.7, 1));
    const rawTotal = raw.reduce((a, b) => a + b, 0);
    const weights = [...core, ...raw.map((w) => (w / rawTotal) * (invested - coreTotal))];

    // Buy at inception, then rebalance at the close of every scheduled month end.
    const sharesAt: Record<string, number[]> = Object.fromEntries(picked.map((s) => [s.ticker, []]));
    const cashAt: number[] = [];
    let shares = picked.map(() => 0);
    let cash = st.capital;
    days.forEach((d, i) => {
      const next = days[i + 1];
      const monthEnd = next !== undefined && next.slice(0, 7) !== d.slice(0, 7) && Number(d.slice(5, 7)) % st.rebalanceMonths === 0;
      if (i === 0 || monthEnd) {
        const value = cash + picked.reduce((sum, s, k) => sum + shares[k]! * prices[s.ticker]![i]!, 0);
        shares = picked.map((s, k) => Math.floor((weights[k]! * value) / prices[s.ticker]![i]!));
        cash = value - picked.reduce((sum, s, k) => sum + shares[k]! * prices[s.ticker]![i]!, 0);
      }
      picked.forEach((s, k) => sharesAt[s.ticker]!.push(shares[k]!));
      cashAt.push(cash);
    });
    return {
      id: `pf-${pi + 1}`,
      name: st.name,
      strategy: st.strategy,
      rebalanceMonths: st.rebalanceMonths,
      holdings: picked.map((s, k) => ({ ticker: s.ticker, shares: shares[k]! })),
      cash,
      sharesAt,
      cashAt,
    };
  });

  return { days, prices, benchmark, portfolios };
}

/* --------------------------------- maths --------------------------------- */

export const valueAt = (book: MarketBook, p: Portfolio, i: number) =>
  p.cashAt[i]! + p.holdings.reduce((sum, h) => sum + p.sharesAt[h.ticker]![i]! * book.prices[h.ticker]![i]!, 0);

/** Money made or lost on one holding between two closes, following the shares actually held each day. */
function profit(book: MarketBook, p: Portfolio, ticker: string, a: number, b: number) {
  const price = book.prices[ticker]!;
  const held = p.sharesAt[ticker]!;
  let sum = 0;
  for (let t = a + 1; t <= b; t++) sum += held[t - 1]! * (price[t]! - price[t - 1]!);
  return sum;
}

export const lastIndex = (book: MarketBook) => book.days.length - 1;

export type Period = 'ITD' | 'YTD' | 'QTD' | 'MTD' | 'MoM';

export const PERIOD_LABEL: Record<Period, string> = {
  ITD: 'Inception to date',
  YTD: 'Year to date',
  QTD: 'Quarter to date',
  MTD: 'Month to date',
  MoM: 'Last full month',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Index of the close the period is measured from (the last day before it starts). */
export function periodRange(book: MarketBook, period: Period): [number, number] {
  const end = lastIndex(book);
  const [y, m] = book.days[end]!.split('-').map(Number) as [number, number];
  const before = (boundary: string) => {
    let i = end;
    while (i > 0 && book.days[i]! >= boundary) i--;
    return i;
  };
  switch (period) {
    case 'ITD':
      return [0, end];
    case 'YTD':
      return [before(`${y}-01-01`), end];
    case 'QTD':
      return [before(`${y}-${pad(Math.floor((m - 1) / 3) * 3 + 1)}-01`), end];
    case 'MTD':
      return [before(`${y}-${pad(m)}-01`), end];
    case 'MoM': {
      const monthStart = before(`${y}-${pad(m)}-01`);
      const prev = m === 1 ? `${y - 1}-12-01` : `${y}-${pad(m - 1)}-01`;
      return [before(prev), monthStart];
    }
  }
}

export interface StockStat {
  ticker: string;
  name: string;
  sector: string;
  shares: number;
  price: number;
  value: number;
  /** Weight today, 0–1. */
  weight: number;
  /** Return of the stock over the period, 0.12 = 12%. */
  ret: number;
  /** Its contribution to the portfolio's return over the period. */
  contribution: number;
}

export interface PortfolioStats {
  portfolio: Portfolio;
  value: number;
  cashWeight: number;
  /** Portfolio and benchmark return per period. */
  returns: Record<Period, { portfolio: number; benchmark: number }>;
  stocks: StockStat[];
}

export function stockStats(book: MarketBook, p: Portfolio, period: Period): StockStat[] {
  const [a, b] = periodRange(book, period);
  const end = lastIndex(book);
  const startValue = valueAt(book, p, a);
  const value = valueAt(book, p, end);
  return p.holdings.map((h) => {
    const series = book.prices[h.ticker]!;
    const ret = series[b]! / series[a]! - 1;
    const s = stockOf(h.ticker);
    return {
      ticker: h.ticker,
      name: s.name,
      sector: s.sector,
      shares: h.shares,
      price: series[end]!,
      value: h.shares * series[end]!,
      weight: (h.shares * series[end]!) / value,
      ret,
      contribution: profit(book, p, h.ticker, a, b) / startValue,
    };
  });
}

export function portfolioStats(book: MarketBook, p: Portfolio, period: Period = 'ITD'): PortfolioStats {
  const end = lastIndex(book);
  const value = valueAt(book, p, end);
  const returns = {} as PortfolioStats['returns'];
  for (const per of Object.keys(PERIOD_LABEL) as Period[]) {
    const [a, b] = periodRange(book, per);
    returns[per] = { portfolio: valueAt(book, p, b) / valueAt(book, p, a) - 1, benchmark: book.benchmark[b]! / book.benchmark[a]! - 1 };
  }
  return { portfolio: p, value, cashWeight: p.cash / value, returns, stocks: stockStats(book, p, period) };
}

/** Growth of 100 for the portfolio and the market, from `from` to today. */
export function growthSeries(book: MarketBook, p: Portfolio, from = 0) {
  const base = valueAt(book, p, from);
  const bench = book.benchmark[from]!;
  const out: Array<{ date: string; portfolio: number; benchmark: number }> = [];
  for (let i = from; i < book.days.length; i++) {
    out.push({ date: book.days[i]!, portfolio: (valueAt(book, p, i) / base) * 100, benchmark: (book.benchmark[i]! / bench) * 100 });
  }
  return out;
}

export interface MonthReturn {
  month: string; // yyyy-mm
  portfolio: number;
  benchmark: number;
  /** Return per stock, by ticker. */
  stocks: Record<string, number>;
}

/** Month-on-month returns since inception. The current month is month to date. */
export function monthlyReturns(book: MarketBook, p: Portfolio): MonthReturn[] {
  const ends: number[] = [];
  book.days.forEach((d, i) => {
    const next = book.days[i + 1];
    if (!next || next.slice(0, 7) !== d.slice(0, 7)) ends.push(i);
  });
  return ends.map((end, k) => {
    const start = k === 0 ? 0 : ends[k - 1]!;
    const stocks: Record<string, number> = {};
    for (const h of p.holdings) stocks[h.ticker] = book.prices[h.ticker]![end]! / book.prices[h.ticker]![start]! - 1;
    return {
      month: book.days[end]!.slice(0, 7),
      portfolio: valueAt(book, p, end) / valueAt(book, p, start) - 1,
      benchmark: book.benchmark[end]! / book.benchmark[start]! - 1,
      stocks,
    };
  });
}

export const monthLabel = (month: string) => parseDay(`${month}-15`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });

/** Annualised volatility and the deepest fall from a peak, since inception. */
export function riskStats(book: MarketBook, p: Portfolio) {
  let peak = 0;
  let maxDrawdown = 0;
  const rets: number[] = [];
  let prev = valueAt(book, p, 0);
  for (let i = 0; i < book.days.length; i++) {
    const v = valueAt(book, p, i);
    if (i > 0) rets.push(v / prev - 1);
    prev = v;
    peak = Math.max(peak, v);
    maxDrawdown = Math.min(maxDrawdown, v / peak - 1);
  }
  const mean = rets.reduce((a, b) => a + b, 0) / Math.max(1, rets.length);
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length - 1);
  return { volatility: Math.sqrt(variance * TRADING_DAYS), maxDrawdown };
}

/* ------------------------------ compliance ------------------------------- */

export type CheckStatus = 'pass' | 'warning' | 'breach';

export interface ComplianceCheck {
  id: string;
  rule: string;
  status: CheckStatus;
  /** Measured value and limit, both 0–1. */
  value: number;
  limit: number;
  detail: string;
}

/** Within this share of a limit counts as a warning. */
const NEAR = 0.9;

const judge = (value: number, limit: number, floor = false): CheckStatus =>
  floor ? (value < limit ? 'breach' : value < limit / NEAR ? 'warning' : 'pass') : value > limit ? 'breach' : value > limit * NEAR ? 'warning' : 'pass';

export const pctText = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;
export const signedPct = (n: number, digits = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n * 100).toFixed(digits)}%`;

export function sectorWeights(stocks: Array<Pick<StockStat, 'sector' | 'weight'>>) {
  const by = new Map<string, number>();
  for (const s of stocks) by.set(s.sector, (by.get(s.sector) ?? 0) + s.weight);
  return [...by.entries()].map(([sector, weight]) => ({ sector, weight })).sort((a, b) => b.weight - a.weight);
}

export function complianceChecks(stocks: Array<Pick<StockStat, 'ticker' | 'sector' | 'weight'>>, cashWeight: number): ComplianceCheck[] {
  const top = [...stocks].sort((a, b) => b.weight - a.weight)[0];
  const big = stocks.filter((s) => s.weight > LIMITS.bigHolding).reduce((sum, s) => sum + s.weight, 0);
  const sector = sectorWeights(stocks)[0];
  const over = stocks.filter((s) => s.weight > LIMITS.stock).map((s) => s.ticker);
  return [
    {
      id: 'stock',
      rule: 'No single stock above 10%',
      status: judge(top?.weight ?? 0, LIMITS.stock),
      value: top?.weight ?? 0,
      limit: LIMITS.stock,
      detail: over.length ? `${over.join(', ')} ${over.length === 1 ? 'is' : 'are'} above the limit.` : `Largest holding is ${top?.ticker} at ${pctText(top?.weight ?? 0)}.`,
    },
    {
      id: '5-10-40',
      rule: 'Holdings above 5% add up to at most 40%',
      status: judge(big, LIMITS.bigHoldings),
      value: big,
      limit: LIMITS.bigHoldings,
      detail: `${stocks.filter((s) => s.weight > LIMITS.bigHolding).length} holdings are above 5%, together ${pctText(big)}.`,
    },
    {
      id: 'sector',
      rule: 'No sector above 35%',
      status: judge(sector?.weight ?? 0, LIMITS.sector),
      value: sector?.weight ?? 0,
      limit: LIMITS.sector,
      detail: `Largest sector is ${sector?.sector} at ${pctText(sector?.weight ?? 0)}.`,
    },
    {
      id: 'cash',
      rule: 'At least 2% in cash',
      status: judge(cashWeight, LIMITS.cash, true),
      value: cashWeight,
      limit: LIMITS.cash,
      detail: `Cash is ${pctText(cashWeight)} of the portfolio.`,
    },
  ];
}

export const worstStatus = (checks: Array<{ status: CheckStatus }>): CheckStatus =>
  checks.some((c) => c.status === 'breach') ? 'breach' : checks.some((c) => c.status === 'warning') ? 'warning' : 'pass';

/* ---------------------------- recommendations ---------------------------- */

export interface Order {
  side: 'BUY' | 'SELL';
  ticker: string;
  shares: number;
  price: number;
  value: number;
  weightBefore: number;
  weightAfter: number;
}

export interface Recommendation {
  id: string;
  agentId: ID;
  agentName: string;
  role: string;
  portfolioId: ID;
  title: string;
  detail: string;
  order?: Order;
  /** False when following it would break a compliance rule. */
  compliant: boolean;
  tone: 'trade' | 'allocation' | 'cash' | 'compliance' | 'risk' | 'insight';
}

/** 3-month momentum: the stock's return over the last 63 trading days. */
const momentum = (book: MarketBook, ticker: string) => {
  const s = book.prices[ticker]!;
  const end = s.length - 1;
  return s[end]! / s[Math.max(0, end - 63)]! - 1;
};

/**
 * Trades that improve the portfolio and keep it within the limits: trim
 * anything above 9.5%, sell the weakest falling stock, and put the proceeds
 * and spare cash into the strongest stocks that have room under every limit.
 */
export function proposeOrders(book: MarketBook, stats: PortfolioStats): Order[] {
  const { value, stocks } = stats;
  const target = LIMITS.stock * 0.95;
  const weights = new Map(stocks.map((s) => [s.ticker, s.weight]));
  const orders: Order[] = [];
  let cash = stats.cashWeight;

  const sell = (s: StockStat, toWeight: number) => {
    const shares = Math.floor(((s.weight - toWeight) * value) / s.price);
    if (shares <= 0) return;
    const after = s.weight - (shares * s.price) / value;
    const earlier = orders.find((o) => o.ticker === s.ticker);
    if (earlier) Object.assign(earlier, { shares: earlier.shares + shares, value: (earlier.shares + shares) * s.price, weightAfter: after });
    else orders.push({ side: 'SELL', ticker: s.ticker, shares, price: s.price, value: shares * s.price, weightBefore: s.weight, weightAfter: after });
    weights.set(s.ticker, after);
    cash += s.weight - after;
  };

  for (const s of stocks.filter((x) => x.weight > target)) sell(s, target * 0.95);

  // 5/10/40: trim the smallest holdings above 5% back under 5% until the total has room again.
  const bigTotal = () => [...weights.values()].filter((w) => w > LIMITS.bigHolding).reduce((a, b) => a + b, 0);
  const bigOnes = stocks.filter((s) => weights.get(s.ticker)! > LIMITS.bigHolding).sort((a, b) => weights.get(a.ticker)! - weights.get(b.ticker)!);
  for (const s of bigOnes) {
    if (bigTotal() <= LIMITS.bigHoldings * 0.95) break;
    sell({ ...s, weight: weights.get(s.ticker)! }, LIMITS.bigHolding * 0.96);
  }

  const ranked = [...stocks].sort((a, b) => momentum(book, a.ticker) - momentum(book, b.ticker));
  const weakest = ranked[0];
  if (weakest && momentum(book, weakest.ticker) < -0.05 && !orders.some((o) => o.ticker === weakest.ticker)) sell(weakest, weakest.weight / 2);

  const sectorOf = (t: string) => stockOf(t).sector;
  const sectorWeight = (sector: string) => [...weights].filter(([t]) => sectorOf(t) === sector).reduce((sum, [, w]) => sum + w, 0);
  for (const s of [...ranked].reverse().slice(0, 4)) {
    const spare = cash - LIMITS.cash * 1.5;
    if (spare <= 0.002) break;
    if (orders.some((o) => o.ticker === s.ticker) || momentum(book, s.ticker) <= 0) continue;
    const w = weights.get(s.ticker)!;
    const roomStock = LIMITS.stock * 0.85 - w;
    const roomSector = LIMITS.sector * NEAR - sectorWeight(s.sector);
    const add = Math.min(spare, roomStock, roomSector, 0.02);
    if (add <= 0.002) continue;
    // Do not let a new holding above 5% push the 5/10/40 total over its limit.
    const bigAfter = bigTotal() - (w > LIMITS.bigHolding ? w : 0) + (w + add > LIMITS.bigHolding ? w + add : 0);
    if (bigAfter > LIMITS.bigHoldings * NEAR) continue;
    const shares = Math.floor((add * value) / s.price);
    if (shares <= 0) continue;
    const after = w + (shares * s.price) / value;
    orders.push({ side: 'BUY', ticker: s.ticker, shares, price: s.price, value: shares * s.price, weightBefore: w, weightAfter: after });
    weights.set(s.ticker, after);
    cash -= after - w;
  }
  return orders;
}

/** The portfolio's weights and cash after the orders are filled. */
export function afterOrders(stats: PortfolioStats, orders: Order[]) {
  const stocks = stats.stocks.map((s) => {
    const o = orders.find((x) => x.ticker === s.ticker);
    return { ticker: s.ticker, sector: s.sector, weight: o ? o.weightAfter : s.weight };
  });
  const cashWeight = 1 - stocks.reduce((sum, s) => sum + s.weight, 0);
  return { stocks, cashWeight };
}

type Recommender = (ctx: {
  book: MarketBook;
  stats: PortfolioStats;
  orders: Order[];
  checks: ComplianceCheck[];
  postChecks: ComplianceCheck[];
  agent: OrgMember;
}) => Array<Omit<Recommendation, 'id' | 'agentId' | 'agentName' | 'role' | 'portfolioId'>>;

const money = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', notation: n >= 1e6 ? 'compact' : 'standard', maximumFractionDigits: n >= 1e6 ? 2 : 0 }).format(n);

const RECOMMENDERS: Array<[RegExp, Recommender]> = [
  [
    /trader|dealer|execution/i,
    ({ orders }) =>
      orders.length
        ? orders.map((o) => ({
            tone: 'trade' as const,
            title: `${o.side} ${o.shares.toLocaleString('en-GB')} ${o.ticker} at about £${o.price.toFixed(2)}`,
            detail: `${money(o.value)} order. Weight goes from ${pctText(o.weightBefore)} to ${pctText(o.weightAfter)}. Place as a limit order over the day to keep the price impact low.`,
            order: o,
            compliant: o.weightAfter <= LIMITS.stock,
          }))
        : [{ tone: 'trade', title: 'No trades today', detail: 'Every holding is within its limits and no stock has a strong enough signal to act on.', compliant: true }],
  ],
  [
    /investment manager|research|analyst/i,
    ({ book, stats }) => {
      const ranked = [...stats.stocks].sort((a, b) => momentum(book, b.ticker) - momentum(book, a.ticker));
      const best = ranked.slice(0, 2);
      const worst = ranked.slice(-2).reverse();
      const sectors = sectorWeights(stats.stocks);
      return [
        {
          tone: 'allocation',
          title: `Favour ${best.map((s) => s.ticker).join(' and ')}`,
          detail: `Strongest 3-month momentum (${best.map((s) => `${s.ticker} ${signedPct(momentum(book, s.ticker))}`).join(', ')}). Add to them while they stay under the 10% limit.`,
          compliant: best.every((s) => s.weight < LIMITS.stock),
        },
        {
          tone: 'allocation',
          title: `Review ${worst.map((s) => s.ticker).join(' and ')}`,
          detail: `Weakest 3-month momentum (${worst.map((s) => `${s.ticker} ${signedPct(momentum(book, s.ticker))}`).join(', ')}). Reduce if the trend does not turn within a month.`,
          compliant: true,
        },
        {
          tone: 'insight',
          title: `Largest exposure: ${sectors[0]?.sector} at ${pctText(sectors[0]?.weight ?? 0)}`,
          detail: `Sector limit is 35%. ${(sectors[0]?.weight ?? 0) > LIMITS.sector * NEAR ? 'Close to the limit: do not add more to this sector.' : 'There is room to add to it if the outlook supports it.'}`,
          compliant: (sectors[0]?.weight ?? 0) <= LIMITS.sector,
        },
      ];
    },
  ],
  [
    /fund manager|portfolio manager/i,
    ({ stats, orders }) => {
      const spare = stats.cashWeight - LIMITS.cash * 1.5;
      const bought = orders.filter((o) => o.side === 'BUY').reduce((s, o) => s + o.value, 0);
      const sold = orders.filter((o) => o.side === 'SELL').reduce((s, o) => s + o.value, 0);
      const ytd = stats.returns.YTD;
      return [
        {
          tone: 'cash',
          title: spare > 0.005 ? `Put ${money(spare * stats.value)} of spare cash to work` : stats.cashWeight < LIMITS.cash ? 'Raise cash above the 2% minimum' : 'Cash is at the right level',
          detail: `Cash is ${pctText(stats.cashWeight)} (minimum 2%). The proposed trades buy ${money(bought)} and sell ${money(sold)}.`,
          compliant: true,
        },
        {
          tone: 'insight',
          title: ytd.portfolio >= ytd.benchmark ? `Ahead of the market this year by ${pctText(ytd.portfolio - ytd.benchmark)}` : `Behind the market this year by ${pctText(ytd.benchmark - ytd.portfolio)}`,
          detail: `Year to date ${signedPct(ytd.portfolio)} against ${signedPct(ytd.benchmark)} for the market. ${ytd.portfolio >= ytd.benchmark ? 'Keep the current allocation and rebalance only where limits require it.' : 'Rotate from the weakest contributors into stronger names, within the limits.'}`,
          compliant: true,
        },
      ];
    },
  ],
  [
    /audit|compliance/i,
    ({ checks, postChecks, orders }) => {
      const issues = checks.filter((c) => c.status !== 'pass');
      const fixed = issues.filter((c) => postChecks.find((p) => p.id === c.id)?.status === 'pass');
      const out = issues.map((c) => ({
        tone: 'compliance' as const,
        title: `${c.status === 'breach' ? 'Breach' : 'Close to the limit'}: ${c.rule.toLowerCase()}`,
        detail: `${c.detail} ${fixed.includes(c) ? 'The proposed trades fix this.' : c.status === 'breach' ? 'Must be fixed before any new buy.' : 'Do not add to it.'}`,
        compliant: c.status !== 'breach',
      }));
      const after = worstStatus(postChecks);
      out.push({
        tone: 'compliance',
        title: after === 'breach' ? 'Proposed trades still leave a breach' : `All ${orders.length} proposed trades keep the portfolio within limits`,
        detail: after === 'breach' ? 'Hold the orders until the breach is resolved.' : 'Checked against the 10% stock limit, the 5/10/40 rule, the 35% sector limit and the 2% cash minimum.',
        compliant: after !== 'breach',
      });
      return out;
    },
  ],
  [
    /risk/i,
    ({ book, stats }) => {
      const r = riskStats(book, stats.portfolio);
      return [{ tone: 'risk', title: `Volatility ${pctText(r.volatility)} a year, deepest fall ${pctText(r.maxDrawdown)}`, detail: r.volatility > 0.2 ? 'Risk is high for this strategy: favour lower-volatility names when adding.' : 'Risk is in line with the strategy.', compliant: true }];
    },
  ],
];

/** Every agent's recommendations for one portfolio. Agents without a known role give an insight. */
export function recommendationsFor(org: Organization, book: MarketBook, stats: PortfolioStats): { orders: Order[]; checks: ComplianceCheck[]; postChecks: ComplianceCheck[]; recs: Recommendation[] } {
  const checks = complianceChecks(stats.stocks, stats.cashWeight);
  const orders = proposeOrders(book, stats);
  const post = afterOrders(stats, orders);
  const postChecks = complianceChecks(post.stocks, post.cashWeight);
  const recs: Recommendation[] = [];
  for (const agent of agentsOf(org)) {
    const recommender = RECOMMENDERS.find(([re]) => re.test(agent.role))?.[1];
    const items = recommender
      ? recommender({ book, stats, orders, checks, postChecks, agent })
      : [{ tone: 'insight' as const, title: `${agent.role}: watching ${stats.portfolio.name}`, detail: agent.responsibility, compliant: true }];
    items.forEach((it, i) =>
      recs.push({ ...it, id: `${stats.portfolio.id}-${agent.id}-${i}`, agentId: agent.id, agentName: agent.name, role: agent.role, portfolioId: stats.portfolio.id }),
    );
  }
  return { orders, checks, postChecks, recs };
}

/** Status of an investment organization: attention when any portfolio breaks a rule. */
export function investmentHealth(org: Organization): CheckStatus {
  const book = marketFor(org);
  return worstStatus(book.portfolios.map((p) => {
    const s = portfolioStats(book, p);
    return { status: worstStatus(complianceChecks(s.stocks, s.cashWeight)) };
  }));
}

/** Plain-language advice from the statistics alone; used when the local model is off. */
export function ruleAdvice(org: Organization, book: MarketBook): string[] {
  const out: string[] = [];
  for (const p of book.portfolios) {
    const stats = portfolioStats(book, p, 'YTD');
    const { checks, orders } = recommendationsFor(org, book, stats);
    const breach = checks.find((c) => c.status === 'breach');
    const top = [...stats.stocks].sort((a, b) => b.contribution - a.contribution)[0];
    const bottom = [...stats.stocks].sort((a, b) => a.contribution - b.contribution)[0];
    const ytd = stats.returns.YTD;
    out.push(
      `${p.name}: ${signedPct(ytd.portfolio)} this year against ${signedPct(ytd.benchmark)} for the market. ${top?.ticker} added the most (${signedPct(top?.contribution ?? 0, 2)}) and ${bottom?.ticker} cost the most (${signedPct(bottom?.contribution ?? 0, 2)}).` +
        (breach ? ` Fix first: ${breach.detail}` : '') +
        (orders.length ? ` ${orders.length} trade${orders.length === 1 ? '' : 's'} proposed, all within the limits once filled.` : ''),
    );
  }
  return out;
}

/** Compact facts for the local model's prompt: small models need short, exact input. */
export function adviceFacts(org: Organization, book: MarketBook): string {
  return book.portfolios
    .map((p) => {
      const stats = portfolioStats(book, p, 'YTD');
      const { checks, orders } = recommendationsFor(org, book, stats);
      const r = stats.returns;
      const contrib = [...stats.stocks].sort((a, b) => b.contribution - a.contribution);
      return [
        `Portfolio ${p.name} (${p.strategy}) value ${money(stats.value)}.`,
        `Returns: ITD ${signedPct(r.ITD.portfolio)} (market ${signedPct(r.ITD.benchmark)}), YTD ${signedPct(r.YTD.portfolio)} (market ${signedPct(r.YTD.benchmark)}), MTD ${signedPct(r.MTD.portfolio)}, last month ${signedPct(r.MoM.portfolio)}.`,
        `Top YTD contributors: ${contrib.slice(0, 3).map((s) => `${s.ticker} ${signedPct(s.contribution, 2)}`).join(', ')}. Worst: ${contrib.slice(-2).map((s) => `${s.ticker} ${signedPct(s.contribution, 2)}`).join(', ')}.`,
        `Compliance: ${checks.map((c) => `${c.rule} = ${c.status} (${pctText(c.value)})`).join('; ')}.`,
        `Proposed trades: ${orders.map((o) => `${o.side} ${o.ticker} to ${pctText(o.weightAfter)}`).join(', ') || 'none'}.`,
      ].join(' ');
    })
    .join('\n');
}
