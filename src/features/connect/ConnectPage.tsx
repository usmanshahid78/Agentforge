import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, Loader2, PlugZap, Search } from 'lucide-react';
import type { Connector, ConnectorCategory, ConnectorStatus } from '@/types';
import { api } from '@/api';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressRing, Tabs } from '@/components/ui/controls';
import { Input } from '@/components/ui/input';
import { AsyncView, EmptyState, LoadingState } from '@/components/ui/states';
import { dailyMetrics } from '@/mocks';
import { useBuilder } from '@/store/builder';
import { useDb } from '@/store/db';
import { iconFor } from '@/lib/icons';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { computeReadiness } from '@/lib/readiness';
import { useApi } from '@/lib/useApi';
import { cn, fmt } from '@/lib/utils';
import { ConnectDialog } from './ConnectDialog';

const STATUS: Record<ConnectorStatus, { label: string; tone: BadgeTone }> = {
  'not-connected': { label: 'Not connected', tone: 'neutral' },
  connecting: { label: 'Connecting', tone: 'cyan' },
  connected: { label: 'Connected', tone: 'success' },
  'needs-attention': { label: 'Needs attention', tone: 'warning' },
};

const CATEGORIES: Array<{ value: 'all' | ConnectorCategory; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'sales', label: 'Sales' },
  { value: 'environment', label: 'Environment' },
  { value: 'market', label: 'Market' },
  { value: 'files', label: 'Files' },
  { value: 'messaging', label: 'Messaging' },
  { value: 'web', label: 'Web' },
  { value: 'sensors', label: 'Sensors' },
];

