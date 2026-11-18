import { AlertTriangle, CheckCircle2, OctagonAlert, type LucideIcon } from 'lucide-react';
import type { Organization } from '@/types';
import { investmentHealth, type CheckStatus } from '@/lib/investing';
import { seriesVar } from '@/lib/chart';
import { agentsOf } from '@/lib/orgs';

/** Live, or needs attention when an investment organization breaks a compliance rule. */
export function orgHealth(org: Organization): CheckStatus {
  return org.kind === 'investment' ? investmentHealth(org) : 'pass';
}

export const CHECK_META: Record<CheckStatus, { label: string; tone: 'success' | 'warning' | 'danger'; icon: LucideIcon }> = {
  pass: { label: 'Within limit', tone: 'success', icon: CheckCircle2 },
  warning: { label: 'Close to limit', tone: 'warning', icon: AlertTriangle },
  breach: { label: 'Breach', tone: 'danger', icon: OctagonAlert },
};

/** Stable colour per agent: its position in the organization, never its rank. */
export const memberColor = (org: Organization, id: string) => {
  const i = agentsOf(org).findIndex((a) => a.id === id);
  return i >= 0 && i < 8 ? seriesVar(i + 1) : 'var(--series-other)';
};

export const shortDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
