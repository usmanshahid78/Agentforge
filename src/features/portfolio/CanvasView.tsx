import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, CheckCircle2, Gauge, Hand, Pause, Play, Radar, Sparkles, Square, Target, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import type { Project, ProjectFinding, RunLogEntry } from '@/types';
import { Avatar } from '@/components/avatar/Avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkline } from '@/components/ui/sparkline';
import { buildRunScript, leadOf, openFindings, outcomeSentence } from '@/lib/portfolio';
import { useReducedMotion } from '@/lib/motion';
import { useDb } from '@/store/db';
import { usePortfolio } from '@/store/portfolio';
import { cn, fmt } from '@/lib/utils';
import { ParamEditor, SectionLabel } from './shared';

const STEP_MS = 900;

function ColumnHeader({ icon: Icon, title, subtitle, tone }: { icon: typeof Gauge; title: string; subtitle: string; tone: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className={cn('grid size-9 place-items-center rounded-md border border-line/10', tone)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div>
        <h2 className="font-display text-lg font-semibold leading-tight">{title}</h2>
        <p className="text-xs text-fg-muted">{subtitle}</p>
      </div>
    </div>
  );
}

/* --------------------------------- Cockpit --------------------------------- */

function Cockpit({ project, running, progress, onRun, onStop }: { project: Project; running: boolean; progress: number; onRun: () => void; onStop: () => void }) {
  const setPaused = usePortfolio((s) => s.setPaused);
  const notify = useDb((s) => s.notify);
  const lead = leadOf(project);
  const pending = project.integrations.filter((i) => i.status === 'pending');
  const last = project.runs[project.runs.length - 1];
  const hasRun = project.runs.length > 0;

  return (
    <Card className="flex flex-col p-5">
      <ColumnHeader icon={Gauge} title="Cockpit" subtitle="What you control" tone="bg-cyan/10 text-cyan" />

      <SectionLabel>Run</SectionLabel>
      {running ? (
        <div className="rounded-md border border-cyan/30 bg-cyan/5 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <span className="live-dot" /> {lead?.name}'s team is working
            </span>
            <span className="font-mono text-xs">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line/10">
            <motion.div className="h-full rounded-full bg-cyan" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.3 }} />
          </div>
          <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={onStop}>
            <Square /> Stop run
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          <Button variant="primary" onClick={onRun} disabled={project.status === 'not-started'}>
            <Play /> {hasRun ? `Run ${project.short} now` : 'Run the team for the first time'}
          </Button>
          {hasRun && (
            <Button variant="outline" onClick={() => setPaused(project.id, !project.paused)}>
              {project.paused ? (
                <>
                  <Play /> Resume team
                </>
              ) : (
                <>
                  <Pause /> Pause team
                </>
              )}
            </Button>
          )}
        </div>
      )}
      {project.status === 'not-started' && <p className="mt-2 text-xs text-fg-subtle">Hire {lead?.name} first.</p>}
      {pending.length > 0 && project.status !== 'not-started' && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-warning">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {pending.map((p) => p.name).join(', ')} not connected yet. The run will use sample data.
        </p>
      )}
      {last && !running && (
        <p className="mt-3 text-xs text-fg-muted">
          Last run {fmt.ago(last.startedAt)} · {(last.durationMs / 1000).toFixed(1)} s · {fmt.moneyPrecise(last.costUsd)}
        </p>
      )}

      <SectionLabel className="mt-6">Parameters</SectionLabel>
      <ParamEditor project={project} />
      <p className="mt-1.5 text-[11px] text-fg-subtle">Changes apply from the next run.</p>

      <div className="mt-auto pt-6">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => {
            notify({ title: `${project.name} escalated`, body: `${lead?.name} handed the latest result to a human reviewer.`, severity: 'warning', href: `/projects/${project.id}?tab=canvas` });
            toast('Escalated to a human reviewer');
          }}
        >
          <Hand /> Escalate to a human
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------ Observability ------------------------------ */

