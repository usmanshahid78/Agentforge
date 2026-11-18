import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Star, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';
import type { RoleTemplate } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDb } from '@/store/db';
import { departmentByKey } from '@/lib/departments';
import { hireTemplate, useHiredFor } from '@/lib/hire';
import { connectorLabel } from '@/features/builder/interview';
import { fmt } from '@/lib/utils';

export function TemplateCard({ template, compact = false, onHired }: { template: RoleTemplate; compact?: boolean; onHired?: () => void }) {
  const navigate = useNavigate();
  const connectors = useDb((s) => s.connectors);
  const hired = useHiredFor(template);
  const dept = departmentByKey(template.department);

  const quickHire = () => {
    const a = hireTemplate(template);
    toast.success(`${a.name} hired as ${a.role}`, { description: `Joined ${dept?.name ?? 'your company'}.` });
    onHired?.();
  };

  return (
    <Card interactive={!compact} className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <Badge tone={dept?.accent === 'warning' ? 'warning' : dept?.accent ?? 'neutral'}>{dept?.name ?? template.department}</Badge>
        {template.featured && (
          <Badge tone="magenta">
            <Zap /> Featured
          </Badge>
        )}
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold">{template.title}</h3>
      <p className="mt-1 flex-1 text-sm text-fg-muted">{template.summary}</p>

      {!compact && (
        <>
          <p className="mb-1.5 mt-4 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">Needs</p>
          <ul className="flex flex-wrap gap-1.5">
            {template.requiredConnectors.map((k) => {
              const ok = connectors.find((c) => c.key === k)?.status === 'connected';
              return (
                <li key={k} className="flex items-center gap-1 rounded-full border border-line/10 px-2 py-0.5 text-xs text-fg-muted">
                  {ok ? <CheckCircle2 className="size-3 text-success" aria-label="connected" /> : <Circle className="size-3 text-fg-subtle" aria-label="not connected" />}
                  {connectorLabel(k)}
                </li>
              );
            })}
          </ul>
          <p className="mb-1.5 mt-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">Typical KPIs</p>
          <p className="text-sm">{template.kpis.join(' · ')}</p>
        </>
      )}

      <div className="mt-4 flex items-center gap-3 text-xs text-fg-muted">
        <span className="flex items-center gap-1">
          <Star className="size-3.5 fill-warning text-warning" aria-hidden /> {template.rating.toFixed(1)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="size-3.5" aria-hidden /> {fmt.compact(template.hires)} hires
        </span>
        <span className="ml-auto font-display text-base font-semibold text-fg">
          {fmt.money(template.pricePerMonth)}
          <span className="text-xs font-normal text-fg-subtle">/mo</span>
        </span>
      </div>

      <div className="mt-4 flex gap-2 border-t border-line/5 pt-4">
        {hired ? (
          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/agents/${hired.id}`)}>
            <CheckCircle2 className="text-success" /> {hired.name} is on the team
          </Button>
        ) : (
          <>
            <Button variant="primary" size="sm" className="flex-1" onClick={() => navigate(`/build?template=${template.id}`)}>
              Hire
            </Button>
            <Button variant="ghost" size="sm" onClick={quickHire} aria-label={`Quick hire ${template.title} with default settings`}>
              Quick hire
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
