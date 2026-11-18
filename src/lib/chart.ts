import type { ID } from '@/types';
import { parseDay } from '@/mocks/random';

/**
 * Stable series slot per agent. Colour follows the entity, never its rank, so
 * filtering never repaints the survivors. Unknown agents fold into "Other".
 */
const SLOT_BY_AGENT: Record<ID, number> = {
  'agt-lyra': 1,
  'agt-echo': 2,
  'agt-ledger': 3,
  'agt-quill': 4,
  'agt-sentinel': 5,
  'agt-atlas': 6,
  'agt-vega': 7,
  'agt-pulse': 8,
};

export const seriesVar = (slot: number) => `var(--series-${slot})`;
export const agentSeriesColor = (agentId: ID) => {
  const slot = SLOT_BY_AGENT[agentId];
  return slot ? seriesVar(slot) : 'var(--series-other)';
};

/** Shared Recharts styling: recessive axes and grid, text in ink tokens. */
export const AXIS = {
  stroke: 'rgb(var(--c-border) / 0.12)',
  tick: { fill: 'rgb(var(--c-fg-subtle))', fontSize: 11, fontFamily: 'JetBrains Mono Variable, monospace' },
  tickLine: false,
} as const;

export const GRID = { stroke: 'rgb(var(--c-border) / 0.06)', vertical: false } as const;

export const shortDate = (iso: string) =>
  parseDay(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
