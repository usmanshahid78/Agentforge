import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, UserX } from 'lucide-react';
import { api, ApiError } from '@/api';
import { Avatar } from '@/components/avatar/Avatar';
import { TalkPanel } from '@/components/avatar/TalkPanel';
import { Page } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/controls';
import { Dialog, DialogDescription, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useDb } from '@/store/db';
import { departmentById } from '@/lib/departments';
import { TRUST_META } from '@/lib/trust';
import { useApi } from '@/lib/useApi';
import { fmt } from '@/lib/utils';
import { DataTab, EventList, JdTab, OverviewTab, PermissionsTab, ReviewTab, SettingsTab } from './AgentTabs';
import { TrustLadder } from './TrustLadder';

type Tab = 'overview' | 'jd' | 'permissions' | 'data' | 'activity' | 'review' | 'settings';

const STATUS_LABEL = { working: 'Working', idle: 'Idle', paused: 'Paused', error: 'Error', draft: 'Draft' } as const;

export default function AgentPage() {
  const { id = '' } = useParams();
  const state = useApi((o) => api.getAgent(id, o), [id]);
  const [tab, setTab] = useState<Tab>('overview');
  const [talkOpen, setTalkOpen] = useState(false);
  // The store copy stays live after edits; the API copy drives loading and errors.
  const live = useDb((s) => s.agents.find((a) => a.id === id));
  const agent = state.data ? live ?? state.data : undefined;
  const removed = state.data && !live;

  if (state.loading && !state.data) {
    return (
      <Page>
        <Skeleton className="mb-6 mt-6 h-40 w-full" />
        <LoadingState rows={3} />
      </Page>
    );
  }
  if ((state.error instanceof ApiError && state.error.code === 'not-found') || removed) {
    return (
      <Page className="pt-10">
        <EmptyState
          icon={UserX}
          title="No agent here"
          description="This agent may have been let go, or the link is out of date."
          action={
            <Button variant="outline" asChild>
              <Link to="/company">
                <ArrowLeft /> Back to company
              </Link>
            </Button>
          }
        />
      </Page>
    );
  }
  if (state.error || !agent) {
    return (
      <Page className="pt-10">
        <ErrorState error={state.error} onRetry={state.refetch} />
      </Page>
    );
  }

  const dept = departmentById(agent.departmentId);
  const trust = TRUST_META[agent.trust];

  return (
    <Page wide>
      <Link to="/company" className="mb-3 mt-2 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Company
      </Link>

      <Card glow className="mb-6 overflow-hidden p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <Avatar agent={agent} size="xl" showStatus allow3d />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">Employee file</p>
            <h1 className="mt-1 text-3xl font-semibold md:text-4xl">{agent.name}</h1>
            <p className="text-fg-muted">
              {agent.role} · {dept?.name}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={agent.status === 'working' ? 'success' : agent.status === 'paused' ? 'warning' : 'neutral'}>
                {agent.status === 'working' && <span className="live-dot !size-1.5" />}
                {STATUS_LABEL[agent.status]}
              </Badge>
              <Badge tone={trust.tone}>{trust.label}</Badge>
              <Badge>{agent.mode === 'builder' ? 'Builder mode' : 'Company mode'}</Badge>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-4 md:w-96">
            {[
              ['Tenure', fmt.tenure(agent.hiredAt)],
              ['Cost / day', fmt.moneyPrecise(agent.costPerDay)],
              ['Value / day', agent.valuePerDay ? fmt.money(agent.valuePerDay) : 'Measuring'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-fg-subtle">{k}</dt>
                <dd className="mt-1 font-display text-lg font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-6 border-t border-line/5 pt-5">
          <TrustLadder agent={agent} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0 p-5">
          <Tabs<Tab>
            label="Agent sections"
            value={tab}
            onChange={setTab}
            className="mb-5"
            tabs={[
              { value: 'overview', label: 'Overview' },
              { value: 'jd', label: 'JD' },
              { value: 'permissions', label: 'Permissions' },
              { value: 'data', label: 'Data access' },
              { value: 'activity', label: 'Activity' },
              { value: 'review', label: 'Review' },
              { value: 'settings', label: 'Settings' },
            ]}
          />
          <div role="tabpanel" aria-label={tab}>
            {tab === 'overview' && <OverviewTab agent={agent} />}
            {tab === 'jd' && <JdTab agent={agent} />}
            {tab === 'permissions' && <PermissionsTab agent={agent} />}
            {tab === 'data' && <DataTab agent={agent} />}
            {tab === 'activity' && <EventList agentId={agent.id} />}
            {tab === 'review' && <ReviewTab agent={agent} />}
            {tab === 'settings' && <SettingsTab agent={agent} />}
          </div>
        </Card>

        <Card className="sticky top-20 hidden h-[calc(100dvh-7rem)] max-h-[760px] p-5 lg:block">
          <TalkPanel agent={agent} />
        </Card>
      </div>

      <Button variant="primary" className="fixed bottom-24 left-4 z-30 rounded-full shadow-glow-violet lg:hidden" onClick={() => setTalkOpen(true)}>
        <MessageCircle /> Talk to {agent.name}
      </Button>
      <Dialog open={talkOpen} onOpenChange={setTalkOpen}>
        <SheetContent side="bottom" className="h-[85vh]">
          <DialogTitle className="sr-only">Talk to {agent.name}</DialogTitle>
          <DialogDescription className="sr-only">Chat and voice conversation</DialogDescription>
          <div className="flex h-full flex-col p-5 pt-8">
            <TalkPanel agent={agent} compact />
          </div>
        </SheetContent>
      </Dialog>
    </Page>
  );
}
