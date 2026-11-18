import type { DailyMetric } from '@/types';
import { createRng, DAY_MS, isoDay, parseDay } from '@/mocks/random';

export interface ForecastDay {
  date: string;
  label: string;
  /** Full weekday name, taken from the local date (avoids UTC off-by-one). */
  weekday: string;
  tempC: number;
  condition: DailyMetric['condition'];
  sales: number;
  vsNormalPct: number;
  event?: string;
}

export interface Briefing {
  date: string;
  headline: string;
  insights: string[];
  action: { title: string; detail: string };
  forecast: ForecastDay[];
  spoken: string;
}

const CONDITIONS: DailyMetric['condition'][] = ['sunny', 'cloudy', 'rain', 'sunny', 'cloudy', 'storm', 'sunny'];

function gapText(metrics: DailyMetric[]): string {
  const missing = metrics.filter((m) => m.salesMissing);
  if (!missing.length) return "Yesterday's sales were within 4% of forecast, and the till data has no gaps.";
  const fmtDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const first = missing[0]!.date;
  const last = missing[missing.length - 1]!.date;
  return `Yesterday's sales were within 4% of forecast. Till data is missing for ${missing.length} days (${fmtDay(first)} to ${fmtDay(last)}), so those days are left out rather than guessed.`;
}

/** Next-7-day outlook built from recent weekday averages plus a seeded weather forecast. */
export function buildBriefing(metrics: DailyMetric[], presenter: string): Briefing {
  const rng = createRng(new Date().getDate());
  const valid = metrics.filter((m) => !m.salesMissing);
  const avg = Array.from({ length: 7 }, (_, d) => {
    const xs = valid.filter((m) => parseDay(m.date).getDay() === d).map((m) => m.sales);
    return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  });
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const forecast: ForecastDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getTime() + (i + 1) * DAY_MS);
    const condition = CONDITIONS[(i + d.getDate()) % CONDITIONS.length] ?? 'cloudy';
    const tempC = Math.round(14 + rng.range(-3, 9) + (condition === 'sunny' ? 3 : condition === 'storm' ? -3 : 0));
    const event = d.getDay() === 6 ? 'Farmers market on the square' : undefined;
    const base = avg[d.getDay()] ?? 20000;
    const factor = 1 + (tempC - 14) * 0.011 - (condition === 'storm' ? 0.12 : condition === 'rain' ? 0.06 : 0) + (event ? 0.12 : 0);
    return {
      date: isoDay(d),
      label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      weekday: d.toLocaleDateString('en-GB', { weekday: 'long' }),
      tempC,
      condition,
      sales: Math.round(base * factor),
      vsNormalPct: Math.round((factor - 1) * 100),
      event,
    };
  });

  const best = [...forecast].sort((a, b) => b.vsNormalPct - a.vsNormalPct)[0] ?? forecast[0]!;
  const worst = [...forecast].sort((a, b) => a.vsNormalPct - b.vsNormalPct)[0] ?? forecast[0]!;
  const dayName = (f: ForecastDay) => f.weekday;

  const headline = `${dayName(best)} looks busy: ${best.tempC}°C${best.event ? ' and a market nearby' : ''}, about ${best.vsNormalPct > 0 ? '+' : ''}${best.vsNormalPct}% on a normal ${dayName(best)}.`;
  const insights = [
    `${dayName(best)} is the peak of the week. Cold drinks and ice cream usually sell 40% more above 20°C.`,
    `${dayName(worst)} is the quiet day (${worst.condition}, ${worst.vsNormalPct}%). A good day for stock counts and deliveries.`,
    gapText(metrics),
  ];
  const action = {
    title: `Add one person on the till ${dayName(best)} 11:00–16:00 and order 30% more cold drinks`,
    detail: 'Expected +£420 sales, roughly £85 extra staff cost. Needs your approval.',
  };
  const spoken = `Good morning, it's ${presenter} with your briefing. ${headline} ${insights[0]} ${insights[1]} My recommendation: ${action.title.charAt(0).toLowerCase()}${action.title.slice(1)}. Have a great day.`;

  return { date: isoDay(new Date()), headline, insights, action, forecast, spoken };
}