function LogEntry({ entry, project }: { entry: RunLogEntry; project: Project }) {
  const from = project.team.find((a) => a.id === entry.agentId);
  const to = project.team.find((a) => a.id === entry.toAgentId);
  return (
    <motion.li initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
      {from ? <Avatar agent={from} size="xs" className="mt-0.5" /> : <span className="size-6" />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
          <span className="font-semibold">{from?.name ?? 'Agent'}</span>
          {to && (
            <>
              <ArrowRight className="size-3 text-fg-subtle" aria-label="to" />
              <span className="font-semibold">{to.name}</span>
            </>
          )}
          {entry.tool && (
            <Badge tone="cyan" className="px-1.5 py-0 text-[10px]">
              <Wrench /> {entry.tool}
            </Badge>
          )}
          <span className="ml-auto font-mono text-[10px] text-fg-subtle">
            {new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <p
          className={cn(
            'mt-0.5 rounded-md px-2 py-1.5 text-sm',
            entry.kind === 'alert' ? 'border border-danger/30 bg-danger/5 text-fg' : entry.kind === 'result' ? 'border border-success/30 bg-success/5 font-medium' : entry.toAgentId ? 'bg-line/5' : 'text-fg-muted',
          )}
        >
          {entry.text}
        </p>
      </div>
    </motion.li>
  );
}

function Observability({ project, log, running }: { project: Project; log: RunLogEntry[]; running: boolean }) {
  const runs = project.runs;
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (running) listRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [log.length, running]);

  const avgMs = runs.length ? runs.reduce((s, r) => s + r.durationMs, 0) / runs.length : 0;
  const cost = runs.reduce((s, r) => s + r.costUsd, 0);
  const metrics = [
    { label: 'Runs', value: String(runs.length) },
    { label: 'Success', value: runs.length ? '100%' : '—' },
    { label: 'Avg. time', value: runs.length ? `${(avgMs / 1000).toFixed(1)} s` : '—' },
    { label: 'Cost', value: runs.length ? fmt.moneyPrecise(cost) : '—' },
  ];

  return (
    <Card className="flex flex-col p-5">
      <ColumnHeader icon={Radar} title="Observability" subtitle="What the agents are doing" tone="bg-violet/10 text-violet" />
      <dl className="mb-5 grid grid-cols-4 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-md border border-line/10 px-2 py-2 text-center">
            <dt className="text-[10px] text-fg-subtle">{m.label}</dt>
            <dd className="font-display text-sm font-semibold tabular-nums">{m.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mb-2 flex items-center justify-between">
        <SectionLabel className="mb-0">{running ? 'Live conversation' : 'Last run conversation'}</SectionLabel>
        {running && <Badge tone="success"><span className="live-dot !size-1.5" /> Live</Badge>}
      </div>
      {log.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-line/15 px-4 py-12 text-center text-sm text-fg-muted">
          <Radar className="mb-2 size-5 text-fg-subtle" aria-hidden />
          No runs yet. Start one from the cockpit to watch the team talk to each other and check the systems.
        </div>
      ) : (
        <ul ref={listRef} className="scrollbar-thin max-h-[520px] flex-1 space-y-3 overflow-y-auto pr-1" aria-live={running ? 'polite' : 'off'}>
          {log.map((e) => (
            <LogEntry key={e.id} entry={e} project={project} />
          ))}
        </ul>
      )}
    </Card>
  );
}

/* --------------------------------- Outcome --------------------------------- */

const SEVERITY_TONE = { info: 'cyan', warning: 'warning', critical: 'danger' } as const;

function FindingItem({ finding, projectId }: { finding: ProjectFinding; projectId: string }) {
  const resolve = usePortfolio((s) => s.resolveFinding);
  if (finding.status !== 'open') {
    return (
      <li className="flex items-center gap-2 rounded-md px-1 text-sm text-fg-muted">
        <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
        <span className="line-through decoration-fg-subtle/50">{finding.title}</span>
        <Badge className="ml-auto shrink-0">{finding.status === 'approved' ? 'Fix approved' : 'Escalated'}</Badge>
      </li>
    );
  }
  return (
    <li className="rounded-md border border-line/10 p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold">{finding.title}</span>
        <Badge tone={SEVERITY_TONE[finding.severity]} className="shrink-0 capitalize">
          {finding.severity}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-fg-muted">{finding.detail}</p>
      <p className="mt-2 text-xs">
        <span className="font-medium">Proposed fix: </span>
        {finding.proposedFix}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="success"
          onClick={() => {
            resolve(projectId, finding.id, 'approved');
            toast.success('Fix approved', { description: finding.proposedFix });
          }}
        >
          <CheckCircle2 /> Approve fix
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            resolve(projectId, finding.id, 'escalated');
            toast('Escalated to a human');
          }}
        >
          <Hand /> Escalate
        </Button>
      </div>
    </li>
  );
}

