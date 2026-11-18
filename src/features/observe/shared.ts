import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { Severity } from '@/types';
import type { BadgeTone } from '@/components/ui/badge';

export const SEVERITY: Record<Severity, { icon: typeof Info; label: string; tone: BadgeTone }> = {
  info: { icon: Info, label: 'Info', tone: 'cyan' },
  success: { icon: CheckCircle2, label: 'Done', tone: 'success' },
  warning: { icon: AlertTriangle, label: 'Warning', tone: 'warning' },
  critical: { icon: AlertOctagon, label: 'Critical', tone: 'danger' },
};

/** Deterministic pseudo-metrics per agent for the performance view. */
export function perfFor(agentId: string, daysActive: number) {
  let h = 0;
  for (const ch of agentId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = (n: number) => ((h >> n) & 0xff) / 255;
  const fresh = daysActive < 1;
  return {
    successRate: fresh ? null : Math.round(86 + r(0) * 12),
    responseSec: fresh ? null : Math.round((0.8 + r(8) * 4) * 10) / 10,
    escalationRate: fresh ? null : Math.round((2 + r(16) * 10) * 10) / 10,
    tasks7d: fresh ? 0 : Math.round(40 + r(24) * 260),
    trend: Array.from({ length: 14 }, (_, i) => 85 + r(i % 24) * 8 + i * 0.3),
  };
}
