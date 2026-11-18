import type { CostPoint, DailyMetric } from '@/types';
import { createRng, DAY_MS, isoDay } from './random';
import { seedAgents } from './agents';

const EVENTS = [
  'City derby at the stadium',
  'Farmers market on the square',
  'School half-term begins',
  'Open-air concert in the park',
  'Food festival weekend',
  'Bank holiday',
];

/**
 * 60 days of daily sales, footfall and weather for Nova Mart.
 * Sales respond to weather and events with noise, so the backtest and
 * readiness checks have a real signal to find. Three days have missing
 * sales data on purpose (shown honestly in the readiness report).
 */
export function buildDailyMetrics(days = 60): DailyMetric[] {
  const rng = createRng(2026);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: DailyMetric[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - i * DAY_MS);
    const dow = date.getDay();
    const weekend = dow === 0 || dow === 6;

    const tempC = Math.round((14 + 6 * Math.sin(i / 9) + rng.range(-3, 3)) * 10) / 10;
    const rainRoll = rng.next();
    const condition: DailyMetric['condition'] =
      rainRoll > 0.92 ? 'storm' : rainRoll > 0.7 ? 'rain' : rainRoll > 0.45 ? 'cloudy' : 'sunny';
    const rainMm = condition === 'storm' ? rng.range(12, 30) : condition === 'rain' ? rng.range(2, 10) : 0;
    const event = rng.next() > 0.88 ? rng.pick(EVENTS) : undefined;

    let footfall = 1800 + (weekend ? 650 : 0) + (tempC - 14) * 22 - rainMm * 18 + (event ? 520 : 0);
    footfall = Math.max(600, Math.round(footfall + rng.range(-120, 120)));
    const sales = Math.round(footfall * rng.range(11.2, 12.8));

    // Deliberate gaps (till outage) for the readiness report.
    const salesMissing = i === 41 || i === 42 || i === 43;

    out.push({
      date: isoDay(date),
      sales: salesMissing ? 0 : sales,
      footfall,
      tempC,
      rainMm: Math.round(rainMm * 10) / 10,
      condition,
      event,
      salesMissing: salesMissing || undefined,
    });
  }
  return out;
}

export const dailyMetrics = buildDailyMetrics();

/** 30 days of running cost per seeded agent. */
export function buildCostSeries(days = 30): CostPoint[] {
  const rng = createRng(99);
  const today = new Date();
  return Array.from({ length: days }, (_, idx) => {
    const i = days - 1 - idx;
    const date = isoDay(new Date(today.getTime() - i * DAY_MS));
    const byAgent: Record<string, number> = {};
    for (const a of seedAgents) {
      byAgent[a.id] = Math.round(a.costPerDay * rng.range(0.75, 1.25) * 100) / 100;
    }
    return { date, byAgent };
  });
}

export const costSeries = buildCostSeries();

export const MONTHLY_BUDGET = 900;
