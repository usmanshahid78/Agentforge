import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, Check, Loader2, MessagesSquare, Sparkles, Table2, X } from 'lucide-react';
import type { Organization } from '@/types';
import { reportFallback } from '@/ai';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChartTooltip } from '@/components/ui/chart-tooltip';
import { Segmented } from '@/components/ui/controls';
import { AXIS, GRID, seriesVar, shortDate } from '@/lib/chart';
import {
  LIMITS,
  complianceChecks,
  PERIOD_LABEL,
  growthSeries,
  marketFor,
  monthLabel,
  monthlyReturns,
  pctText,
  periodRange,
  portfolioStats,
  recommendationsFor,
  riskStats,
  ruleAdvice,
  sectorWeights,
  signedPct,
  stockStats,
  worstStatus,
  type MarketBook,
  type Period,
  type Recommendation,
} from '@/lib/investing';
import { agentsOf, headOf } from '@/lib/orgs';
import { cn, fmt } from '@/lib/utils';
import { adviseWithModel } from './ai';
import { CheckBadge, ChartCard, MemberDot, StatTile } from './shared';

/* Diverging pair for gains and losses; the sign is also printed, so colour is never the only cue. */
const GAIN = seriesVar(1);
const LOSS = seriesVar(2);
const MARKET = 'var(--series-other)';

const money = (n: number) => (Math.abs(n) >= 1e6 ? `£${(n / 1e6).toFixed(2)}m` : fmt.money(n));
const pctAxis = (v: number) => `${Math.round(v * 100)}%`;

const ALL_PERIODS: Period[] = ['ITD', 'YTD', 'QTD', 'MTD', 'MoM'];

function Signed({ value, digits = 1 }: { value: number; digits?: number }) {
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-0.5 font-mono tabular-nums">
      <Icon className={cn('size-3', value >= 0 ? 'text-success' : 'text-danger')} aria-hidden />
      {signedPct(value, digits)}
    </span>
  );
}

