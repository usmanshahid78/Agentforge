import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, CircleSlash, MessageSquareText, ShieldCheck, Table2, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api';
import { Page, PageHeader } from '@/components/layout/Page';
import { TraceTimeline } from '@/components/trace/TraceTimeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChartTooltip } from '@/components/ui/chart-tooltip';
import { Segmented } from '@/components/ui/controls';
import { CountUp } from '@/components/ui/count-up';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AsyncView, LoadingState } from '@/components/ui/states';
import { useBuilder } from '@/store/builder';
import { useDb } from '@/store/db';
import { runBacktest, type BacktestPoint, type Recommendation } from '@/lib/backtest';
import { AXIS, GRID, seriesVar, shortDate } from '@/lib/chart';
import { TRUST_META } from '@/lib/trust';
import { useApi } from '@/lib/useApi';
import { cn, fmt } from '@/lib/utils';
import { parseDay } from '@/mocks/random';

type Period = '14' | '30' | '60';

function Stat({ label, value, suffix = '', hint }: { label: string; value: number; suffix?: string; hint: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-fg-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
        <CountUp value={value} format={(n) => `${n.toFixed(suffix === '%' && value % 1 ? 1 : 0)}${suffix}`} />
      </p>
      <p className="mt-1 text-xs text-fg-subtle">{hint}</p>
    </Card>
  );
}

function RecRow({ rec, name, selected, onSelect, onWhy }: { rec: Recommendation; name: string; selected: boolean; onSelect: () => void; onWhy: () => void }) {
  const feedback = useDb((s) => s.feedback[rec.id]);
  const setFeedback = useDb((s) => s.setFeedback);
  const [note, setNote] = useState(feedback?.note ?? '');

  const vote = (v: 'up' | 'down') => {
    if (feedback?.vote === v) setFeedback(rec.id, undefined);
    else setFeedback(rec.id, { vote: v, note });
  };

  const verdict =
    rec.correct === null
      ? { icon: CircleSlash, label: 'Not scored', tone: 'neutral' as const }
      : rec.correct
        ? { icon: CheckCircle2, label: 'Right call', tone: 'success' as const }
        : { icon: XCircle, label: 'Missed', tone: 'danger' as const };
  const VIcon = verdict.icon;

  return (
    <li
      id={rec.id}
      className={cn('rounded-lg border p-4 transition-colors', selected ? 'border-violet/50 bg-violet/[0.06] shadow-glow-violet' : 'border-line/10')}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onSelect} className="font-mono text-xs text-fg-muted hover:text-fg">
          {parseDay(rec.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
        </button>
        <span className="font-medium">{rec.title}</span>
        <Badge tone={verdict.tone} className="ml-auto">
          <VIcon /> {verdict.label}
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md bg-line/[0.04] p-3">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">What actually happened</p>
          <p className="text-sm">{rec.happened}</p>
        </div>
        <div className="rounded-md border border-violet/20 bg-violet/[0.06] p-3">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-violet">What {name} would have said</p>
          <p className="text-sm">{rec.said}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onWhy}>
          <MessageSquareText /> Why?
        </Button>
        <span className="ml-auto text-xs text-fg-subtle">Was this useful?</span>
        <Button variant={feedback?.vote === 'up' ? 'success' : 'ghost'} size="icon-sm" aria-label="Useful" aria-pressed={feedback?.vote === 'up'} onClick={() => vote('up')}>
          <ThumbsUp />
        </Button>
        <Button variant={feedback?.vote === 'down' ? 'danger' : 'ghost'} size="icon-sm" aria-label="Not useful" aria-pressed={feedback?.vote === 'down'} onClick={() => vote('down')}>
          <ThumbsDown />
        </Button>
      </div>
      {feedback && (
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => setFeedback(rec.id, { vote: feedback.vote, note })}
          placeholder="Add a short note (optional)"
          aria-label="Feedback note"
          className="mt-2 h-9"
        />
      )}
    </li>
  );
}

