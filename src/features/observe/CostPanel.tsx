import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Table2 } from 'lucide-react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChartTooltip } from '@/components/ui/chart-tooltip';
import { AsyncView, LoadingState } from '@/components/ui/states';
import { MONTHLY_BUDGET } from '@/mocks';
import { useDb } from '@/store/db';
import { agentSeriesColor, AXIS, GRID, seriesVar, shortDate } from '@/lib/chart';
import { useApi } from '@/lib/useApi';
import { cn, fmt } from '@/lib/utils';

export function CostPanel() {
  const state = useApi((o) => api.getCostSeries(o));
  const agents = useDb((s) => s.agents);
  const [table, setTable] = useState(false);

  const data = useMemo(() => {
    if (!state.data) return [];
    const today = new Date().toISOString().slice(0, 10);
    return state.data.map((p) => {
      const row: Record<string, number | string> = { date: p.date };
      for (const a of agents) {
        // Agents hired after this day cost nothing for it; new hires show from today.
        const seeded = p.byAgent[a.id];
        row[a.id] = seeded ?? (p.date >= a.hiredAt.slice(0, 10) || p.date === today ? a.costPerDay : 0);
      }
      return row;
    });
  }, [state.data, agents]);

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const mtd = data.slice(-dayOfMonth).reduce((s, r) => s + agents.reduce((x, a) => x + Number(r[a.id] ?? 0), 0), 0);
  const forecast = (mtd / Math.max(1, dayOfMonth)) * daysInMonth;
  const pct = (mtd / MONTHLY_BUDGET) * 100;
  const fpct = (forecast / MONTHLY_BUDGET) * 100;

  const salaryValue = agents.map((a) => ({ name: a.name, cost: Math.round(a.costPerDay * 30), value: Math.round(a.valuePerDay * 30) }));

  return (
    <AsyncView state={state} loading={<LoadingState rows={3} />}>
      {() => (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-5">
              <p className="text-sm text-fg-muted">Spent this month</p>
              <p className="mt-2 font-display text-3xl font-semibold">{fmt.money(mtd)}</p>
              <p className="text-xs text-fg-subtle">of {fmt.money(MONTHLY_BUDGET)} budget</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-fg-muted">Month-end forecast</p>
              <p className={cn('mt-2 font-display text-3xl font-semibold', fpct > 100 && 'text-warning')}>{fmt.money(forecast)}</p>
              <p className="text-xs text-fg-subtle">{fpct > 100 ? `${Math.round(fpct - 100)}% over budget at this pace` : `${Math.round(100 - fpct)}% under budget at this pace`}</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-fg-muted">Value produced (30 days)</p>
              <p className="mt-2 font-display text-3xl font-semibold">{fmt.money(agents.reduce((s, a) => s + a.valuePerDay * 30, 0))}</p>
              <p className="text-xs text-fg-subtle">Estimated from KPIs and approvals</p>
            </Card>
          </div>

          <Card className="p-5">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium">Monthly budget</span>
              <span className="font-mono text-xs text-fg-muted">
                {Math.round(pct)}% used · day {dayOfMonth} of {daysInMonth}
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-line/10" role="meter" aria-label="Budget used" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
              <div className="absolute inset-y-0 left-0 rounded-full bg-violet/30" style={{ width: `${Math.min(100, fpct)}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-grad-primary" style={{ width: `${Math.min(100, pct)}%` }} />
              <div className="absolute inset-y-0 w-0.5 bg-fg/60" style={{ left: `${(dayOfMonth / daysInMonth) * 100}%` }} aria-hidden />
            </div>
            <div className="mt-2 flex gap-4 text-xs text-fg-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-3 rounded-sm bg-grad-primary" /> Spent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-3 rounded-sm bg-violet/30" /> Forecast
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-0.5 bg-fg/60" /> Today
              </span>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h3 className="mr-auto font-display font-semibold">Daily cost by agent</h3>
              <Button variant="ghost" size="sm" onClick={() => setTable((t) => !t)} aria-pressed={table}>
                <Table2 /> {table ? 'Chart' : 'Table'}
              </Button>
            </div>
            <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted" aria-label="Legend">
              {agents.map((a) => (
                <li key={a.id} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm" style={{ background: agentSeriesColor(a.id) }} /> {a.name}
                </li>
              ))}
            </ul>
            {table ? (
              <div className="scrollbar-thin max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <caption className="sr-only">Daily cost by agent</caption>
                  <thead className="sticky top-0 bg-bg-elevated text-left text-fg-subtle">
                    <tr>
                      <th className="py-1.5 font-medium">Date</th>
                      {agents.map((a) => (
                        <th key={a.id} className="py-1.5 text-right font-medium">
                          {a.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {data.map((r) => (
                      <tr key={String(r.date)} className="border-t border-line/5">
                        <td className="py-1">{shortDate(String(r.date))}</td>
                        {agents.map((a) => (
                          <td key={a.id} className="py-1 text-right">
                            {fmt.moneyPrecise(Number(r[a.id] ?? 0))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={28} />
                    <YAxis {...AXIS} width={44} axisLine={false} tickFormatter={(v: number) => `£${v}`} />
                    <Tooltip
                      cursor={{ stroke: 'rgb(var(--c-fg-subtle))', strokeDasharray: '3 3' }}
                      content={({ active, payload, label }) => (
                        <ChartTooltip
                          active={active}
                          label={label as string}
                          labelFormatter={(l) => shortDate(String(l))}
                          payload={payload?.map((p) => ({ ...p, name: agents.find((a) => a.id === p.dataKey)?.name, value: p.value as number, dataKey: String(p.dataKey) }))}
                          valueFormatter={(v) => fmt.moneyPrecise(v)}
                        />
                      )}
                    />
                    {agents.map((a) => (
                      <Area key={a.id} type="monotone" dataKey={a.id} stackId="cost" stroke="rgb(var(--c-bg))" strokeWidth={1} fill={agentSeriesColor(a.id)} fillOpacity={0.85} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-semibold">Salary vs value (30 days)</h3>
            <p className="mb-3 text-sm text-fg-muted">What each agent costs against the value it produced.</p>
            <ul className="mb-3 flex gap-4 text-xs text-fg-muted" aria-label="Legend">
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: seriesVar(1) }} /> Value
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: seriesVar(2) }} /> Cost
              </li>
            </ul>
            <div style={{ height: Math.max(180, salaryValue.length * 42) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryValue} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid {...GRID} horizontal={false} vertical />
                  <XAxis type="number" {...AXIS} tickFormatter={(v: number) => `£${v}`} />
                  <YAxis type="category" dataKey="name" {...AXIS} width={70} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgb(var(--c-border) / 0.05)' }}
                    content={({ active, payload, label }) => (
                      <ChartTooltip
                        active={active}
                        label={label as string}
                        payload={payload?.map((p) => ({ ...p, name: p.dataKey === 'value' ? 'Value' : 'Cost', value: p.value as number, dataKey: String(p.dataKey) }))}
                        valueFormatter={(v) => fmt.money(v)}
                      />
                    )}
                  />
                  <Bar dataKey="value" fill={seriesVar(1)} radius={[0, 4, 4, 0]} barSize={12} />
                  <Bar dataKey="cost" fill={seriesVar(2)} radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </AsyncView>
  );
}
