import type { ActivityEvent, Agent, ReviewReport, TrustLevel } from '@/types';
import type { BadgeTone } from '@/components/ui/badge';

export const TRUST_ORDER: TrustLevel[] = ['shadow', 'approval', 'limited', 'trusted'];

export const TRUST_META: Record<TrustLevel, { label: string; description: string; tone: BadgeTone }> = {
  shadow: { label: 'Shadow', description: 'Recommends only', tone: 'neutral' },
  approval: { label: 'Approval', description: 'Acts after human approval', tone: 'cyan' },
  limited: { label: 'Limited autonomy', description: 'Acts within limits', tone: 'violet' },
  trusted: { label: 'Trusted', description: 'Broad autonomy', tone: 'success' },
};

export interface TrackRecord {
  daysActive: number;
  decisions: number;
  /** % of proposals the owner approved unchanged. */
  approvalRate: number;
  incidents30d: number;
  reviewScore?: number;
  backtestAccuracy?: number;
}

export interface Requirement {
  label: string;
  met: boolean;
  detail: string;
}

export interface TrustMove {
  direction: 'up' | 'down' | 'same';
  /** False when the move skips a rung; promotions go one step at a time. */
  allowed: boolean;
  /** True when every requirement for the target rung is met. */
  recommended: boolean;
  requirements: Requirement[];
  reason?: string;
}

const rank = (t: TrustLevel) => TRUST_ORDER.indexOf(t);

/** What an agent must have shown before it may hold `level`. */
export function requirementsFor(level: TrustLevel, r: TrackRecord): Requirement[] {
  switch (level) {
    case 'shadow':
      return [];
    case 'approval':
      return [
        {
          label: 'Tested or observed',
          met: (r.backtestAccuracy ?? 0) >= 80 || r.daysActive >= 7,
          detail:
            r.backtestAccuracy !== undefined
              ? `Backtest accuracy ${r.backtestAccuracy}% (needs 80%), or 7 days in Shadow (has ${r.daysActive})`
              : `${r.daysActive} days active (needs 7)`,
        },
      ];
    case 'limited':
      return [
        { label: 'Enough decisions', met: r.decisions >= 20, detail: `${r.decisions} decisions reviewed (needs 20)` },
        { label: 'Owner agrees with it', met: r.approvalRate >= 85, detail: `${r.approvalRate}% approved unchanged (needs 85%)` },
        { label: 'Few incidents', met: r.incidents30d <= 1, detail: `${r.incidents30d} incidents in 30 days (max 1)` },
      ];
    case 'trusted':
      return [
        { label: 'Long track record', met: r.daysActive >= 60, detail: `${r.daysActive} days active (needs 60)` },
        { label: 'Owner agrees with it', met: r.approvalRate >= 92, detail: `${r.approvalRate}% approved unchanged (needs 92%)` },
        { label: 'Strong review', met: (r.reviewScore ?? 0) >= 85, detail: r.reviewScore !== undefined ? `Last review ${r.reviewScore}/100 (needs 85)` : 'No monthly review yet (needs 85)' },
        { label: 'No incidents', met: r.incidents30d === 0, detail: `${r.incidents30d} incidents in 30 days (needs 0)` },
      ];
  }
}

/**
 * Rules for moving on the trust ladder:
 * - Moving down is always allowed (safety first).
 * - Moving up goes one rung at a time.
 * - A promotion is "recommended" only when the track record meets every
 *   requirement; the owner may still confirm an unrecommended promotion.
 */
export function evaluateMove(current: TrustLevel, target: TrustLevel, record: TrackRecord): TrustMove {
  const d = rank(target) - rank(current);
  if (d === 0) return { direction: 'same', allowed: false, recommended: false, requirements: [], reason: 'Already at this level.' };
  if (d < 0) return { direction: 'down', allowed: true, recommended: true, requirements: [] };
  const requirements = requirementsFor(target, record);
  if (d > 1) {
    return {
      direction: 'up',
      allowed: false,
      recommended: false,
      requirements,
      reason: `Promote one step at a time. Move to ${TRUST_META[TRUST_ORDER[rank(current) + 1] ?? target].label} first.`,
    };
  }
  return { direction: 'up', allowed: true, recommended: requirements.every((q) => q.met), requirements };
}

/** Mock track record built from tenure, events and reviews. */
const APPROVAL_RATE: Record<string, number> = {
  'agt-lyra': 91,
  'agt-echo': 96,
  'agt-ledger': 98,
  'agt-quill': 78,
  'agt-sentinel': 88,
};

export function trackRecordFor(agent: Agent, events: ActivityEvent[], reviews: ReviewReport[], backtestAccuracy?: number): TrackRecord {
  const daysActive = Math.max(0, Math.floor((Date.now() - new Date(agent.hiredAt).getTime()) / 86_400_000));
  const monthAgo = Date.now() - 30 * 86_400_000;
  const review = reviews.filter((r) => r.agentId === agent.id).sort((a, b) => b.month.localeCompare(a.month))[0];
  return {
    daysActive,
    decisions: Math.round(daysActive * 1.6),
    approvalRate: daysActive ? (APPROVAL_RATE[agent.id] ?? 90) : 0,
    incidents30d: events.filter((e) => e.agentId === agent.id && e.severity === 'critical' && new Date(e.at).getTime() > monthAgo).length,
    reviewScore: review?.score,
    backtestAccuracy,
  };
}