export default function TestPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const builder = useBuilder();
  const agents = useDb((s) => s.agents);
  const setTrust = useDb((s) => s.setTrust);
  const addEvent = useDb((s) => s.addEvent);
  const metrics = useApi((o) => api.getDailyMetrics(o));
  const [period, setPeriod] = useState<Period>('60');
  const [selectedId, setSelectedId] = useState<string>();
  const [traceRec, setTraceRec] = useState<Recommendation>();
  const [showTable, setShowTable] = useState(false);

  const draftReady = builder.interview.status === 'complete' && !builder.hiredAgentId;
  const options = [
    ...(draftReady ? [{ id: 'draft', label: `${builder.interview.draft.name ?? 'Draft'} (draft from builder)` }] : []),
    ...agents.map((a) => ({ id: a.id, label: `${a.name}, ${a.role}` })),
  ];
  const initial = params.get('agent');
  const [subject, setSubject] = useState(
    initial && options.some((o) => o.id === initial) ? initial : draftReady ? 'draft' : agents.find((a) => a.id === 'agt-atlas')?.id ?? options[0]?.id ?? 'draft',
  );
  const agent = agents.find((a) => a.id === subject);
  const name = subject === 'draft' ? builder.interview.draft.name ?? 'your agent' : agent?.name ?? 'the agent';

  const result = useMemo(() => (metrics.data ? runBacktest(metrics.data, Number(period)) : undefined), [metrics.data, period]);
  const recByDate = useMemo(() => new Map(result?.recommendations.map((r) => [r.date, r])), [result]);
  const chartData = useMemo(
    () => result?.points.map((p) => ({ ...p, marker: recByDate.has(p.date) ? (p.actual ?? p.predicted) : undefined })),
    [result, recByDate],
  );

  const select = (id: string) => {
    setSelectedId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const promote = () => {
    if (subject === 'draft') {
      builder.markBuilt();
      builder.markTested();
      toast.success(`${name} passed the test`, { description: 'Back to the builder to hire them in Shadow mode.' });
      navigate('/build');
      return;
    }
    if (agent) {
      setTrust(agent.id, 'shadow');
      addEvent({ agentId: agent.id, title: `${agent.name} moved to Shadow mode`, detail: `After a ${period}-day backtest at ${result?.accuracy}% accuracy.`, severity: 'info' });
      toast.success(`${agent.name} is now in Shadow mode`);
    }
  };

  const feedback = useDb((s) => s.feedback);
  const up = Object.entries(feedback).filter(([k, f]) => k.startsWith('rec-') && f.vote === 'up').length;

  return (
    <Page>
      <PageHeader
        eyebrow="Test lab"
        title="Backtest before you trust"
        description="Replay past days and compare what actually happened with what the agent would have said."
      />

      <Card className="mb-6 flex flex-col gap-4 p-4 md:flex-row md:items-center">
        <div className="flex-1">
          <label htmlFor="test-subject" className="mb-1 block text-xs text-fg-subtle">
            Agent under test
          </label>
          <select
            id="test-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-10 w-full rounded-md border border-line/10 bg-surface/60 px-3 text-sm text-fg md:max-w-sm"
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs text-fg-subtle" id="period-label">
            Period of past data
          </p>
          <Segmented<Period>
            label="Period of past data"
            value={period}
            onChange={setPeriod}
            options={[
              { value: '14', label: '14 days' },
              { value: '30', label: '30 days' },
              { value: '60', label: '60 days' },
            ]}
          />
        </div>
      </Card>

      <AsyncView state={metrics} loading={<LoadingState rows={4} className="lg:grid-cols-4" label="Running backtest" />}>
        {() =>
          result &&
          chartData && (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Forecast accuracy" value={result.accuracy} suffix="%" hint="Daily sales, 100% minus average error" />
                <Stat label="Recommendations" value={result.recommendations.length} hint={`Over ${period} days`} />
                <Stat label="Right calls" value={result.hitRate} suffix="%" hint="Pointed the right way" />
                <Stat label="Days skipped" value={result.skippedDays} hint={result.skippedDays ? 'Missing sales data, not guessed' : 'No gaps in this period'} />
              </div>

              <Card className="mb-6 p-5">
                <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <h2 className="mr-auto font-display font-semibold">Daily sales: actual vs {name}'s forecast</h2>
                  <ul className="flex flex-wrap items-center gap-4 text-xs text-fg-muted" aria-label="Legend">
                    <li className="flex items-center gap-1.5">
                      <span className="h-0.5 w-4 rounded" style={{ background: seriesVar(1) }} /> Actual
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="h-0.5 w-4 rounded border-t-2 border-dashed" style={{ borderColor: seriesVar(2) }} /> Forecast
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="h-2.5 w-4 rounded-sm" style={{ background: seriesVar(2), opacity: 0.18 }} /> Expected range
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full border-2 border-fg bg-bg" /> Recommendation
                    </li>
                  </ul>
                  <Button variant="ghost" size="sm" onClick={() => setShowTable((t) => !t)} aria-pressed={showTable}>
                    <Table2 /> {showTable ? 'Chart' : 'Table'}
                  </Button>
                </div>

                {showTable ? (
                  <div className="scrollbar-thin max-h-80 overflow-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">Daily actual and forecast sales</caption>
                      <thead className="sticky top-0 bg-bg-elevated text-left text-xs text-fg-subtle">
                        <tr>
                          <th className="py-2 font-medium">Date</th>
                          <th className="py-2 text-right font-medium">Actual</th>
                          <th className="py-2 text-right font-medium">Forecast</th>
                          <th className="py-2 pl-4 font-medium">Weather</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-xs">
                        {result.points.map((p) => (
                          <tr key={p.date} className="border-t border-line/5">
                            <td className="py-1.5">{shortDate(p.date)}</td>
                            <td className="py-1.5 text-right">{p.actual === null ? 'missing' : fmt.money(p.actual)}</td>
                            <td className="py-1.5 text-right">{fmt.money(p.predicted)}</td>
                            <td className="py-1.5 pl-4 text-fg-muted">
                              {p.tempC.toFixed(0)}°C {p.condition}
                              {p.event ? `, ${p.event}` : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-72 md:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={24} />
                        <YAxis {...AXIS} width={52} tickFormatter={(v: number) => `£${Math.round(v / 1000)}k`} axisLine={false} />
                        <Tooltip
                          cursor={{ stroke: 'rgb(var(--c-fg-subtle))', strokeDasharray: '3 3' }}
                          content={({ active, payload, label }) => {
                            const p = payload?.[0]?.payload as (BacktestPoint & { marker?: number }) | undefined;
                            return (
                              <ChartTooltip
                                active={active}
                                label={label as string}
                                labelFormatter={(l) => `${shortDate(String(l))}${p ? ` · ${p.tempC.toFixed(0)}°C ${p.condition}` : ''}`}
                                payload={payload?.filter((x) => x.dataKey === 'actual' || x.dataKey === 'predicted').map((x) => ({
                                  ...x,
                                  name: x.dataKey === 'actual' ? (p?.missing ? 'Actual (missing)' : 'Actual') : 'Forecast',
                                  value: x.value as number,
                                  dataKey: String(x.dataKey),
                                }))}
                                valueFormatter={(v) => fmt.money(v)}
                              />
                            );
                          }}
                        />
                        <Area dataKey="band" stroke="none" fill={seriesVar(2)} fillOpacity={0.12} isAnimationActive={false} activeDot={false} />
                        <Line dataKey="predicted" stroke={seriesVar(2)} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} />
                        <Line dataKey="actual" stroke={seriesVar(1)} strokeWidth={2} dot={false} connectNulls={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--c-bg))' }} />
                        <Scatter
                          dataKey="marker"
                          isAnimationActive={false}
                          shape={(props: { cx?: number; cy?: number; payload?: BacktestPoint }) => {
                            const { cx, cy, payload } = props;
                            if (cx === undefined || cy === undefined || !payload) return <g />;
                            const rec = recByDate.get(payload.date);
                            if (!rec) return <g />;
                            const on = rec.id === selectedId;
                            return (
                              <g
                                role="button"
                                tabIndex={0}
                                aria-label={`${rec.title}, ${shortDate(rec.date)}`}
                                onClick={() => select(rec.id)}
                                onKeyDown={(e) => e.key === 'Enter' && select(rec.id)}
                                style={{ cursor: 'pointer' }}
                              >
                                <circle cx={cx} cy={cy} r={14} fill="transparent" />
                                <circle cx={cx} cy={cy} r={on ? 8 : 6} fill="rgb(var(--c-bg))" stroke="rgb(var(--c-fg))" strokeWidth={2} />
                                {on && <circle cx={cx} cy={cy} r={12} fill="none" stroke="rgb(var(--c-violet))" strokeWidth={2} />}
                              </g>
                            );
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {result.skippedDays > 0 && (
                  <p className="mt-3 text-xs text-fg-subtle">
                    The gap in the actual line is {result.skippedDays} days of missing till data. Those days are left out of the score.
                  </p>
                )}
              </Card>

              <div className="mb-4 flex flex-wrap items-end gap-3">
                <div className="mr-auto">
                  <h2 className="text-xl font-semibold">Recommendations</h2>
                  <p className="text-sm text-fg-muted">Click a marker or a row. Rate each one to teach {name} what you find useful.</p>
                </div>
                {up > 0 && <Badge tone="success">{up} marked useful</Badge>}
              </div>
              <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {result.recommendations.map((r) => (
                  <RecRow key={r.id} rec={r} name={name} selected={r.id === selectedId} onSelect={() => select(r.id)} onWhy={() => setTraceRec(r)} />
                ))}
              </motion.ul>

              <Card glow className="mt-8 flex flex-col items-start gap-4 p-6 md:flex-row md:items-center">
                <ShieldCheck className="size-8 shrink-0 text-violet" aria-hidden />
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">
                    {result.accuracy >= 85 ? 'Ready for Shadow mode' : 'Good enough to watch, not yet to act'}
                  </h2>
                  <p className="text-sm text-fg-muted">
                    {result.accuracy}% accurate with {result.hitRate}% right calls. In Shadow mode {name} only recommends; nothing changes in your business until you approve.
                  </p>
                </div>
                {subject === 'draft' || !agent || agent.trust === 'shadow' ? (
                  <Button variant="primary" size="lg" onClick={promote}>
                    {subject === 'draft' ? 'Promote to shadow mode' : 'Confirm Shadow mode'}
                  </Button>
                ) : (
                  <Button variant="outline" asChild>
                    <Link to={`/agents/${agent.id}`}>Currently {TRUST_META[agent.trust].label}: open trust ladder</Link>
                  </Button>
                )}
              </Card>
            </>
          )
        }
      </AsyncView>

      <Dialog open={!!traceRec} onOpenChange={(o) => !o && setTraceRec(undefined)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{traceRec?.title}</DialogTitle>
            <DialogDescription>How {name} reached this recommendation on {traceRec && shortDate(traceRec.date)}.</DialogDescription>
          </DialogHeader>
          {traceRec && <TraceTimeline steps={traceRec.steps} />}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
