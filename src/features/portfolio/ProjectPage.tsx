import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, LayoutDashboard, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/avatar/Avatar';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/states';
import { leadOf } from '@/lib/portfolio';
import { industries } from '@/mocks/portfolio';
import { usePortfolio } from '@/store/portfolio';
import { cn } from '@/lib/utils';
import { CanvasView } from './CanvasView';
import { StatusBadge } from './shared';
import { TeamView } from './TeamView';

type Tab = 'team' | 'canvas';

export default function ProjectPage() {
  const { id } = useParams();
  const project = usePortfolio((s) => s.projects.find((p) => p.id === id));
  const hireLead = usePortfolio((s) => s.hireLead);
  const [params, setParams] = useSearchParams();
  // Held in state, seeded from ?tab=. The exiting page still sees the live URL during the route
  // transition; deriving the tab from it would switch tabs mid-exit and stall AnimatePresence.
  const [tab, setTab] = useState<Tab>(() => {
    const requested = params.get('tab');
    return requested === 'team' || requested === 'canvas' ? requested : project?.runs.length ? 'canvas' : 'team';
  });

  if (!project) {
    return (
      <Page>
        <EmptyState
          className="mt-16"
          title="Use case not found"
          description="It may have been removed, or the link is wrong."
          action={
            <Button variant="primary" asChild>
              <Link to="/portfolio">Back to portfolio</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  const industry = industries.find((i) => i.id === project.industryId);
  const lead = leadOf(project);

  // Choose the job → Hire → Build the team → Watch the work.
  const steps = [
    { label: `Hire ${lead?.name ?? 'the lead'}`, done: project.status !== 'not-started' },
    { label: 'Connect data', done: project.integrations.every((i) => i.status === 'connected') },
    { label: 'First run', done: project.runs.length > 0 },
  ];

  return (
    <Page wide>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 pt-2 text-sm text-fg-muted">
        <Link to="/portfolio" className="hover:text-fg">
          Portfolio
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link to={`/portfolio?p=${project.id}`} className="hover:text-fg">
          {industry?.name}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="text-fg" aria-current="page">
          {project.name}
        </span>
      </nav>

      <header className="mb-4 mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          {lead && <Avatar agent={lead} size="lg" showStatus />}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold md:text-3xl">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-1 max-w-2xl text-fg-muted">{project.summary}</p>
            {lead && <p className="mt-1 text-sm">Led by <span className="font-semibold">{lead.name}</span> · team of {project.team.length}</p>}
          </div>
        </div>
        <ol className="flex flex-wrap items-center gap-2" aria-label="Setup progress">
          {steps.map((s, i) => (
            <li key={s.label} className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs', s.done ? 'border-success/30 bg-success/10 text-success' : 'border-line/10 text-fg-muted')}>
              {s.done ? <Check className="size-3" aria-label="done" /> : <span className="font-mono">{i + 1}</span>} {s.label}
            </li>
          ))}
        </ol>
      </header>

      {project.status === 'not-started' && lead && (
        <Card className="mb-4 flex flex-col gap-3 border-warning/30 p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm">
            This is the team {lead.name} would lead. Hire {lead.name} to activate it, then connect data and run it from the canvas.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              hireLead(project.id);
              toast.success(`${lead.name} is hired for ${project.name}`);
            }}
          >
            <UserPlus /> Hire {lead.name}
          </Button>
        </Card>
      )}

      <Tabs<Tab>
        label="Project views"
        value={tab}
        onChange={(t) => {
          setTab(t);
          setParams({ tab: t }, { replace: true });
        }}
        tabs={[
          { value: 'team', label: 'Team', icon: Users, count: project.team.length },
          { value: 'canvas', label: 'Canvas', icon: LayoutDashboard },
        ]}
        className="mb-5"
      />

      {tab === 'team' ? <TeamView project={project} /> : <CanvasView project={project} />}
    </Page>
  );
}