function Outcome({ project, running }: { project: Project; running: boolean }) {
  const lead = leadOf(project);
  const open = openFindings(project);
  const last = project.runs[project.runs.length - 1];
  const sentence = outcomeSentence(project);
  const clean = project.runs.length > 0 && open.length === 0;
  const thisWeek = project.trend.slice(-7).reduce((a, b) => a + b, 0);
  const lastWeek = project.trend.slice(0, 7).reduce((a, b) => a + b, 0);

  return (
    <Card glow className="flex flex-col p-5">
      <ColumnHeader icon={Target} title="Outcome" subtitle="What it means for the business" tone="bg-success/10 text-success" />

      <AnimatePresence mode="wait">
        <motion.div key={running ? 'running' : sentence} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {running ? (
            <p className="flex items-center gap-2 text-lg text-fg-muted">
              <Sparkles className="size-5 animate-pulse text-violet" aria-hidden /> {lead?.name} is discussing with the team…
            </p>
          ) : (
            <>
              <p className={cn('text-balance font-display text-2xl font-semibold leading-snug', clean ? 'text-success' : open.length ? 'text-fg' : 'text-fg-muted')}>
                {clean && <CheckCircle2 className="mr-2 inline size-6 -translate-y-0.5" aria-hidden />}
                {sentence}
              </p>
              {lead && last && (
                <div className="mt-3 flex items-center gap-2 text-xs text-fg-muted">
                  <Avatar agent={lead} size="xs" /> Written by {lead.name} · {fmt.ago(last.startedAt)}
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-line/10 p-3">
          <div className="text-xs text-fg-muted">{project.metric.label}</div>
          <div className="font-display text-xl font-semibold tabular-nums">{project.metric.value}</div>
        </div>
        <div className="rounded-md border border-line/10 p-3">
          <div className="text-xs text-fg-muted">Issues this week</div>
          <div className="font-display text-xl font-semibold tabular-nums">
            {thisWeek}
            {project.runs.length > 0 && (
              <span className={cn('ml-1.5 text-xs font-medium', thisWeek <= lastWeek ? 'text-success' : 'text-danger')}>
                {thisWeek <= lastWeek ? '↓' : '↑'} vs {lastWeek}
              </span>
            )}
          </div>
          <Sparkline data={project.trend} height={24} color={thisWeek <= lastWeek ? 'rgb(var(--c-success))' : 'rgb(var(--c-danger))'} />
        </div>
      </div>

      <SectionLabel className="mt-6">Next steps</SectionLabel>
      {project.findings.length === 0 ? (
        <p className="text-sm text-fg-muted">{project.runs.length ? 'Nothing to do. The team will keep watching.' : 'Results and proposed fixes appear here after the first run.'}</p>
      ) : (
        <ul className="space-y-2">
          {[...open, ...project.findings.filter((f) => f.status !== 'open')].map((f) => (
            <FindingItem key={f.id} finding={f} projectId={project.id} />
          ))}
        </ul>
      )}
    </Card>
  );
}

/* --------------------------------- Canvas ---------------------------------- */

export function CanvasView({ project }: { project: Project }) {
  const finishRun = usePortfolio((s) => s.finishRun);
  const notify = useDb((s) => s.notify);
  const reduced = useReducedMotion();
  const [live, setLive] = useState<RunLogEntry[] | null>(null);
  const [total, setTotal] = useState(1);
  const timer = useRef<number>();

  useEffect(() => () => window.clearInterval(timer.current), []);

  const run = () => {
    const steps = buildRunScript(project);
    const startedAt = Date.now();
    const log: RunLogEntry[] = [];
    setTotal(steps.length);
    setLive([]);
    let i = 0;
    timer.current = window.setInterval(() => {
      const step = steps[i++];
      if (step) {
        log.push({ ...step, id: `live-${startedAt}-${i}`, at: new Date().toISOString() });
        setLive([...log]);
        return;
      }
      window.clearInterval(timer.current);
      finishRun(project.id, log, startedAt);
      setLive(null);
      const latest = usePortfolio.getState().projects.find((p) => p.id === project.id);
      if (!latest) return;
      const open = openFindings(latest).length;
      const sentence = outcomeSentence(latest);
      if (open) notify({ title: `${latest.name}: ${open} issue${open === 1 ? '' : 's'} need approval`, body: sentence, severity: 'warning', href: `/projects/${latest.id}?tab=canvas` });
      toast[open ? 'warning' : 'success'](sentence);
    }, reduced ? STEP_MS / 3 : STEP_MS);
  };

  const stop = () => {
    window.clearInterval(timer.current);
    setLive(null);
    toast('Run stopped. Nothing was saved.');
  };

  const running = live !== null;
  const log = live ?? project.runs[project.runs.length - 1]?.log ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Cockpit project={project} running={running} progress={running ? (live?.length ?? 0) / total : 0} onRun={run} onStop={stop} />
      <Observability project={project} log={log} running={running} />
      <Outcome project={project} running={running} />
    </div>
  );
}