function ConnectorCard({ c, onOpen }: { c: Connector; onOpen: () => void }) {
  const Icon = iconFor(c.icon);
  const st = STATUS[c.status];
  return (
    <Card interactive className={cn('flex h-full flex-col p-5', c.status === 'needs-attention' && 'border-warning/30')} onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'grid size-11 place-items-center rounded-md border',
            c.status === 'connected' ? 'border-cyan/30 bg-cyan/10 text-cyan' : 'border-line/10 bg-line/5 text-fg-muted',
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <Badge tone={st.tone}>
          {c.status === 'connecting' && <Loader2 className="animate-spin" />}
          {c.status === 'connected' && <span className="size-1.5 rounded-full bg-success" />}
          {st.label}
        </Badge>
      </div>
      <h3 className="mt-4 font-display font-semibold">{c.name}</h3>
      <p className="mt-1 flex-1 text-sm text-fg-muted">{c.description}</p>
      {c.issues?.[0] && c.status === 'needs-attention' && <p className="mt-2 text-xs text-warning">{c.issues[0]}</p>}
      <div className="mt-3 flex flex-wrap gap-1">
        {c.sampleFields.slice(0, 3).map((f) => (
          <span key={f} className="rounded border border-line/10 bg-line/5 px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle">
            {f}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line/5 pt-3">
        <span className="font-mono text-[11px] text-fg-subtle">{c.lastSync ? `Synced ${fmt.ago(c.lastSync)}` : 'Never synced'}</span>
        <Button
          size="sm"
          variant={c.status === 'connected' ? 'ghost' : c.status === 'needs-attention' ? 'outline' : 'primary'}
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          aria-label={`${c.status === 'connected' ? 'Manage' : c.status === 'needs-attention' ? 'Reconnect' : 'Connect'} ${c.name}`}
        >
          {c.status === 'connected' ? 'Manage' : c.status === 'needs-attention' ? 'Reconnect' : 'Connect'}
        </Button>
      </div>
    </Card>
  );
}

function ReadinessPanel({ connectors }: { connectors: Connector[] }) {
  const agents = useDb((s) => s.agents);
  const draft = useBuilder((s) => s.interview.draft);
  const options = [
    ...(draft.connectorKeys?.length && !agents.some((a) => a.name === draft.name)
      ? [{ id: 'draft', label: `${draft.name ?? 'Draft'} (in builder)`, keys: draft.connectorKeys }]
      : []),
    { id: 'env', label: 'Environment Analyst', keys: ['pos', 'weather', 'events'] },
    ...agents.map((a) => ({
      id: a.id,
      label: `${a.name}, ${a.role}`,
      keys: a.connectorIds.map((id) => connectors.find((c) => c.id === id)?.key).filter((k): k is string => !!k),
    })),
  ];
  const [target, setTarget] = useState(options[0]?.id ?? 'env');
  const chosen = options.find((o) => o.id === target) ?? options[0];
  const report = computeReadiness(chosen?.keys ?? [], connectors, dailyMetrics);

  return (
    <Card glow className="mb-8 p-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex items-center gap-5 lg:w-80 lg:flex-col lg:items-start">
          <ProgressRing value={report.score} size={112} stroke={10} label="Data readiness score">
            <div>
              <div className="font-display text-3xl font-semibold tabular-nums">{report.score}</div>
              <div className="text-[10px] uppercase tracking-wider text-fg-subtle">of 100</div>
            </div>
          </ProgressRing>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Data readiness</h2>
            <label htmlFor="readiness-target" className="mt-1 block text-sm text-fg-muted">
              Checking data for
            </label>
            <select
              id="readiness-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-line/10 bg-surface/60 px-2 text-sm text-fg"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex-1">
          {report.limitsAccuracy && (
            <div className="mb-4 flex gap-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm" role="note">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <p>
                <strong>This will limit accuracy.</strong> The agent will still work, but it will be honest about what it cannot see. Fix the items below to improve the score.
              </p>
            </div>
          )}
          <motion.ul variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
            {report.findings.map((f) => {
              const Icon = f.severity === 'good' ? CheckCircle2 : f.severity === 'warning' ? AlertTriangle : Info;
              return (
                <motion.li key={f.id} variants={staggerItem} className="flex gap-3 text-sm">
                  <Icon
                    className={cn('mt-0.5 size-4 shrink-0', f.severity === 'good' ? 'text-success' : f.severity === 'warning' ? 'text-warning' : 'text-cyan')}
                    aria-label={f.severity === 'good' ? 'Good' : f.severity === 'warning' ? 'Warning' : 'Note'}
                  />
                  <span>{f.text}</span>
                </motion.li>
              );
            })}
            {report.findings.length === 0 && <li className="text-sm text-fg-muted">This agent does not need any data sources.</li>}
          </motion.ul>
        </div>
      </div>
    </Card>
  );
}

export default function ConnectPage() {
  const state = useApi((o) => api.listConnectors(o));
  const [category, setCategory] = useState<'all' | ConnectorCategory>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string>();
  const connectors = state.data;
  const opened = connectors?.find((c) => c.id === openId);

  const filtered = useMemo(
    () =>
      (connectors ?? []).filter(
        (c) =>
          (category === 'all' || c.category === category) &&
          `${c.name} ${c.description}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [connectors, category, query],
  );
  const connectedCount = connectors?.filter((c) => c.status === 'connected').length ?? 0;

  return (
    <Page>
      <PageHeader
        eyebrow="Data sources"
        title="Connect your business"
        description="Plug in the data your agents need. Every source shows its status, what it covers and how fresh it is."
        actions={
          connectors && (
            <Badge tone="cyan" className="h-8 px-3 text-sm">
              {connectedCount} of {connectors.length} connected
            </Badge>
          )
        }
      />

      <AsyncView state={state} loading={<LoadingState rows={6} />}>
        {(list) => (
          <>
            <ReadinessPanel connectors={list} />

            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end">
              <Tabs label="Filter by category" value={category} onChange={setCategory} tabs={CATEGORIES} className="flex-1" />
              <div className="relative md:w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sources" className="pl-9" aria-label="Search data sources" />
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={PlugZap}
                title="No sources match"
                description="Try another category or search term. Missing something? Use CSV upload for any spreadsheet."
                action={
                  <Button variant="outline" onClick={() => { setCategory('all'); setQuery(''); }}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((c) => (
                  <motion.div key={c.id} variants={staggerItem}>
                    <ConnectorCard c={c} onOpen={() => setOpenId(c.id)} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            <p className="mt-8 text-center text-sm text-fg-muted">
              Done connecting? <Link to="/test" className="font-medium text-cyan hover:underline">Test an agent on your past data</Link>
            </p>
          </>
        )}
      </AsyncView>

      <ConnectDialog connector={opened} onClose={() => setOpenId(undefined)} />
    </Page>
  );
}
