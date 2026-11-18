import type { Severity } from '@/types';
import { Badge } from '@/components/ui/badge';
import { SEVERITY } from './shared';

/** Status always ships with an icon and a label, never colour alone. */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY[severity];
  const Icon = s.icon;
  return (
    <Badge tone={s.tone}>
      <Icon /> {s.label}
    </Badge>
  );
}
