import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarClock, Check, Cloud, CloudLightning, CloudRain, FileDown, Lightbulb, Mail, MessageCircle, Mic, Play, Square, Sun } from 'lucide-react';
import { toast } from 'sonner';
import type { Agent, DailyMetric } from '@/types';
import { api } from '@/api';
import { Avatar } from '@/components/avatar/Avatar';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChartTooltip } from '@/components/ui/chart-tooltip';
import { Tabs } from '@/components/ui/controls';
import { Input } from '@/components/ui/input';
import { AsyncView, EmptyState, LoadingState } from '@/components/ui/states';
import { useDb, uid, type BriefingSchedule } from '@/store/db';
import { buildBriefing, type Briefing } from '@/lib/briefing';
import { AXIS, GRID, seriesVar } from '@/lib/chart';
import { useSpeaker } from '@/lib/speech';
import { useApi } from '@/lib/useApi';
import { cn, fmt } from '@/lib/utils';

const WX: Record<DailyMetric['condition'], typeof Sun> = { sunny: Sun, cloudy: Cloud, rain: CloudRain, storm: CloudLightning, snow: Cloud };
type Channel = BriefingSchedule['channels'][number];
type Preview = 'email' | 'whatsapp' | 'pdf' | 'voice';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function BriefingCard({ b, presenter }: { b: Briefing; presenter: Agent }) {
  const addApproval = useDb((s) => s.addApproval);
  const approvals = useDb((s) => s.approvals);
  const sent = approvals.some((a) => a.action === b.action.title);
  return (
    <Card glow className="print-area overflow-hidden p-6 md:p-8">
      <div className="flex items-center gap-3">
        <Avatar agent={presenter} size="md" />
        <div className="flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">Daily briefing</p>
          <p className="text-sm text-fg-muted">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · from {presenter.name}
          </p>
        </div>
      </div>
      <h2 className="mt-5 text-balance text-2xl font-semibold leading-tight md:text-3xl">{b.headline}</h2>

      <ol className="mt-6 grid gap-3 md:grid-cols-3">
        {b.insights.map((i, n) => (
          <li key={i} className="rounded-lg border border-line/10 bg-line/[0.03] p-4">
            <span className="font-mono text-xs text-violet">0{n + 1}</span>
            <p className="mt-1 text-sm">{i}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-medium">Forecast sales, next 7 days</h3>
          <span className="text-xs text-fg-subtle">vs a normal day of the week</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={b.forecast} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis
                dataKey="label"
                {...AXIS}
                height={42}
                tick={({ x, y, payload, index }: { x: number | string; y: number | string; payload: { value: string }; index: number }) => {
                  const f = b.forecast[index];
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text dy={12} textAnchor="middle" fill="rgb(var(--c-fg-muted))" fontSize={11}>
                        {payload.value}
                      </text>
                      <text dy={28} textAnchor="middle" fill="rgb(var(--c-fg-subtle))" fontSize={10} fontFamily="JetBrains Mono Variable, monospace">
                        {f ? `${f.tempC}°` : ''}
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis {...AXIS} width={44} axisLine={false} tickFormatter={(v: number) => `£${Math.round(v / 1000)}k`} />
              <Tooltip
                cursor={{ fill: 'rgb(var(--c-border) / 0.05)' }}
                content={({ active, payload }) => {
                  const f = payload?.[0]?.payload as Briefing['forecast'][number] | undefined;
                  return (
                    <ChartTooltip
                      active={active}
                      label={f ? `${f.weekday} · ${f.tempC}°C ${f.condition}${f.event ? ` · ${f.event}` : ''}` : ''}
                      payload={payload?.map((p) => ({ ...p, name: 'Forecast', value: p.value as number, dataKey: 'sales' }))}
                      valueFormatter={(v) => `${fmt.money(v)} (${f && f.vsNormalPct > 0 ? '+' : ''}${f?.vsNormalPct}%)`}
                    />
                  );
                }}
              />
              <Bar dataKey="sales" fill={seriesVar(1)} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-1 flex justify-around" aria-label="Weather">
          {b.forecast.map((f) => {
            const Icon = WX[f.condition];
            return (
              <li key={f.date} className="flex flex-col items-center text-fg-subtle">
                <Icon className="size-4" aria-label={f.condition} />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-lg border border-violet/25 bg-violet/[0.07] p-4 md:flex-row md:items-center">
        <Lightbulb className="size-6 shrink-0 text-violet" aria-hidden />
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-wider text-violet">Recommended action</p>
          <p className="font-medium">{b.action.title}</p>
          <p className="text-sm text-fg-muted">{b.action.detail}</p>
        </div>
        <Button
          variant={sent ? 'success' : 'primary'}
          disabled={sent}
          onClick={() => {
            addApproval({
              id: uid('apr'),
              agentId: presenter.id,
              createdAt: new Date().toISOString(),
              action: b.action.title,
              reasoning: b.insights[0] ?? '',
              expectedImpact: b.action.detail,
              impactValue: 335,
              risk: 'low',
              status: 'pending',
            });
            toast.success('Sent to your approval queue');
          }}
        >
          {sent ? <Check /> : null} {sent ? 'In approval queue' : 'Send for approval'}
        </Button>
      </div>
    </Card>
  );
}

function EmailPreview({ b, presenter }: { b: Briefing; presenter: Agent }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line/10 bg-paper text-ink shadow-card">
      <div className="border-b border-ink/10 bg-paper-alt px-4 py-3 text-xs text-ink-muted">
        <div>
          <strong className="text-ink">From:</strong> {presenter.name} at Nova Mart AI &lt;briefing@novamart.example&gt;
        </div>
        <div>
          <strong className="text-ink">Subject:</strong> Your 08:00 briefing: {b.headline.split(':')[0]}
        </div>
      </div>
      <div className="space-y-3 p-5 text-sm">
        <p>Good morning Sana,</p>
        <p className="font-semibold">{b.headline}</p>
        <ul className="list-disc space-y-1 pl-5">
          {b.insights.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <p className="rounded-md bg-violet/10 p-3 text-ink">
          <strong>Recommended:</strong> {b.action.title}
        </p>
        <p className="text-ink-muted">
          {presenter.name}, {presenter.role}
        </p>
      </div>
    </div>
  );
}

function WhatsAppPreview({ b, presenter }: { b: Briefing; presenter: Agent }) {
  return (
    <div className="mx-auto w-full max-w-sm rounded-[2rem] border-4 border-line/20 bg-bg p-2 shadow-card">
      <div className="rounded-t-[1.5rem] bg-chat-head px-4 py-3 text-sm font-medium text-white">{presenter.name} · Nova Mart</div>
      <div className="space-y-2 bg-chat-bg p-3">
        <div className="ml-auto w-fit rounded-lg bg-chat-out px-3 py-1.5 text-xs text-white">Morning! Anything I should know?</div>
        <div className="w-[88%] rounded-lg bg-chat-in px-3 py-2 text-[13px] leading-snug text-chat-text">
          <p className="font-semibold">Today's briefing</p>
          <p className="mt-1">{b.headline}</p>
          <p className="mt-2 font-medium">Recommended: {b.action.title}</p>
          <p className="mt-1 text-right text-[10px] text-chat-meta">08:00</p>
        </div>
        <div className="flex gap-2">
          {['Approve', 'Tell me more'].map((q) => (
            <span key={q} className="rounded-full border border-chat-line px-3 py-1 text-xs text-chat-link">
              {q}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function VoicePreview({ b, presenter }: { b: Briefing; presenter: Agent }) {
  const speaker = useSpeaker();
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <Avatar agent={presenter} size="xl" state={speaker.speaking ? 'speaking' : 'idle'} level={speaker.level} allow3d />
      <Button variant="primary" onClick={() => (speaker.speaking ? speaker.stop() : speaker.speak(b.spoken, presenter.voice))}>
        {speaker.speaking ? <Square /> : <Play />} {speaker.speaking ? 'Stop' : `Play ${presenter.name}'s briefing`}
      </Button>
      <p className="min-h-16 max-w-lg text-sm text-fg-muted" aria-live="polite">
        {speaker.speaking ? speaker.caption : 'Captions appear here while the briefing plays.'}
      </p>
    </div>
  );
}

function Scheduler({ agents }: { agents: Agent[] }) {
  const briefing = useDb((s) => s.briefing);
  const setBriefing = useDb((s) => s.setBriefing);
  const [draft, setDraft] = useState(briefing);
  const toggleDay = (d: number) => setDraft((s) => ({ ...s, days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d].sort() }));
  const toggleCh = (c: Channel) => setDraft((s) => ({ ...s, channels: s.channels.includes(c) ? s.channels.filter((x) => x !== c) : [...s.channels, c] }));
  const valid = draft.days.length > 0 && draft.channels.length > 0;

  const next = (() => {
    const now = new Date();
    for (let i = 0; i < 8; i++) {
      const d = new Date(now.getTime() + i * 86_400_000);
      const [h, m] = draft.time.split(':').map(Number);
      d.setHours(h ?? 8, m ?? 0, 0, 0);
      if (draft.days.includes(d.getDay()) && d > now) return d;
    }
    return undefined;
  })();

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-display font-semibold">
        <CalendarClock className="size-5 text-cyan" aria-hidden /> Schedule
      </h2>
      <div className="mt-4 space-y-5">
        <div>
          <label htmlFor="brief-time" className="mb-1.5 block text-sm font-medium">
            Time
          </label>
          <Input id="brief-time" type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className="w-36 font-mono" />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Days</legend>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={draft.days.includes(d)}
                onClick={() => toggleDay(d)}
                className={cn('size-10 rounded-full border text-xs font-medium transition-colors', draft.days.includes(d) ? 'border-violet/60 bg-violet/20 text-fg' : 'border-line/10 text-fg-muted')}
              >
                {DAYS[d]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Channels</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['email', 'Email', Mail],
                ['whatsapp', 'WhatsApp', MessageCircle],
                ['pdf', 'PDF', FileDown],
                ['voice', 'Spoken', Mic],
              ] as const
            ).map(([c, label, Icon]) => (
              <button
                key={c}
                type="button"
                aria-pressed={draft.channels.includes(c)}
                onClick={() => toggleCh(c)}
                className={cn('flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors', draft.channels.includes(c) ? 'border-violet/50 bg-violet/10' : 'border-line/10 text-fg-muted')}
              >
                <Icon className="size-4" aria-hidden /> {label}
                {draft.channels.includes(c) && <Check className="ml-auto size-4 text-violet" aria-hidden />}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="brief-presenter" className="mb-1.5 block text-sm font-medium">
            Presenter
          </label>
          <select id="brief-presenter" value={draft.presenterId ?? ''} onChange={(e) => setDraft({ ...draft, presenterId: e.target.value || undefined })} className="h-10 w-full rounded-md border border-line/10 bg-surface/60 px-3 text-sm text-fg">
            <option value="">Automatic (Environment Analyst if hired)</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}, {a.role}
              </option>
            ))}
          </select>
        </div>
        {!valid && <p className="text-xs text-danger">Pick at least one day and one channel.</p>}
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() => {
              setBriefing(draft);
              toast.success('Schedule saved', { description: next ? `Next briefing: ${next.toLocaleString('en-GB', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}` : undefined });
            }}
          >
            Save schedule
          </Button>
          {next && <span className="text-xs text-fg-subtle">Next: {next.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      </div>
    </Card>
  );
}

export default function OutputsPage() {
  const metrics = useApi((o) => api.getDailyMetrics(o));
  const agents = useDb((s) => s.agents);
  const briefingCfg = useDb((s) => s.briefing);
  const [preview, setPreview] = useState<Preview>('email');
  const presenter = agents.find((a) => a.id === briefingCfg.presenterId) ?? agents.find((a) => a.id === 'agt-atlas') ?? agents[0];
  const b = useMemo(() => (metrics.data && presenter ? buildBriefing(metrics.data, presenter.name) : undefined), [metrics.data, presenter]);

  return (
    <Page wide>
      <PageHeader
        eyebrow="Briefings and outputs"
        title="Your morning briefing"
        description="What your agents tell you each day, and where it is delivered."
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <FileDown /> Export PDF
          </Button>
        }
      />
      {!presenter ? (
        <EmptyState title="No agents yet" description="Hire an agent to start receiving briefings." />
      ) : (
        <AsyncView state={metrics} loading={<LoadingState rows={3} />}>
          {() =>
            b && (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
                <div className="space-y-6">
                  {presenter.id !== 'agt-atlas' && (
                    <p className="rounded-md border border-line/10 bg-line/5 p-3 text-sm text-fg-muted">
                      Tip: hire an Environment Analyst in the builder for weather-aware briefings. {presenter.name} is presenting for now.
                    </p>
                  )}
                  <BriefingCard b={b} presenter={presenter} />
                  <Card className="p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-display font-semibold">Delivery preview</h2>
                      <div className="flex gap-1.5">
                        {briefingCfg.channels.map((c) => (
                          <Badge key={c} tone="cyan">
                            {{ email: 'Email', whatsapp: 'WhatsApp', pdf: 'PDF', voice: 'Spoken' }[c]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Tabs<Preview>
                      label="Delivery channel"
                      value={preview}
                      onChange={setPreview}
                      className="mb-5"
                      tabs={[
                        { value: 'email', label: 'Email', icon: Mail },
                        { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                        { value: 'pdf', label: 'PDF', icon: FileDown },
                        { value: 'voice', label: 'Spoken', icon: Mic },
                      ]}
                    />
                    {preview === 'email' && <EmailPreview b={b} presenter={presenter} />}
                    {preview === 'whatsapp' && <WhatsAppPreview b={b} presenter={presenter} />}
                    {preview === 'pdf' && (
                      <div className="flex flex-col items-center gap-3 py-6 text-center">
                        <FileDown className="size-10 text-violet" aria-hidden />
                        <p className="max-w-sm text-sm text-fg-muted">The PDF uses the briefing card above on a clean white page. Use your browser's "Save as PDF" in the print dialog.</p>
                        <Button variant="primary" onClick={() => window.print()}>
                          Export PDF
                        </Button>
                      </div>
                    )}
                    {preview === 'voice' && <VoicePreview b={b} presenter={presenter} />}
                  </Card>
                </div>
                <div>
                  <Scheduler agents={agents} />
                </div>
              </div>
            )
          }
        </AsyncView>
      )}
    </Page>
  );
}
