import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Bot, ChevronDown, Clock, LayoutGrid, Plus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { Industry, Project } from '@/types';
import { Avatar } from '@/components/avatar/Avatar';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { accentColor } from '@/lib/departments';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { STATUS_META, leadOf, openFindings, outcomeSentence } from '@/lib/portfolio';
import { industries } from '@/mocks/portfolio';
import { usePortfolio } from '@/store/portfolio';
import { cn } from '@/lib/utils';
import { IntegrationList, ParamEditor, SectionLabel, StatusBadge, StatusDot, StatusLegend } from './shared';

function ProjectTile({ project, selected, onSelect }: { project: Project; selected: boolean; onSelect: () => void }) {
  const m = STATUS_META[project.status];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${project.name}, ${m.label}, ${project.metric.label} ${project.metric.value}`}
      className={cn(
        'group flex h-[88px] flex-col justify-between rounded-md border bg-bg-elevated/70 p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card',
        m.ring,
        selected && 'border-success ring-2 ring-success/40',
      )}
    >
      <span className="flex items-start justify-between gap-1">
        <span className="line-clamp-2 text-xs font-semibold leading-tight">{project.short}</span>
        <StatusDot status={project.status} className="mt-0.5" />
      </span>
      <span>
        <span className="block font-display text-sm font-semibold tabular-nums">{project.metric.value}</span>
        <span className="block truncate text-[10px] text-fg-subtle">{project.metric.label}</span>
      </span>
    </button>
  );
}

function IndustryBox({ industry, projects, selectedId, onSelect }: { industry: Industry; projects: Project[]; selectedId?: string; onSelect: (p: Project) => void }) {
  const live = projects.filter((p) => p.status === 'live' || p.status === 'issue').length;
  const issues = projects.filter((p) => p.status === 'issue').length;
  return (
    <motion.section variants={staggerItem} aria-labelledby={`ind-${industry.id}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <h2 id={`ind-${industry.id}`} className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="size-2.5 rounded-full" style={{ background: accentColor(industry.accent) }} aria-hidden />
          {industry.name}
        </h2>
        {!industry.comingSoon && (
          <span className="text-xs text-fg-muted">
            {projects.length} use cases · {live} live
            {issues > 0 && <span className="text-danger"> · {issues} issue{issues === 1 ? '' : 's'}</span>}
          </span>
        )}
      </div>
      <Card className="p-3" style={{ borderColor: accentColor(industry.accent, 0.25) }}>
        {industry.comingSoon ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line/15 text-center">
            <Clock className="size-5 text-fg-subtle" aria-hidden />
            <p className="font-medium">Coming soon</p>
            <p className="max-w-[220px] text-xs text-fg-muted">{industry.description}. Use cases for this industry are being designed.</p>
            <Button size="sm" variant="outline" className="mt-1" onClick={() => toast('Thanks. We will let you know when Auto Industry opens.')}>
              <Plus /> Suggest a use case
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {projects.map((p) => (
              <ProjectTile key={p.id} project={p} selected={selectedId === p.id} onSelect={() => onSelect(p)} />
            ))}
          </div>
        )}
      </Card>
    </motion.section>
  );
}

