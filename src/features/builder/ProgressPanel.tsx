import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Hammer, Loader2, PartyPopper, Plug, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Meter, ProgressRing } from '@/components/ui/controls';
import { dailyMetrics, roleTemplates } from '@/mocks';
import { useBuilder } from '@/store/builder';
import { useDb } from '@/store/db';
import { agentFromDraft, commitHire, hireTemplate, isHired } from '@/lib/hire';
import { computeReadiness, missingKeys } from '@/lib/readiness';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { completeness } from './interview';

const STAGES = ['Understand', 'Define JD', 'Connect data', 'Build', 'Test', 'Deploy'] as const;

const BUILD_LOG = [
  'Compiling job description into instructions',
  'Granting read access to connected sources',
  'Wiring tools: forecasting, data queries, delivery',
  'Setting guardrails from limits and spending cap',
  'Creating avatar and voice',
  'Running safety checks',
];

function BuildLog({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (n >= BUILD_LOG.length) {
      const t = window.setTimeout(onDone, 400);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setN((x) => x + 1), reduced ? 60 : 480);
    return () => window.clearTimeout(t);
  }, [n, onDone, reduced]);
  return (
    <ol className="space-y-1.5 rounded-md bg-bg/60 p-3 font-mono text-[11px]" aria-live="polite">
      {BUILD_LOG.map((line, i) => (
        <li key={line} className={cn('flex items-center gap-2', i < n ? 'text-success' : i === n ? 'text-fg' : 'text-fg-subtle/50')}>
          {i < n ? <Check className="size-3" /> : i === n ? <Loader2 className="size-3 animate-spin" /> : <span className="size-3" />}
          {line}
        </li>
      ))}
    </ol>
  );
}

