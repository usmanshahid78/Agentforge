import { describe, expect, it } from 'vitest';
import { buildDailyMetrics } from '@/mocks/timeseries';
import { runBacktest } from './backtest';

describe('backtest', () => {
  const metrics = buildDailyMetrics(60);
  it('covers the requested period and skips missing days honestly', () => {
    const r = runBacktest(metrics, 60);
    expect(r.points).toHaveLength(60);
    expect(r.skippedDays).toBe(3);
    expect(r.recommendations.filter((x) => x.actualChangePct === null).every((x) => x.correct === null)).toBe(true);
  });
  it('produces a believable accuracy and a manageable number of recommendations', () => {
    const r = runBacktest(metrics, 60);
    expect(r.accuracy).toBeGreaterThan(70);
    expect(r.accuracy).toBeLessThan(100);
    expect(r.recommendations.length).toBeGreaterThan(4);
    expect(r.recommendations.length).toBeLessThan(25);
  });
});
