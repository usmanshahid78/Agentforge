import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, CheckCheck, Coins, Mic, Sparkles, UserPlus, Wrench, Zap } from 'lucide-react';
import { api } from '@/api';
import { Page } from '@/components/layout/Page';
import { Core } from '@/components/three/Core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CountUp } from '@/components/ui/count-up';
import { AsyncView, LoadingState } from '@/components/ui/states';
import { useApi } from '@/lib/useApi';
import { staggerContainer, staggerItem, useReducedMotion } from '@/lib/motion';
import { cn, fmt } from '@/lib/utils';

const EXAMPLES = [
  'Analyse how weather affects my shop sales',
  'Watch my stock and reorder',
  'Answer customer messages',
];

/** Tiny looping illustration: nodes joining a team. */
function HireLoop() {
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 120 48" className="h-12 w-28" aria-hidden>
      <line x1="20" y1="24" x2="100" y2="24" stroke="rgb(var(--c-cyan) / 0.3)" strokeDasharray="3 4" />
      {[20, 60].map((x) => (
        <circle key={x} cx={x} cy={24} r={7} fill="rgb(var(--c-cyan) / 0.25)" stroke="rgb(var(--c-cyan))" />
      ))}
      <motion.circle
        cy={24}
        r={7}
        fill="rgb(var(--c-violet) / 0.35)"
        stroke="rgb(var(--c-violet))"
        initial={{ cx: 120, opacity: 0 }}
        animate={reduced ? { cx: 100, opacity: 1 } : { cx: [120, 100, 100], opacity: [0, 1, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.8 }}
      />
    </svg>
  );
}

/** Tiny looping illustration: building blocks snapping together. */
function BuildLoop() {
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 120 48" className="h-12 w-28" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={i}
          x={22 + i * 28}
          width={22}
          height={22}
          rx={5}
          fill={`rgb(var(--c-${i === 1 ? 'magenta' : 'violet'}) / 0.25)`}
          stroke={`rgb(var(--c-${i === 1 ? 'magenta' : 'violet'}))`}
          initial={{ y: 13 }}
          animate={reduced ? undefined : { y: [13, 4, 13] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.25, ease: 'easeInOut' }}
        />
      ))}
    </svg>
  );
}

