import type { Organization } from '@/types';
import { createRng, isoDay, DAY_MS } from '@/mocks/random';
import { agentsOf } from './orgs';

/**
 * Simulated activity for organizations without a market dashboard: tasks each
 * agent finished, weekly throughput and how often a person had to step in.
 * Seeded per organization, so it is stable across reloads.
 */
export function operationsStats(org: Organization) {
  const rng = createRng(org.seed);
  const agents = agentsOf(org).map((a) => {
    const done = rng.int(40, 260);
    return { id: a.id, name: a.name, role: a.role, done, escalated: Math.round(done * rng.range(0.02, 0.12)), hoursSaved: Math.round(done * rng.range(0.1, 0.4)) };
  });
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const date = isoDay(new Date(Date.now() - (11 - i) * 7 * DAY_MS));
    const row: Record<string, number | string> = { date };
    for (const a of agents) row[a.id] = Math.max(0, Math.round((a.done / 12) * rng.range(0.6, 1.4) * (0.7 + (i / 11) * 0.5)));
    return row;
  });
  const done = agents.reduce((s, a) => s + a.done, 0);
  const escalated = agents.reduce((s, a) => s + a.escalated, 0);
  return { agents, weeks, done, escalated, hoursSaved: agents.reduce((s, a) => s + a.hoursSaved, 0), autonomy: done ? 1 - escalated / done : 1 };
}