export function ProgressPanel() {
  const navigate = useNavigate();
  const { interview, config, built, tested, hiredAgentId, mode, advanced, markBuilt, markHired } = useBuilder();
  const connectors = useDb((s) => s.connectors);
  const agents = useDb((s) => s.agents);
  const [connecting, setConnecting] = useState<string[]>([]);
  const [building, setBuilding] = useState(false);

  const draft = interview.draft;
  const done = interview.status === 'complete';
  const required = draft.connectorKeys ?? [];
  const missing = missingKeys(required, connectors);
  const readiness = computeReadiness(required, connectors, dailyMetrics);
  const pct = completeness(draft);
  const hired = !!hiredAgentId && agents.some((a) => a.id === hiredAgentId);

  const stage = hired ? 6 : tested ? 5 : built ? 4 : done && missing.length === 0 && required.length ? 3 : done ? 2 : interview.stepIndex > 0 ? 1 : 0;

  const connect = async (ids: string[]) => {
    setConnecting((c) => [...c, ...ids]);
    try {
      const results = await Promise.all(ids.map((id) => api.connect(id)));
      toast.success(`${results.map((r) => r.name).join(' and ')} connected`);
    } finally {
      setConnecting((c) => c.filter((x) => !ids.includes(x)));
    }
  };

  const hire = () => {
    const agent = agentFromDraft(draft, { templateId: config.templateId, mode, advanced });
    commitHire(agent);
    markHired(agent.id);
    toast.success(`${agent.name} hired into ${agent.jd.department.replace('-', ' ')}`, {
      description: 'Starting in Shadow mode: recommends only.',
    });
  };

  const growTeam = () => {
    const ids = ['tpl-stock', 'tpl-promo'];
    const hiredNow = ids
      .map((id) => roleTemplates.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .filter((t) => !isHired(t.id === 'tpl-stock' ? 'agt-vega' : 'agt-pulse'))
      .map((t) => hireTemplate(t));
    if (hiredNow.length) toast.success(`${hiredNow.map((a) => a.name).join(' and ')} joined your company`);
    navigate('/company');
  };

  const hiredAgent = agents.find((a) => a.id === hiredAgentId);
  const teamGrown = isHired('agt-vega') && isHired('agt-pulse');

  return (
    <aside aria-label="Build progress" className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex items-center gap-4">
        <ProgressRing value={pct} label="Job description completeness" size={88}>
          <div>
            <div className="font-display text-xl font-semibold tabular-nums">{pct}%</div>
            <div className="text-[10px] uppercase tracking-wider text-fg-subtle">JD</div>
          </div>
        </ProgressRing>
        <div className="flex-1">
          <Meter label="Data readiness" value={required.length ? readiness.score : 0} />
          <p className="mt-1.5 text-xs text-fg-subtle">
            {required.length ? `${required.length - missing.length} of ${required.length} sources ready` : 'Sources appear after the data question'}
          </p>
        </div>
      </div>

      <ol className="relative space-y-1" aria-label="Build steps">
        {STAGES.map((s, i) => {
          const state = i < stage ? 'done' : i === stage ? 'active' : 'todo';
          return (
            <li key={s} className="relative flex items-center gap-3 py-1.5" aria-current={state === 'active' ? 'step' : undefined}>
              {i < STAGES.length - 1 && (
                <span
                  aria-hidden
                  className={cn('absolute left-[13px] top-[30px] h-[calc(100%-14px)] w-px', i < stage ? 'bg-success/60' : 'bg-line/10')}
                />
              )}
              <span
                className={cn(
                  'relative grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors',
                  state === 'done' && 'border-success/50 bg-success/15 text-success',
                  state === 'active' && 'border-violet bg-violet/20 text-fg shadow-glow-violet',
                  state === 'todo' && 'border-line/15 text-fg-subtle',
                )}
              >
                {state === 'done' ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn('text-sm', state === 'todo' ? 'text-fg-subtle' : 'font-medium')}>{s}</span>
              {state === 'done' && <span className="sr-only">(done)</span>}
            </li>
          );
        })}
      </ol>

      {missing.length > 0 && (
        <div>
          <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Still needed</h3>
          <ul className="space-y-2">
            {missing.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-md border border-warning/20 bg-warning/5 px-3 py-2">
                <span className="size-1.5 rounded-full bg-warning" aria-hidden />
                <span className="flex-1 text-sm">{c.name}</span>
                <Button size="sm" variant="ghost" onClick={() => connect([c.id])} disabled={connecting.includes(c.id)}>
                  {connecting.includes(c.id) ? <Loader2 className="animate-spin" /> : 'Connect'}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto space-y-2">
        <AnimatePresence mode="wait">
          <motion.div key={stage + String(building)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            {stage < 2 && <p className="text-sm text-fg-muted">Answer the questions on the left. The job description writes itself as you go.</p>}

            {stage === 2 && (
              <>
                <p className="text-sm text-fg-muted">
                  {required.length
                    ? `Connect ${missing.length} more source${missing.length === 1 ? '' : 's'} so ${draft.name ?? 'your agent'} can see the full picture.`
                    : 'Choose data sources to continue.'}
                </p>
                <Button variant="primary" className="w-full" onClick={() => connect(missing.map((m) => m.id))} disabled={connecting.length > 0 || !missing.length}>
                  {connecting.length ? <Loader2 className="animate-spin" /> : <Plug />}
                  Connect {missing.map((m) => m.name.split(' ')[0]).join(' & ')}
                </Button>
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link to="/connect">Open all data sources</Link>
                </Button>
              </>
            )}

            {stage === 3 &&
              (building ? (
                <BuildLog
                  onDone={() => {
                    setBuilding(false);
                    markBuilt();
                    toast.success(`${draft.name ?? 'Agent'} is built`, { description: 'Next, test it on your past data.' });
                  }}
                />
              ) : (
                <>
                  {readiness.limitsAccuracy && (
                    <p className="rounded-md border border-warning/20 bg-warning/5 p-2.5 text-xs text-fg-muted">
                      Some data has gaps. {draft.name ?? 'The agent'} will work, and the test will show the effect honestly.
                    </p>
                  )}
                  <Button variant="primary" className="w-full" onClick={() => setBuilding(true)}>
                    <Hammer /> Build {draft.name ?? 'agent'}
                  </Button>
                </>
              ))}

            {stage === 4 && (
              <>
                <p className="text-sm text-fg-muted">Replay the last 60 days and see what {draft.name} would have said, before trusting it.</p>
                <Button variant="primary" className="w-full" onClick={() => navigate('/test?agent=draft')}>
                  Run backtest <ArrowRight />
                </Button>
              </>
            )}

            {stage === 5 && (
              <>
                <p className="text-sm text-fg-muted">
                  Tested and ready. {draft.name} starts in Shadow mode with a daily briefing at {draft.schedule?.includes('08:00') ? '08:00' : 'the time you chose'}.
                </p>
                <Button variant="primary" className="w-full" onClick={hire}>
                  <UserPlus /> Hire {draft.name} into {draft.department === 'operations' ? 'Operations' : 'the team'}
                </Button>
              </>
            )}

            {stage === 6 && hiredAgent && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-md border border-success/25 bg-success/10 p-3 text-sm">
                  <PartyPopper className="size-4 text-success" aria-hidden />
                  <span>
                    <strong>{hiredAgent.name}</strong> is on the team.
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/agents/${hiredAgent.id}`}>View profile</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/outputs">First briefing</Link>
                  </Button>
                </div>
                {!teamGrown && hiredAgent.id === 'agt-atlas' && (
                  <div className="rounded-md border border-violet/25 bg-violet/5 p-3">
                    <p className="text-sm">
                      <strong>Grow the team:</strong> a Stock Planner and a Promo Strategist can act on {hiredAgent.name}'s forecasts.
                    </p>
                    <Button variant="primary" size="sm" className="mt-2 w-full" onClick={growTeam}>
                      <Users /> Hire both
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
}
