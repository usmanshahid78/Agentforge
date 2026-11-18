import type { DailyMetric, TraceStep } from '@/types';
import { createRng, parseDay } from '@/mocks/random';

export interface BacktestPoint {
  date: string;
  actual: number | null;
  predicted: number;
  lower: number;
  upper: number;
  /** Range as a [lower, upper] tuple for area bands. */
  band: [number, number];
  missing: boolean;
  condition: DailyMetric['condition'];
  tempC: number;
  event?: string;
}

export type RecKind = 'staffing' | 'stock' | 'promo';

export interface Recommendation {
  id: string;
  date: string;
  kind: RecKind;
  title: string;
  said: string;
  happened: string;
  expectedChangePct: number;
  actualChangePct: number | null;
  correct: boolean | null;
  steps: TraceStep[];
}

export interface BacktestResult {
  points: BacktestPoint[];
  recommendations: Recommendation[];
  accuracy: number; // 100 - MAPE
  hitRate: number; // % of recommendations pointing the right way
  skippedDays: number;
}

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Replays history as if the agent had been running. The "model" is a simple
 * weekday baseline adjusted for temperature, rain and events, with a little
 * seeded noise, which is enough to produce honest-looking misses.
 */
export function runBacktest(metrics: DailyMetric[], days: number): BacktestResult {
  const rng = createRng(17 + days);
  const window = metrics.slice(-days);
  const valid = metrics.filter((m) => !m.salesMissing);
  const weekdayAvg = Array.from({ length: 7 }, (_, d) => {
    const xs = valid.filter((m) => parseDay(m.date).getDay() === d).map((m) => m.sales);
    return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  });

  const points: BacktestPoint[] = window.map((m) => {
    const base = weekdayAvg[parseDay(m.date).getDay()] ?? 0;
    const factor = 1 + (m.tempC - 14) * 0.011 - m.rainMm * 0.008 + (m.event ? 0.2 : 0) + rng.range(-0.05, 0.05);
    const predicted = Math.round(base * factor);
    const spread = Math.round(predicted * 0.08);
    return {
      date: m.date,
      actual: m.salesMissing ? null : m.sales,
      predicted,
      lower: predicted - spread,
      upper: predicted + spread,
      band: [predicted - spread, predicted + spread],
      missing: !!m.salesMissing,
      condition: m.condition,
      tempC: m.tempC,
      event: m.event,
    };
  });

  const recommendations: Recommendation[] = [];
  points.forEach((p, i) => {
    const base = weekdayAvg[parseDay(p.date).getDay()] ?? 1;
    const expected = Math.round(((p.predicted - base) / base) * 100);
    const actualChange = p.actual === null ? null : Math.round(((p.actual - base) / base) * 100);
    const day = DOW[parseDay(p.date).getDay()];
    let rec: Omit<Recommendation, 'id' | 'date' | 'expectedChangePct' | 'actualChangePct' | 'correct' | 'happened' | 'steps'> | undefined;
    if (p.event) {
      rec = { kind: 'staffing', title: `Add 2 staff on ${day}`, said: `"${p.event}" nearby. Expect about ${expected > 0 ? '+' : ''}${expected}% footfall. Add 2 staff from 11:00 to 17:00 and stock up on drinks and snacks.` };
    } else if (p.condition === 'storm' && (metrics.find((m) => m.date === p.date)?.rainMm ?? 0) >= 20) {
      rec = { kind: 'staffing', title: `Run lean on ${day}`, said: `Storm forecast. Expect ${expected}% sales. Run one fewer staff member and delay the fresh bakery order by a day.` };
    } else if (p.tempC >= 21.5) {
      rec = { kind: 'stock', title: `Order 30% more cold drinks for ${day}`, said: `${p.tempC.toFixed(0)}°C forecast. Cold drinks and ice cream sell 40% more above 20°C. Order 30% more.` };
    } else if (p.condition === 'rain' && i % 3 === 0 && (metrics.find((m) => m.date === p.date)?.rainMm ?? 0) >= 6) {
      rec = { kind: 'promo', title: `Umbrella and soup promo on ${day}`, said: `Rain all day. Put umbrellas by the door and run a soup meal deal; expect ${expected}% overall sales.` };
    }
    if (!rec) return;
    const correct = actualChange === null ? null : Math.sign(actualChange) === Math.sign(expected) || Math.abs(actualChange - expected) <= 6;
    recommendations.push({
      ...rec,
      id: `rec-${p.date}`,
      date: p.date,
      expectedChangePct: expected,
      actualChangePct: actualChange,
      correct,
      happened:
        actualChange === null
          ? 'No sales recorded this day (till outage). Skipped, not scored.'
          : `Sales were ${actualChange > 0 ? '+' : ''}${actualChange}% against a normal ${day}${p.event ? `, with ${p.event.toLowerCase()}` : ''}.`,
      steps: [
        { id: 's1', kind: 'data', label: 'Read sales history', detail: `Normal ${day}: £${Math.round(base).toLocaleString()}.`, latencyMs: 380, tool: 'pos.query', input: `weekday=${day} window=60d`, output: 'rows=8' },
        { id: 's2', kind: 'tool', label: 'Checked weather forecast', detail: `${p.tempC.toFixed(1)}°C, ${p.condition}.`, latencyMs: 520, tool: 'weather.forecast', input: `date=${p.date}`, output: `temp=${p.tempC} cond=${p.condition}` },
        { id: 's3', kind: 'tool', label: 'Checked local events', detail: p.event ?? 'No major events within 3 km.', latencyMs: 410, tool: 'events.nearby', input: 'radius_km=3', output: p.event ? '1 event' : '0 events' },
        { id: 's4', kind: 'think', label: 'Estimated the effect', detail: `Weather and events suggest ${expected > 0 ? '+' : ''}${expected}% versus a normal ${day}.`, latencyMs: 1900, tokens: 1840 },
        { id: 's5', kind: 'decision', label: rec.title, detail: 'Shadow mode: recommendation only, nothing changed.', latencyMs: 600, tokens: 420 },
      ],
    });
  });

  const scored = points.filter((p) => p.actual !== null);
  const mape = scored.reduce((s, p) => s + Math.abs((p.actual ?? 0) - p.predicted) / (p.actual || 1), 0) / Math.max(1, scored.length);
  const judged = recommendations.filter((r) => r.correct !== null);
  return {
    points,
    recommendations,
    accuracy: Math.round((1 - mape) * 1000) / 10,
    hitRate: judged.length ? Math.round((judged.filter((r) => r.correct).length / judged.length) * 100) : 0,
    skippedDays: points.length - scored.length,
  };
}
