import { describe, expect, it } from 'vitest';
import { evaluateMove, requirementsFor, type TrackRecord } from './trust';

const strong: TrackRecord = { daysActive: 120, decisions: 200, approvalRate: 95, incidents30d: 0, reviewScore: 90, backtestAccuracy: 92 };
const fresh: TrackRecord = { daysActive: 0, decisions: 0, approvalRate: 0, incidents30d: 0 };

describe('trust ladder rules', () => {
  it('always allows moving down', () => {
    const m = evaluateMove('trusted', 'shadow', fresh);
    expect(m.direction).toBe('down');
    expect(m.allowed).toBe(true);
  });

  it('blocks skipping rungs on the way up', () => {
    const m = evaluateMove('shadow', 'limited', strong);
    expect(m.allowed).toBe(false);
    expect(m.reason).toMatch(/one step at a time/i);
  });

  it('treats the same level as a no-op', () => {
    expect(evaluateMove('approval', 'approval', strong).direction).toBe('same');
    expect(evaluateMove('approval', 'approval', strong).allowed).toBe(false);
  });

  it('recommends a one-step promotion only when requirements are met', () => {
    expect(evaluateMove('approval', 'limited', strong).recommended).toBe(true);
    const weak = evaluateMove('approval', 'limited', { ...strong, approvalRate: 70 });
    expect(weak.allowed).toBe(true);
    expect(weak.recommended).toBe(false);
    expect(weak.requirements.find((r) => !r.met)?.label).toBe('Owner agrees with it');
  });

  it('lets a fresh agent reach Approval through a good backtest', () => {
    expect(evaluateMove('shadow', 'approval', { ...fresh, backtestAccuracy: 88 }).recommended).toBe(true);
    expect(evaluateMove('shadow', 'approval', fresh).recommended).toBe(false);
  });

  it('requires zero incidents and a strong review for Trusted', () => {
    const reqs = requirementsFor('trusted', { ...strong, incidents30d: 1 });
    expect(reqs.find((r) => r.label === 'No incidents')?.met).toBe(false);
    expect(requirementsFor('trusted', { ...strong, reviewScore: undefined }).find((r) => r.label === 'Strong review')?.met).toBe(false);
  });
});