function Legend({ items }: { items: Array<{ label: string; color: string; dashed?: boolean }> }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className={cn('h-0.5 w-4 rounded-full', i.dashed && 'border-t-2 border-dashed bg-transparent')} style={i.dashed ? { borderColor: i.color } : { background: i.color }} /> {i.label}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------- firm summary ------------------------------ */

function FirmSummary({ book, selected, onSelect }: { book: MarketBook; selected: string; onSelect: (id: string) => void }) {
  const all = book.portfolios.map((p) => {
    const s = portfolioStats(book, p);
    return { p, s, health: worstStatus(complianceChecks(s.stocks, s.cashWeight)) };
  });
  const total = all.reduce((sum, x) => sum + x.s.value, 0);
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <StatTile label="Assets under management" value={money(total)} sub={`${book.portfolios.length} portfolios · since ${shortDate(book.days[0]!)} ${book.days[0]!.slice(0, 4)}`} />
      {all.map(({ p, s, health }) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          aria-pressed={selected === p.id}
          className={cn('glass rounded-lg p-4 text-left transition-all hover:-translate-y-0.5', selected === p.id && 'border-violet/50 ring-2 ring-violet/30')}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-display font-semibold">{p.name}</span>
            <CheckBadge status={health} />
          </div>
          <div className="mt-2 font-display text-2xl font-semibold tabular-nums">{money(s.value)}</div>
          <div className="mt-1 flex gap-3 text-xs text-fg-muted">
            <span>
              ITD <Signed value={s.returns.ITD.portfolio} />
            </span>
            <span>
              YTD <Signed value={s.returns.YTD.portfolio} />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- the charts -------------------------------- */

function GrowthChart({ book, portfolioId }: { book: MarketBook; portfolioId: string }) {
  const [range, setRange] = useState<'ITD' | 'YTD' | 'MTD'>('ITD');
  const p = book.portfolios.find((x) => x.id === portfolioId)!;
  const data = useMemo(() => growthSeries(book, p, periodRange(book, range)[0]), [book, p, range]);
  return (
    <ChartCard
      title="Growth of £100"
      description="The portfolio against the market."
      actions={<Segmented label="Range" value={range} onChange={setRange} options={(['ITD', 'YTD', 'MTD'] as const).map((r) => ({ value: r, label: r }))} />}
    >
      <Legend items={[{ label: p.name, color: GAIN }, { label: 'Market', color: MARKET, dashed: true }]} />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={40} />
            <YAxis {...AXIS} width={40} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v: number) => v.toFixed(0)} />
            <ReferenceLine y={100} stroke="rgb(var(--c-fg-subtle))" strokeDasharray="2 3" />
            <Tooltip
              cursor={{ stroke: 'rgb(var(--c-fg-subtle))', strokeDasharray: '3 3' }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  label={label as string}
                  labelFormatter={(l) => shortDate(String(l))}
                  payload={payload?.map((x) => ({ ...x, name: x.dataKey === 'portfolio' ? p.name : 'Market', value: x.value as number, dataKey: String(x.dataKey) }))}
                  valueFormatter={(v) => `£${v.toFixed(2)} (${signedPct(v / 100 - 1)})`}
                />
              )}
            />
            <Line type="monotone" dataKey="benchmark" stroke={MARKET} strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="portfolio" stroke={GAIN} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--c-bg))' }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function MonthlyChart({ book, portfolioId }: { book: MarketBook; portfolioId: string }) {
  const p = book.portfolios.find((x) => x.id === portfolioId)!;
  const data = useMemo(() => monthlyReturns(book, p).map((m) => ({ ...m, label: monthLabel(m.month) })), [book, p]);
  return (
    <ChartCard title="Month on month" description="Return of each month. The current month is month to date.">
      <Legend items={[{ label: 'Gain', color: GAIN }, { label: 'Loss', color: LOSS }, { label: 'Market', color: MARKET, dashed: true }]} />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="label" {...AXIS} minTickGap={16} />
            <YAxis {...AXIS} width={40} axisLine={false} tickFormatter={pctAxis} />
            <ReferenceLine y={0} stroke="rgb(var(--c-fg-subtle))" />
            <Tooltip
              cursor={{ fill: 'rgb(var(--c-border) / 0.05)' }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  label={label as string}
                  payload={payload?.map((x) => ({ ...x, name: x.dataKey === 'portfolio' ? p.name : 'Market', value: x.value as number, dataKey: String(x.dataKey), color: x.dataKey === 'portfolio' ? ((x.value as number) >= 0 ? GAIN : LOSS) : MARKET }))}
                  valueFormatter={(v) => signedPct(v, 2)}
                />
              )}
            />
            <Bar dataKey="portfolio" radius={[3, 3, 3, 3]} maxBarSize={18} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.month} fill={d.portfolio >= 0 ? GAIN : LOSS} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="benchmark" stroke={MARKET} strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function ContributionChart({ book, portfolioId, period }: { book: MarketBook; portfolioId: string; period: Period }) {
  const p = book.portfolios.find((x) => x.id === portfolioId)!;
  const data = useMemo(() => [...stockStats(book, p, period)].sort((a, b) => b.contribution - a.contribution), [book, p, period]);
  const total = data.reduce((s, x) => s + x.contribution, 0);
  return (
    <ChartCard title="Contribution by stock" description={`How much each stock added to the ${PERIOD_LABEL[period].toLowerCase()} return of ${signedPct(total, 2)}.`}>
      <div style={{ height: data.length * 22 + 30 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} horizontal={false} vertical />
            <XAxis type="number" {...AXIS} tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
            <YAxis type="category" dataKey="ticker" {...AXIS} width={48} axisLine={false} interval={0} />
            <ReferenceLine x={0} stroke="rgb(var(--c-fg-subtle))" />
            <Tooltip
              cursor={{ fill: 'rgb(var(--c-border) / 0.05)' }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
                if (!active || !row) return null;
                return (
                  <ChartTooltip
                    active
                    label={`${row.ticker} · ${row.name}`}
                    payload={[
                      { name: 'Contribution', value: row.contribution, dataKey: 'c', color: row.contribution >= 0 ? GAIN : LOSS },
                      { name: 'Stock return', value: row.ret, dataKey: 'r' },
                      { name: 'Weight today', value: row.weight, dataKey: 'w' },
                    ]}
                    valueFormatter={(v, k) => (k === 'w' ? pctText(v) : signedPct(v, 2))}
                  />
                );
              }}
            />
            <Bar dataKey="contribution" radius={4} barSize={12} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.ticker} fill={d.contribution >= 0 ? GAIN : LOSS} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function AllocationChart({ book, portfolioId }: { book: MarketBook; portfolioId: string }) {
  const p = book.portfolios.find((x) => x.id === portfolioId)!;
  const stats = portfolioStats(book, p);
  const stocks = [...stats.stocks].sort((a, b) => b.weight - a.weight);
  const sectors = sectorWeights(stats.stocks);
  return (
    <ChartCard title="Weights against the limits" description="Each stock against the 10% limit (5% marks the 5/10/40 line), each sector against 35%.">
      <div className="grid gap-4 md:grid-cols-2">
        <div style={{ height: stocks.length * 18 + 30 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stocks} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} horizontal={false} vertical />
              <XAxis type="number" domain={[0, 0.12]} {...AXIS} tickFormatter={pctAxis} />
              <YAxis type="category" dataKey="ticker" {...AXIS} width={48} axisLine={false} interval={0} />
              <ReferenceLine x={LIMITS.bigHolding} stroke="rgb(var(--c-fg-subtle))" strokeDasharray="3 3" />
              <ReferenceLine x={LIMITS.stock} stroke="rgb(var(--c-danger))" strokeWidth={2} label={{ value: '10%', fill: 'rgb(var(--c-fg-muted))', fontSize: 10, position: 'top' }} />
              <Tooltip cursor={{ fill: 'rgb(var(--c-border) / 0.05)' }} content={({ active, payload, label }) => <ChartTooltip active={active} label={label as string} payload={payload?.map((x) => ({ ...x, name: 'Weight', value: x.value as number, dataKey: 'w' }))} valueFormatter={(v) => pctText(v)} />} />
              <Bar dataKey="weight" fill={seriesVar(7)} radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ height: Math.max(160, sectors.length * 26 + 30) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectors} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} horizontal={false} vertical />
              <XAxis type="number" domain={[0, 0.4]} {...AXIS} tickFormatter={pctAxis} />
              <YAxis type="category" dataKey="sector" {...AXIS} width={96} axisLine={false} interval={0} />
              <ReferenceLine x={LIMITS.sector} stroke="rgb(var(--c-danger))" strokeWidth={2} label={{ value: '35%', fill: 'rgb(var(--c-fg-muted))', fontSize: 10, position: 'top' }} />
              <Tooltip cursor={{ fill: 'rgb(var(--c-border) / 0.05)' }} content={({ active, payload, label }) => <ChartTooltip active={active} label={label as string} payload={payload?.map((x) => ({ ...x, name: 'Weight', value: x.value as number, dataKey: 'w' }))} valueFormatter={(v) => pctText(v)} />} />
              <Bar dataKey="weight" fill={seriesVar(7)} radius={[0, 4, 4, 0]} barSize={12} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}

