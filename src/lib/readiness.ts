import type { Connector, DailyMetric, ReadinessFinding, ReadinessReport } from '@/types';

/** How much each source matters to forecast quality (relative). */
const WEIGHT: Record<string, number> = { pos: 45, weather: 25, events: 15, footfall: 15 };

/** Plain-language cost of a missing source. */
const MISSING_IMPACT: Record<string, string> = {
  pos: 'Without till data there is nothing to learn from. This source is required.',
  weather: 'Forecasts will ignore weather, so they will be roughly 30% less accurate on weather-driven lines.',
  events: 'Big local events will come as a surprise. Expect misses on match days and festivals.',
  footfall: 'Staffing advice will be based on sales only, which lags real visitor numbers.',
  'inventory-sheet': 'Stock advice cannot check what is already on the shelf.',
  'supplier-portal': 'Lead times will be estimated, so reorders may be late.',
  'competitor-pricing': 'Pricing advice will not see competitor moves.',
};

const POSITIVE: Record<string, (c: Connector, m: DailyMetric[]) => string> = {
  pos: (c) => `Sales data covers ${Math.round((c.coverageDays ?? 0) / 365)} years of till transactions.`,
  weather: (c) => `Weather data covers ${Math.round((c.coverageDays ?? 730) / 365)} years for all store locations.`,
  events: (_c, m) => `Local events feed found ${m.filter((d) => d.event).length} notable events in the last ${m.length} days.`,
};

/**
 * Scores how ready the data is for an agent that needs `requiredKeys`.
 * Deliberately honest: missing sources and known gaps lower the score and set
 * `limitsAccuracy` so the UI can warn the owner.
 */
export function computeReadiness(
  requiredKeys: string[],
  connectors: Connector[],
  metrics: DailyMetric[] = [],
): ReadinessReport {
  const findings: ReadinessFinding[] = [];
  let total = 0;
  let earned = 0;

  for (const key of requiredKeys) {
    const c = connectors.find((x) => x.key === key);
    const w = WEIGHT[key] ?? 20;
    total += w;
    if (!c) continue;
    if (c.status === 'connected') {
      earned += w;
      const positive = POSITIVE[key];
      findings.push({ id: `${key}-ok`, connectorId: c.id, severity: 'good', text: positive ? positive(c, metrics) : `${c.name} is connected and syncing.` });
      for (const [i, issue] of (c.issues ?? []).entries()) {
        earned -= 4;
        findings.push({ id: `${key}-issue-${i}`, connectorId: c.id, severity: 'warning', text: issue });
      }
    } else if (c.status === 'needs-attention') {
      earned += w * 0.4;
      findings.push({
        id: `${key}-attn`,
        connectorId: c.id,
        severity: 'warning',
        text: `${c.name} needs attention: ${c.issues?.[0] ?? 'reconnect to resume syncing.'}`,
      });
    } else {
      findings.push({
        id: `${key}-missing`,
        connectorId: c.id,
        severity: 'warning',
        text: `${c.name} is not connected. ${MISSING_IMPACT[key] ?? 'Advice will be less accurate.'}`,
      });
    }
  }

  const missingDays = metrics.filter((d) => d.salesMissing).length;
  if (missingDays && requiredKeys.includes('pos')) {
    findings.push({
      id: 'pos-gaps',
      connectorId: 'con-pos',
      severity: 'info',
      text: `${missingDays} days of sales are missing in the last ${metrics.length} days. They will be skipped, not guessed.`,
    });
  }

  const score = total ? Math.max(0, Math.min(100, Math.round((earned / total) * 100))) : 0;
  return { score, findings, limitsAccuracy: findings.some((f) => f.severity === 'warning') };
}

export function missingKeys(requiredKeys: string[], connectors: Connector[]): Connector[] {
  return requiredKeys
    .map((k) => connectors.find((c) => c.key === k))
    .filter((c): c is Connector => !!c && c.status !== 'connected');
}
