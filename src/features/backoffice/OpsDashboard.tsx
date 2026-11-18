import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCheck, Clock, Hand, ListChecks } from 'lucide-react';
import type { Organization } from '@/types';
import { ChartTooltip } from '@/components/ui/chart-tooltip';
import { AXIS, GRID, shortDate } from '@/lib/chart';
import { operationsStats } from '@/lib/orgOps';
import { agentsOf } from '@/lib/orgs';
import { memberColor } from './helpers';
import { ChartCard, MemberDot, StatTile } from './shared';

/** Dashboard for organizations without a market: what each agent got done. */
export function OpsDashboard({ org }: { org: Organization }) {
  const stats = useMemo(() => operationsStats(org), [org]);
  const agents = agentsOf(org);
  return (
    <div className="space-y-6">
      <p className="text-xs text-fg-subtle">Simulated activity for a demo, generated from the organization’s team.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={ListChecks} label="Tasks done (12 weeks)" value={stats.done.toLocaleString('en-GB')} />
        <StatTile icon={Clock} label="Hours saved" value={stats.hoursSaved.toLocaleString('en-GB')} />
        <StatTile icon={CheckCheck} label="Handled without help" value={`${Math.round(stats.autonomy * 100)}%`} />
        <StatTile icon={Hand} label="Escalated to a person" value={stats.escalated} />
      </div>

      <ChartCard title="Tasks done per week" description="Stacked by agent.">
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted" aria-label="Legend">
          {agents.map((a) => (
            <li key={a.id} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: memberColor(org, a.id) }} /> {a.name} ({a.role})
            </li>
          ))}
        </ul>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.weeks} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} />
              <YAxis {...AXIS} width={36} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'rgb(var(--c-border) / 0.05)' }}
                content={({ active, payload, label }) => (
                  <ChartTooltip
                    active={active}
                    label={label as string}
                    labelFormatter={(l) => `Week of ${shortDate(String(l))}`}
                    payload={payload?.map((p) => ({ ...p, name: agents.find((a) => a.id === p.dataKey)?.name, value: p.value as number, dataKey: String(p.dataKey) }))}
                  />
                )}
              />
              {agents.map((a) => (
                <Bar key={a.id} dataKey={a.id} stackId="t" fill={memberColor(org, a.id)} stroke="rgb(var(--c-bg))" strokeWidth={1} maxBarSize={28} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="By agent">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-fg-subtle">
            <tr>
              <th className="py-1.5 font-medium">Agent</th>
              <th className="py-1.5 text-right font-medium">Tasks</th>
              <th className="py-1.5 text-right font-medium">Escalated</th>
              <th className="py-1.5 text-right font-medium">Hours saved</th>
            </tr>
          </thead>
          <tbody>
            {stats.agents.map((s) => {
              const m = agents.find((a) => a.id === s.id)!;
              return (
                <tr key={s.id} className="border-t border-line/5">
                  <td className="py-2">
                    <span className="flex items-center gap-2">
                      <MemberDot org={org} member={m} size="sm" />
                      <span>
                        <span className="font-medium">{m.name}</span> <span className="text-fg-muted">· {m.role}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono">{s.done}</td>
                  <td className="py-2 text-right font-mono">{s.escalated}</td>
                  <td className="py-2 text-right font-mono">{s.hoursSaved}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ChartCard>
    </div>
  );
}
