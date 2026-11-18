import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Plug, ShieldCheck } from 'lucide-react';
import { api } from '@/api';
import { Avatar } from '@/components/avatar/Avatar';
import { TraceTimeline } from '@/components/trace/TraceTimeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/controls';
import { Sparkline } from '@/components/ui/sparkline';
import { AsyncView, EmptyState, LoadingState } from '@/components/ui/states';
import { useDb } from '@/store/db';
import { useApi } from '@/lib/useApi';
import { cn, fmt } from '@/lib/utils';
import { perfFor } from './shared';
import { SeverityBadge } from './SeverityBadge';

export function PerformancePanel() {
  const agents = useDb((s) => s.agents);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {agents.map((a) => {
        const days = (Date.now() - new Date(a.hiredAt).getTime()) / 86_400_000;
        const p = perfFor(a.id, days);
        return (
          <Card key={a.id} className="p-5">
            <div className="flex items-center gap-3">
              <Avatar agent={a} size="md" showStatus />
              <div className="min-w-0 flex-1">
                <Link to={`/agents/${a.id}`} className="font-medium hover:underline">
                  {a.name}
                </Link>
                <div className="truncate text-xs text-fg-muted">{a.role}</div>
              </div>
              <span className="font-mono text-xs text-fg-subtle">{p.tasks7d} tasks / 7d</span>
            </div>
            {p.successRate === null ? (
              <p className="mt-4 text-sm text-fg-muted">Just hired. Numbers appear after the first day of work.</p>
            ) : (
              <>
                <dl className="mt-4 grid grid-cols-3 gap-2">
                  <div>
                    <dt className="text-[11px] text-fg-subtle">Success</dt>
                    <dd className="font-display text-lg font-semibold">{p.successRate}%</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-fg-subtle">Response</dt>
                    <dd className="font-display text-lg font-semibold">{p.responseSec}s</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-fg-subtle">Escalated</dt>
                    <dd className="font-display text-lg font-semibold">{p.escalationRate}%</dd>
                  </div>
                </dl>
                <Sparkline data={p.trend} className="mt-3" color="rgb(var(--c-cyan))" />
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export function TracesPanel({ openId }: { openId?: string }) {
  const state = useApi((o) => api.listTraces(o));
  const agents = useDb((s) => s.agents);
  const [open, setOpen] = useState<string | undefined>(openId);
  return (
    <AsyncView state={state} loading={<LoadingState rows={2} />} isEmpty={(t) => t.length === 0} empty={<EmptyState title="No traces yet" />}>
      {(traces) => (
        <ul className="space-y-3">
          {traces.map((t) => {
            const agent = agents.find((a) => a.id === t.agentId);
            const isOpen = open === t.id;
            return (
              <li key={t.id}>
                <Card className={cn('overflow-hidden', isOpen && 'border-violet/40')}>
                  <button type="button" onClick={() => setOpen(isOpen ? undefined : t.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 p-4 text-left">
                    {agent && <Avatar agent={agent} size="sm" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{t.summary}</div>
                      <div className="font-mono text-[11px] text-fg-subtle">
                        {agent?.name} · {fmt.ago(t.startedAt)} · {t.steps.length} steps · {(t.totalLatencyMs / 1000).toFixed(1)}s · {t.totalTokens.toLocaleString()} tok · ${t.costUsd.toFixed(3)}
                      </div>
                    </div>
                    <ChevronDown className={cn('size-4 text-fg-subtle transition-transform', isOpen && 'rotate-180')} aria-hidden />
                  </button>
                  {isOpen && (
                    <div className="border-t border-line/10 p-4">
                      <TraceTimeline steps={t.steps} />
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </AsyncView>
  );
}

type AlertFilter = 'all' | 'critical' | 'warning';

export function AlertsPanel() {
  const events = useDb((s) => s.events);
  const connectors = useDb((s) => s.connectors);
  const agents = useDb((s) => s.agents);
  const [filter, setFilter] = useState<AlertFilter>('all');
  const [acked, setAcked] = useState<string[]>([]);
  const alerts = events.filter((e) => (e.severity === 'critical' || e.severity === 'warning') && (filter === 'all' || e.severity === filter) && !acked.includes(e.id));
  const broken = connectors.filter((c) => c.status === 'needs-attention');
  // Deduplicate repeated synthetic events for a calmer list.
  const unique = alerts.filter((e, i, xs) => xs.findIndex((x) => x.title === e.title && x.agentId === e.agentId) === i);

  return (
    <div className="space-y-4">
      {broken.map((c) => (
        <Card key={c.id} className="flex flex-wrap items-center gap-3 border-warning/30 p-4">
          <Plug className="size-5 text-warning" aria-hidden />
          <div className="flex-1">
            <div className="text-sm font-medium">{c.name} needs attention</div>
            <div className="text-sm text-fg-muted">{c.issues?.[0]}</div>
          </div>
          <SeverityBadge severity="warning" />
          <Button variant="outline" size="sm" asChild>
            <Link to="/connect">Fix</Link>
          </Button>
        </Card>
      ))}
      <Segmented<AlertFilter>
        label="Alert severity"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All alerts' },
          { value: 'critical', label: 'Critical' },
          { value: 'warning', label: 'Warnings' },
        ]}
      />
      {unique.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No open alerts" description="Everything is running smoothly." />
      ) : (
        <ul className="space-y-2">
          {unique.map((e) => {
            const agent = agents.find((a) => a.id === e.agentId);
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-md border border-line/10 p-3">
                <SeverityBadge severity={e.severity} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {agent?.name}: {e.title}
                  </div>
                  <div className="text-sm text-fg-muted">{e.detail}</div>
                </div>
                <time className="font-mono text-[11px] text-fg-subtle">{fmt.ago(e.at)}</time>
                <Button variant="ghost" size="sm" onClick={() => setAcked((a) => [...a, ...alerts.filter((x) => x.title === e.title && x.agentId === e.agentId).map((x) => x.id)])}>
                  Acknowledge
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {acked.length > 0 && <Badge>{acked.length} acknowledged this session</Badge>}
    </div>
  );
}
