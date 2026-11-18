import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bot, Building2, OctagonAlert, Plus, Search, Table2, Users } from 'lucide-react';
import type { Organization } from '@/types';
import { Page, PageHeader } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChartTooltip } from '@/components/ui/chart-tooltip';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/states';
import { AXIS, GRID, seriesVar } from '@/lib/chart';
import { KIND_LABEL, agentsOf, headOf } from '@/lib/orgs';
import { useOrgs } from '@/store/orgs';
import { cn } from '@/lib/utils';
import { orgHealth, shortDay } from './helpers';
import { ChartCard, OrgStatusBadge, StatTile } from './shared';

type Row = { name: string; count: number };

const countBy = <T,>(items: T[], key: (t: T) => string | string[]): Row[] => {
  const map = new Map<string, number>();
  for (const it of items) for (const k of [key(it)].flat()) map.set(k, (map.get(k) ?? 0) + 1);
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

/** One-series horizontal bar chart of counts, with a table view. */
function CountChart({ title, description, rows, unit, limit = 8, labelWidth = 150 }: { title: string; description: string; rows: Row[]; unit: string; limit?: number; labelWidth?: number }) {
  const [table, setTable] = useState(false);
  const shown = rows.length > limit ? [...rows.slice(0, limit - 1), { name: 'Other', count: rows.slice(limit - 1).reduce((s, r) => s + r.count, 0) }] : rows;
  return (
    <ChartCard
      title={title}
      description={description}
      actions={
        <Button variant="ghost" size="sm" onClick={() => setTable((t) => !t)} aria-pressed={table}>
          <Table2 /> {table ? 'Chart' : 'Table'}
        </Button>
      }
    >
      {table ? (
        <table className="w-full text-sm">
          <caption className="sr-only">{title}</caption>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-line/5">
                <td className="py-1.5">{r.name}</td>
                <td className="py-1.5 text-right font-mono">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ height: Math.max(140, shown.length * (labelWidth > 150 ? 44 : 34)) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shown} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} horizontal={false} vertical />
              <XAxis type="number" allowDecimals={false} {...AXIS} />
              <YAxis type="category" dataKey="name" {...AXIS} width={labelWidth} axisLine={false} interval={0} />
              <Tooltip
                cursor={{ fill: 'rgb(var(--c-border) / 0.05)' }}
                content={({ active, payload, label }) => (
                  <ChartTooltip active={active} label={label as string} payload={payload?.map((p) => ({ ...p, name: unit, value: p.value as number, dataKey: 'count' }))} />
                )}
              />
              <Bar dataKey="count" fill={seriesVar(1)} radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function CreatedChart({ orgs }: { orgs: Organization[] }) {
  // The last six months, oldest first, including months with none.
  const data = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { month: d.toLocaleDateString('en-GB', { month: 'short' }), count: orgs.filter((o) => o.createdAt.slice(0, 7) === key).length };
    });
  }, [orgs]);
  return (
    <ChartCard title="Organizations created" description="Per month, last six months.">
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="month" {...AXIS} />
            <YAxis allowDecimals={false} {...AXIS} width={28} axisLine={false} />
            <Tooltip
              cursor={{ fill: 'rgb(var(--c-border) / 0.05)' }}
              content={({ active, payload, label }) => (
                <ChartTooltip active={active} label={label as string} payload={payload?.map((p) => ({ ...p, name: 'Organizations', value: p.value as number, dataKey: 'count' }))} />
              )}
            />
            <Bar dataKey="count" fill={seriesVar(1)} radius={[4, 4, 0, 0]} barSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export default function BackOfficePage() {
  const orgs = useOrgs((s) => s.orgs);
  const [query, setQuery] = useState('');

  const agents = orgs.flatMap(agentsOf);
  const creators = countBy(orgs, (o) => o.createdBy);
  const attention = orgs.filter((o) => orgHealth(o) === 'breach');
  const q = query.trim().toLowerCase();
  const filtered = q
    ? orgs.filter((o) => [o.name, o.industry, o.createdBy, KIND_LABEL[o.kind], ...o.members.map((m) => `${m.name} ${m.role}`)].join(' ').toLowerCase().includes(q))
    : orgs;

  return (
    <Page wide>
      <PageHeader
        eyebrow="Back office"
        title="What people are building"
        description="Every organization created from a description: who made it, who runs it, which agents work there and what they asked for."
        actions={
          <Button variant="primary" asChild>
            <Link to="/orgs/new">
              <Plus /> New organization
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Building2} label="Organizations" value={orgs.length} sub={`${countBy(orgs, (o) => o.kind).length} industries`} />
        <StatTile icon={Bot} label="AI agents at work" value={agents.length} sub={`${countBy(agents, (a) => a.role).length} different roles`} />
        <StatTile icon={Users} label="Creators" value={creators.length} sub={creators[0] ? `Most active: ${creators[0].name} (${creators[0].count})` : undefined} />
        <StatTile
          icon={OctagonAlert}
          label="Need attention"
          value={attention.length}
          tone={attention.length ? 'text-danger' : undefined}
          sub={attention.length ? attention.map((o) => o.name).join(', ') : 'No compliance breaches'}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <CountChart title="By industry" description="What kind of organizations people make." rows={countBy(orgs, (o) => KIND_LABEL[o.kind])} unit="Organizations" />
        <CountChart title="Agents by role" description="Which jobs the agents do." rows={countBy(agents, (a) => a.role)} unit="Agents" limit={12} />
        <CountChart title="Most requested" description="What creators asked for in their descriptions." rows={countBy(orgs, (o) => o.requirements)} unit="Organizations" limit={7} labelWidth={240} />
        <CreatedChart orgs={orgs} />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-5 pb-3">
          <h2 className="mr-auto font-display text-lg font-semibold">Organizations</h2>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, creator, role…" className="pl-9" aria-label="Search organizations" />
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState className="m-5 mt-0" title={orgs.length ? 'No organization matches' : 'No organizations yet'} description={orgs.length ? 'Try another search.' : 'Describe one and it is set up for you.'} />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="text-left text-xs text-fg-subtle">
                <tr className="border-y border-line/5">
                  <th className="px-5 py-2 font-medium">Organization</th>
                  <th className="px-3 py-2 font-medium">Headed by</th>
                  <th className="px-3 py-2 font-medium">Agents</th>
                  <th className="px-3 py-2 font-medium">Created by</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const head = headOf(o);
                  return (
                    <tr key={o.id} className="border-t border-line/5 transition-colors hover:bg-line/5">
                      <td className="px-5 py-3">
                        <Link to={`/orgs/${o.id}`} className="font-semibold hover:text-violet">
                          {o.name}
                        </Link>
                        <div className="text-xs text-fg-muted">
                          {KIND_LABEL[o.kind]} · {o.industry}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {head?.name} <span className="text-fg-muted">({head?.role})</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono">{agentsOf(o).length}</span>
                        <span className="ml-2 text-xs text-fg-muted">{agentsOf(o).map((a) => a.role).join(', ')}</span>
                      </td>
                      <td className="px-3 py-3">{o.createdBy}</td>
                      <td className={cn('px-3 py-3 font-mono text-xs')}>{shortDay(o.createdAt)}</td>
                      <td className="px-5 py-3">
                        <OrgStatusBadge org={o} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}