/** Right panel: quick preview of the selected use case, not the full page. */
function ProjectPreview({ project }: { project: Project }) {
  const hireLead = usePortfolio((s) => s.hireLead);
  const lead = leadOf(project);
  const industry = industries.find((i) => i.id === project.industryId);
  const notStarted = project.status === 'not-started';

  return (
    <motion.div key={project.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between gap-2 rounded-md border border-success/40 bg-success/5 px-3 py-2">
        <span className="font-display font-semibold text-success">{project.short}</span>
        <ChevronDown className="size-4 text-success" aria-hidden />
      </div>
      <div>
        <p className="text-xs text-fg-subtle">{industry?.name}</p>
        <h2 className="font-display text-xl font-semibold">{project.name}</h2>
        <div className="mt-2">
          <StatusBadge status={project.status} />
        </div>
        <p className="mt-3 text-sm text-fg-muted">{project.summary}</p>
      </div>

      <p className={cn('rounded-md border px-3 py-2.5 text-sm font-medium', openFindings(project).length ? 'border-danger/30 bg-danger/5' : 'border-line/10 bg-line/5')}>
        {outcomeSentence(project)}
      </p>

      {lead && (
        <div>
          <SectionLabel>Assigned agent</SectionLabel>
          <div className="flex items-center gap-3">
            <Avatar agent={lead} size="md" showStatus />
            <div>
              <div className="font-semibold">{lead.name}</div>
              <div className="text-xs text-fg-muted">
                {lead.role} · team of {project.team.length}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <SectionLabel>Job description</SectionLabel>
        <p className="text-sm">{project.jd.mission}</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-fg-muted">
          {project.jd.responsibilities.slice(0, 3).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      <div>
        <SectionLabel>Parameters</SectionLabel>
        <ParamEditor project={project} editable={false} />
      </div>

      <div>
        <SectionLabel>Integrations</SectionLabel>
        <IntegrationList project={project} connectable={false} />
      </div>

      <div className="grid gap-2">
        {notStarted && lead ? (
          <Button
            variant="primary"
            onClick={() => {
              hireLead(project.id);
              toast.success(`${lead.name} is hired for ${project.name}`, { description: 'Next: connect data and check the team.' });
            }}
          >
            <UserPlus /> Hire {lead.name}
          </Button>
        ) : (
          <Button variant="primary" asChild>
            <Link to={`/projects/${project.id}?tab=canvas`}>
              Open canvas <ArrowRight />
            </Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link to={`/projects/${project.id}?tab=team`}>
            <Bot /> {notStarted ? 'Preview the team' : 'Open team'}
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}

function NeedsAttention({ projects, onSelect }: { projects: Project[]; onSelect: (p: Project) => void }) {
  const issues = projects.filter((p) => p.status === 'issue');
  const configuring = projects.filter((p) => p.status === 'configuring');
  return (
    <div>
      <SectionLabel>Needs attention</SectionLabel>
      {issues.length === 0 && configuring.length === 0 ? (
        <p className="text-sm text-fg-muted">Nothing needs you right now.</p>
      ) : (
        <ul className="space-y-1.5">
          {[...issues, ...configuring].slice(0, 5).map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onSelect(p)} className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-line/5">
                <StatusDot status={p.status} className="mt-1.5" />
                <span className="min-w-0">
                  <span className="block font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-fg-muted">
                    {p.status === 'issue' ? `${openFindings(p).length} open finding(s)` : 'Finish setup and run once'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PortfolioPage() {
  const projects = usePortfolio((s) => s.projects);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const selected = projects.find((p) => p.id === params.get('p'));

  const select = (p: Project) => {
    // Small screens have no side panel: go straight to the project.
    if (!window.matchMedia('(min-width: 1024px)').matches) return navigate(`/projects/${p.id}`);
    setParams(selected?.id === p.id ? {} : { p: p.id }, { replace: true });
  };

  const live = projects.filter((p) => p.status === 'live' || p.status === 'issue').length;
  const issues = projects.filter((p) => p.status === 'issue').length;
  const agents = projects.filter((p) => p.status !== 'not-started').reduce((n, p) => n + p.team.length, 0);

  return (
    <Page wide>
      <header className="mb-6 flex flex-col gap-4 pt-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-cyan">Portfolio</p>
          <h1 className="text-3xl font-semibold md:text-4xl">Every problem your agents can solve</h1>
          <p className="mt-2 text-fg-muted">Pick an industry, then a use case. Hire its lead agent, build the team and watch them work.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 md:flex">
          {[
            { label: 'Live use cases', value: live, icon: LayoutGrid },
            { label: 'Issues', value: issues, icon: AlertTriangle, tone: issues ? 'text-danger' : undefined },
            { label: 'Agents at work', value: agents, icon: Bot },
          ].map((s) => (
            <Card key={s.label} className="flex items-center gap-3 px-3 py-2.5 md:px-4">
              <s.icon className={cn('hidden size-4 text-fg-muted sm:block', s.tone)} aria-hidden />
              <div>
                <div className={cn('font-display text-xl font-semibold tabular-nums', s.tone)}>{s.value}</div>
                <div className="text-[11px] text-fg-subtle">{s.label}</div>
              </div>
            </Card>
          ))}
        </div>
      </header>

      <StatusLegend className="mb-4" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid content-start gap-6 xl:grid-cols-2">
          {industries.map((ind) => (
            <IndustryBox key={ind.id} industry={ind} projects={projects.filter((p) => p.industryId === ind.id)} selectedId={selected?.id} onSelect={select} />
          ))}
        </motion.div>

        <aside className="hidden lg:block" aria-label="Use case details">
          <div className="sticky top-20 space-y-4">
            <Card className="scrollbar-thin max-h-[calc(100dvh-14rem)] overflow-y-auto p-5">
              {selected ? (
                <ProjectPreview project={selected} />
              ) : (
                <div className="py-10 text-center">
                  <LayoutGrid className="mx-auto size-6 text-fg-subtle" aria-hidden />
                  <p className="mt-3 font-medium">Select a use case</p>
                  <p className="mt-1 text-sm text-fg-muted">Its agent, job description, parameters and integrations appear here.</p>
                </div>
              )}
            </Card>
            <Card className="p-4">
              <NeedsAttention projects={projects} onSelect={select} />
            </Card>
          </div>
        </aside>
      </div>
    </Page>
  );
}