function GlanceStats() {
  const state = useApi(async (o) => {
    const [agents, approvals, events] = await Promise.all([
      api.listAgents(o),
      api.listApprovals(o),
      api.listEvents(o),
    ]);
    const dayAgo = Date.now() - 86_400_000;
    return {
      active: agents.filter((a) => a.status === 'working').length,
      total: agents.length,
      tasksToday: events.filter((e) => new Date(e.at).getTime() > dayAgo).length * 7,
      approvals: approvals.filter((a) => a.status === 'pending').length,
      costToday: agents.reduce((s, a) => s + a.costPerDay, 0),
    };
  });

  return (
    <AsyncView state={state} loading={<LoadingState rows={4} className="lg:grid-cols-4" />}>
      {(s) => {
        const stats = [
          { label: 'Active agents', value: s.active, sub: `of ${s.total} hired`, icon: Bot, tone: 'text-cyan', live: true },
          { label: 'Tasks today', value: s.tasksToday, sub: 'across all departments', icon: CheckCheck, tone: 'text-violet' },
          { label: 'Approvals waiting', value: s.approvals, sub: 'need your decision', icon: Zap, tone: 'text-warning', href: '/observe#approvals' },
          { label: 'Cost today', value: s.costToday, sub: 'running total', icon: Coins, tone: 'text-magenta', money: true },
        ];
        return (
          <motion.div variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((st) => {
              const Icon = st.icon;
              const body = (
                <Card interactive={!!st.href} className="h-full p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-fg-muted">{st.label}</span>
                    <Icon className={cn('size-4', st.tone)} aria-hidden />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <CountUp
                      value={st.value}
                      format={st.money ? (n) => fmt.moneyPrecise(n) : undefined}
                      className="font-display text-3xl font-semibold tabular-nums"
                    />
                    {st.live && <span className="live-dot" aria-label="live" />}
                  </div>
                  <p className="mt-1 text-xs text-fg-subtle">{st.sub}</p>
                </Card>
              );
              return (
                <motion.div key={st.label} variants={staggerItem}>
                  {st.href ? <Link to={st.href} className="block h-full rounded-lg">{body}</Link> : body}
                </motion.div>
              );
            })}
          </motion.div>
        );
      }}
    </AsyncView>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');

  const start = (text: string) => navigate(`/build?q=${encodeURIComponent(text)}`);
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) start(prompt.trim());
  };

  return (
    <Page>
      <section className="flex flex-col items-center pb-16 pt-0 text-center md:pt-2">
        <Core className="size-60 md:size-80" />
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-cyan">Mission control</p>
        <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold leading-[1.05] md:text-6xl">
          Describe the job. <span className="text-gradient whitespace-nowrap">Get the agent.</span>
        </h1>
        <p className="mt-4 max-w-xl text-fg-muted md:text-lg">
          Tell us the problem in plain words. We interview you, write the job description, connect your data and hire
          the agent into your AI company.
        </p>

        <form data-tour="prompt" onSubmit={onSubmit} className="glass glow-border mt-8 flex w-full max-w-2xl items-center gap-2 rounded-xl p-2 pl-5">
          <Sparkles className="size-5 shrink-0 text-violet" aria-hidden />
          <label htmlFor="home-prompt" className="sr-only">
            What problem should your AI team solve?
          </label>
          <input
            id="home-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What problem should your AI team solve?"
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-fg-subtle focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button variant="ghost" size="icon" aria-label="Speak instead" onClick={() => navigate('/build?voice=1')}>
            <Mic />
          </Button>
          <Button type="submit" variant="primary" size="lg" className="px-5" disabled={!prompt.trim()}>
            Start <ArrowRight />
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => start(ex)}
              className="rounded-full border border-line/10 bg-surface/30 px-3.5 py-1.5 text-sm text-fg-muted backdrop-blur transition-colors hover:border-violet/40 hover:text-fg"
            >
              {ex}
            </button>
          ))}
        </div>

        <div data-tour="paths" className="mt-12 grid w-full max-w-4xl gap-4 text-left md:grid-cols-2">
          <Link to="/templates" className="rounded-lg">
            <Card interactive className="h-full p-6">
              <div className="flex items-center justify-between">
                <div className="grid size-11 place-items-center rounded-md bg-cyan/10 text-cyan">
                  <UserPlus className="size-5" aria-hidden />
                </div>
                <HireLoop />
              </div>
              <h2 className="mt-4 text-xl font-semibold">Hire a team member</h2>
              <p className="mt-1 text-sm text-fg-muted">
                Pick a role, answer a few questions, and hire the agent into a department. Guided and non-technical.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cyan">
                Browse roles <ArrowRight className="size-4" />
              </span>
            </Card>
          </Link>
          <Link to="/build?mode=builder" className="rounded-lg">
            <Card interactive className="h-full p-6">
              <div className="flex items-center justify-between">
                <div className="grid size-11 place-items-center rounded-md bg-violet/10 text-violet">
                  <Wrench className="size-5" aria-hidden />
                </div>
                <BuildLoop />
              </div>
              <h2 className="mt-4 text-xl font-semibold">Create your own agent</h2>
              <p className="mt-1 text-sm text-fg-muted">
                Start from a task and choose tools, data, instructions and outputs yourself. More control for power users.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet">
                Open builder <ArrowRight className="size-4" />
              </span>
            </Card>
          </Link>
        </div>
      </section>

      <section aria-labelledby="glance-title">
        <h2 id="glance-title" className="mb-4 text-xl font-semibold">
          Your AI company at a glance
        </h2>
        <GlanceStats />
      </section>
    </Page>
  );
}