/* ------------------------------ stock table -------------------------------- */

function StockTable({ book, portfolioId, period, periods }: { book: MarketBook; portfolioId: string; period: Period; periods: Period[] }) {
  const p = book.portfolios.find((x) => x.id === portfolioId)!;
  const byPeriod = useMemo(() => Object.fromEntries(periods.map((per) => [per, stockStats(book, p, per)])) as Record<Period, ReturnType<typeof stockStats>>, [book, p, periods]);
  const base = [...stockStats(book, p, period)].sort((a, b) => b.weight - a.weight);
  const stats = portfolioStats(book, p);
  return (
    <Card className="overflow-hidden">
      <div className="p-5 pb-3">
        <h3 className="font-display font-semibold">Return of each stock</h3>
        <p className="text-sm text-fg-muted">Price return per period, and the contribution to the {PERIOD_LABEL[period].toLowerCase()} return.</p>
      </div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-left text-xs text-fg-subtle">
            <tr className="border-y border-line/5">
              <th className="px-5 py-2 font-medium">Stock</th>
              <th className="px-3 py-2 font-medium">Sector</th>
              <th className="px-3 py-2 text-right font-medium">Value</th>
              <th className="px-3 py-2 text-right font-medium">Weight</th>
              {periods.map((per) => (
                <th key={per} className="px-3 py-2 text-right font-medium" title={PERIOD_LABEL[per]}>
                  {per}
                </th>
              ))}
              <th className="px-5 py-2 text-right font-medium">Contribution ({period})</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-line/5 bg-line/5 font-semibold">
              <td className="px-5 py-2" colSpan={2}>
                Whole portfolio
              </td>
              <td className="px-3 py-2 text-right font-mono">{money(stats.value)}</td>
              <td className="px-3 py-2 text-right font-mono">100%</td>
              {periods.map((per) => (
                <td key={per} className="px-3 py-2 text-right">
                  <Signed value={stats.returns[per].portfolio} />
                </td>
              ))}
              <td className="px-5 py-2 text-right">
                <Signed value={stats.returns[period].portfolio} digits={2} />
              </td>
            </tr>
            {base.map((s) => (
              <tr key={s.ticker} className="border-t border-line/5">
                <td className="whitespace-nowrap px-5 py-2">
                  <span className="font-mono font-semibold">{s.ticker}</span> <span className="text-xs text-fg-muted">{s.name}</span>
                </td>
                <td className="px-3 py-2 text-fg-muted">{s.sector}</td>
                <td className="px-3 py-2 text-right font-mono">{money(s.value)}</td>
                <td className={cn('px-3 py-2 text-right font-mono', s.weight > LIMITS.stock && 'font-semibold text-danger')}>{pctText(s.weight)}</td>
                {periods.map((per) => (
                  <td key={per} className="px-3 py-2 text-right">
                    <Signed value={byPeriod[per].find((x) => x.ticker === s.ticker)!.ret} />
                  </td>
                ))}
                <td className="px-5 py-2 text-right">
                  <Signed value={s.contribution} digits={2} />
                </td>
              </tr>
            ))}
            <tr className="border-t border-line/5 text-fg-muted">
              <td className="px-5 py-2" colSpan={2}>
                Cash
              </td>
              <td className="px-3 py-2 text-right font-mono">{money(p.cash)}</td>
              <td className="px-3 py-2 text-right font-mono">{pctText(stats.cashWeight)}</td>
              <td colSpan={periods.length + 1} />
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ---------------------------- recommendations ------------------------------ */

function RecommendationCard({ org, rec, decision, onDecide }: { org: Organization; rec: Recommendation; decision?: 'approved' | 'rejected'; onDecide: (d: 'approved' | 'rejected') => void }) {
  const member = org.members.find((m) => m.id === rec.agentId)!;
  const head = headOf(org);
  return (
    <li className={cn('rounded-md border border-line/10 p-3', decision === 'rejected' && 'opacity-60')}>
      <div className="flex items-start gap-3">
        <MemberDot org={org} member={member} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {rec.order && <Badge tone={rec.order.side === 'BUY' ? 'cyan' : 'magenta'}>{rec.order.side}</Badge>}
            <span className="font-medium">{rec.title}</span>
          </div>
          <p className="mt-0.5 text-sm text-fg-muted">{rec.detail}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {rec.compliant ? (
              <Badge tone="success">
                <Check aria-hidden /> Within the rules
              </Badge>
            ) : (
              <Badge tone="danger">
                <X aria-hidden /> Breaks a rule
              </Badge>
            )}
            {rec.order &&
              (decision ? (
                <Badge tone={decision === 'approved' ? 'success' : 'neutral'}>{decision === 'approved' ? `Approved by ${head?.name}` : 'Rejected'}</Badge>
              ) : (
                <>
                  <Button size="sm" variant="success" onClick={() => onDecide('approved')} disabled={!rec.compliant}>
                    <Check /> Approve
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDecide('rejected')}>
                    <X /> Reject
                  </Button>
                </>
              ))}
          </div>
        </div>
      </div>
    </li>
  );
}

function Recommendations({ org, recs }: { org: Organization; recs: Recommendation[] }) {
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'rejected'>>({});
  return (
    <ChartCard title="Recommendations by agent" description="What each agent suggests for this portfolio. Trades are checked against every rule before they reach you.">
      <div className="grid gap-4 xl:grid-cols-2">
        {agentsOf(org).map((a) => {
          const mine = recs.filter((r) => r.agentId === a.id);
          if (!mine.length) return null;
          return (
            <section key={a.id} aria-label={`${a.name}, ${a.role}`}>
              <h4 className="mb-2 text-sm font-semibold">
                {a.name} <span className="font-normal text-fg-muted">· {a.role}</span>
              </h4>
              <ul className="space-y-2">
                {mine.map((r) => (
                  <RecommendationCard key={r.id} org={org} rec={r} decision={decisions[r.id]} onDecide={(d) => setDecisions((s) => ({ ...s, [r.id]: d }))} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </ChartCard>
  );
}

/** How the agents hand the work to each other, ending with the head's approval. */
function AgentThread({ org, recs, portfolioName }: { org: Organization; recs: Recommendation[]; portfolioName: string }) {
  const head = headOf(org);
  const by = (re: RegExp) => agentsOf(org).find((a) => re.test(a.role));
  const im = by(/investment manager|research|analyst/i);
  const fm = by(/fund manager|portfolio manager/i);
  const trader = by(/trader|dealer|execution/i);
  const auditor = by(/audit|compliance/i);
  const trades = recs.filter((r) => r.order);
  const first = (agentId?: string) => recs.find((r) => r.agentId === agentId);
  const lines = [
    im && { who: im, to: fm ?? trader, text: `${first(im.id)?.title}. ${first(im.id)?.detail}` },
    fm && { who: fm, to: trader, text: `${first(fm.id)?.title}. ${first(fm.id)?.detail}` },
    trader && { who: trader, to: auditor, text: trades.length ? `Proposed ${trades.length} order${trades.length === 1 ? '' : 's'}: ${trades.map((t) => `${t.order!.side} ${t.order!.ticker}`).join(', ')}.` : 'No orders needed today.' },
    auditor && { who: auditor, to: head, text: recs.filter((r) => r.agentId === auditor.id).at(-1)?.title ?? 'Checked.' },
  ].filter(Boolean) as Array<{ who: NonNullable<typeof im>; to?: typeof head; text: string }>;
  return (
    <ChartCard title="How the agents worked it out" description={`Today's discussion on ${portfolioName}.`}>
      <ol className="space-y-3">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-3">
            <MemberDot org={org} member={l.who} size="sm" />
            <div className="min-w-0 text-sm">
              <div className="text-xs text-fg-muted">
                <span className="font-semibold text-fg">{l.who.name}</span> ({l.who.role}) {l.to && <>→ {l.to.name}</>}
              </div>
              <p>{l.text}</p>
            </div>
          </li>
        ))}
        {head && (
          <li className="flex gap-3">
            <MemberDot org={org} member={head} size="sm" />
            <p className="text-sm text-fg-muted">
              Waiting for <span className="font-semibold text-fg">{head.name}</span> to approve the trades above.
            </p>
          </li>
        )}
      </ol>
    </ChartCard>
  );
}

/* ------------------------------- AI advice --------------------------------- */

function AiAdvice({ org, book }: { org: Organization; book: MarketBook }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const rules = useMemo(() => ruleAdvice(org, book), [org, book]);
  useEffect(() => () => abort.current?.abort(), []);

  const ask = async () => {
    abort.current?.abort();
    abort.current = new AbortController();
    setBusy(true);
    setText('');
    try {
      const reply = await adviseWithModel(org, book, setText, abort.current.signal);
      if (reply === null) setText('');
    } catch (e) {
      reportFallback(e);
      setText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card glow className="p-5">
      <div className="mb-3 flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h3 className="flex items-center gap-2 font-display font-semibold">
            <Sparkles className="size-4 text-violet" aria-hidden /> AI suggestions
          </h3>
          <p className="text-sm text-fg-muted">Based on the returns, contributions and compliance of every portfolio. Rules are applied before anything is suggested.</p>
        </div>
        <Button size="sm" variant="outline" onClick={ask} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <MessagesSquare />} {busy ? 'Thinking…' : 'Ask the local model'}
        </Button>
      </div>
      {text ? (
        <div className="whitespace-pre-wrap rounded-md border border-violet/20 bg-violet/5 p-3 text-sm leading-relaxed" aria-live="polite">
          {text}
        </div>
      ) : (
        <ul className="space-y-2 text-sm">
          {rules.map((r) => (
            <li key={r} className="rounded-md border border-line/10 bg-line/5 p-3">
              {r}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* --------------------------------- page ----------------------------------- */

export function InvestmentDashboard({ org }: { org: Organization }) {
  const book = useMemo(() => marketFor(org), [org]);
  const [portfolioId, setPortfolioId] = useState(book.portfolios[0]!.id);
  // Table columns: the periods the creator asked for (always with ITD), or the usual four.
  const asked = ALL_PERIODS.filter((x) => x === 'ITD' || org.periods.includes(x));
  const periods: Period[] = asked.length > 1 ? asked : ['ITD', 'YTD', 'MTD', 'MoM'];
  const [period, setPeriod] = useState<Period>('YTD');
  const p = book.portfolios.find((x) => x.id === portfolioId)!;
  const stats = portfolioStats(book, p, period);
  const { recs, checks } = useMemo(() => recommendationsFor(org, book, portfolioStats(book, p)), [org, book, p]);
  const risk = riskStats(book, p);
  const [table, setTable] = useState(false);

  return (
    <div className="space-y-6">
      <p className="text-xs text-fg-subtle">Simulated market data for a demo: the stocks are fictional and prices are generated, not live.</p>
      <FirmSummary book={book} selected={portfolioId} onSelect={setPortfolioId} />

      <div>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <h2 className="font-display text-xl font-semibold">{p.name}</h2>
            <p className="text-sm text-fg-muted">
              {p.strategy} Rebalanced every {p.rebalanceMonths === 1 ? 'month' : `${p.rebalanceMonths} months`}. Volatility {pctText(risk.volatility)} a year, deepest fall {pctText(risk.maxDrawdown)}.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setTable((t) => !t)} aria-pressed={table}>
            <Table2 /> {table ? 'Tiles' : 'Table'}
          </Button>
        </div>
        {table ? (
          <Card className="p-4">
            <table className="w-full text-sm">
              <caption className="sr-only">Returns by period</caption>
              <thead className="text-left text-xs text-fg-subtle">
                <tr>
                  <th className="py-1 font-medium">Period</th>
                  <th className="py-1 text-right font-medium">{p.name}</th>
                  <th className="py-1 text-right font-medium">Market</th>
                </tr>
              </thead>
              <tbody>
                {ALL_PERIODS.map((per) => (
                  <tr key={per} className="border-t border-line/5">
                    <td className="py-1.5">{PERIOD_LABEL[per]}</td>
                    <td className="py-1.5 text-right font-mono">{signedPct(stats.returns[per].portfolio, 2)}</td>
                    <td className="py-1.5 text-right font-mono">{signedPct(stats.returns[per].benchmark, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {ALL_PERIODS.map((per) => (
              <StatTile key={per} label={`${per} · ${PERIOD_LABEL[per]}`} value={signedPct(stats.returns[per].portfolio)} sub={`Market ${signedPct(stats.returns[per].benchmark)}`} />
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <GrowthChart book={book} portfolioId={portfolioId} />
        <MonthlyChart book={book} portfolioId={portfolioId} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Period for contributions:</span>
        <Segmented label="Contribution period" value={period} onChange={setPeriod} options={ALL_PERIODS.map((x) => ({ value: x, label: x }))} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ContributionChart book={book} portfolioId={portfolioId} period={period} />
        <StockTable book={book} portfolioId={portfolioId} period={period} periods={periods} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AllocationChart book={book} portfolioId={portfolioId} />
        <ChartCard title="Compliance" description="Checked on today's weights.">
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.id} className="rounded-md border border-line/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{c.rule}</span>
                  <CheckBadge status={c.status} />
                </div>
                <p className="mt-1 text-xs text-fg-muted">{c.detail}</p>
              </li>
            ))}
          </ul>
          <ul className="mt-3 list-disc space-y-0.5 pl-4 text-xs text-fg-muted">
            {/* The first rules are the measured checks above; the rest apply to every trade. */}
            {org.compliance.slice(checks.length).map((r) => (
              <li key={r}>{r}: enforced on every proposed trade.</li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Recommendations key={portfolioId} org={org} recs={recs} />
        <div className="space-y-4">
          <AgentThread org={org} recs={recs} portfolioName={p.name} />
          <AiAdvice org={org} book={book} />
        </div>
      </div>
    </div>
  );
}
