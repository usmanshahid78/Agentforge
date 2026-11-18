import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, Bell, CheckSquare, Coins, Gauge, Waypoints } from 'lucide-react';
import { api } from '@/api';
import { Page, PageHeader } from '@/components/layout/Page';
import { TraceTimeline } from '@/components/trace/TraceTimeline';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/controls';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AsyncView, LoadingState } from '@/components/ui/states';
import { useDb } from '@/store/db';
import { useApi } from '@/lib/useApi';
import { ActivityFeed } from './ActivityFeed';
import { ApprovalQueue } from './ApprovalQueue';
import { CostPanel } from './CostPanel';
import { AlertsPanel, PerformancePanel, TracesPanel } from './Panels';

type Tab = 'activity' | 'approvals' | 'performance' | 'cost' | 'traces' | 'alerts';
const TABS: Tab[] = ['activity', 'approvals', 'performance', 'cost', 'traces', 'alerts'];

function TraceDialog({ id, onClose }: { id?: string; onClose: () => void }) {
  const state = useApi((o) => (id ? api.getTrace(id, o) : Promise.resolve(undefined)), [id]);
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <AsyncView state={state} loading={<LoadingState rows={1} className="sm:grid-cols-1 lg:grid-cols-1" />}>
          {(t) =>
            t && (
              <>
                <DialogHeader>
                  <DialogTitle>{t.summary}</DialogTitle>
                  <DialogDescription>Step-by-step reasoning. Turn on Advanced for the technical view.</DialogDescription>
                </DialogHeader>
                <TraceTimeline steps={t.steps} />
              </>
            )
          }
        </AsyncView>
      </DialogContent>
    </Dialog>
  );
}

export default function ObservePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const hash = location.hash.replace('#', '') as Tab;
  const [tab, setTab] = useState<Tab>(TABS.includes(hash) ? hash : 'activity');
  const [traceId, setTraceId] = useState<string>();
  const pending = useDb((s) => s.approvals.filter((a) => a.status === 'pending').length);
  const alerts = useDb((s) => s.events.filter((e) => e.severity === 'critical').length);

  useEffect(() => {
    if (TABS.includes(hash)) setTab(hash);
  }, [hash]);

  const change = (t: Tab) => {
    setTab(t);
    navigate({ hash: t }, { replace: true });
  };

  return (
    <Page wide>
      <PageHeader eyebrow="Management view" title="Observe your team" description="What your agents did, what they are waiting on, how well they work and what it costs." />
      <Tabs<Tab>
        label="Observe sections"
        value={tab}
        onChange={change}
        className="mb-6"
        tabs={[
          { value: 'activity', label: 'Activity', icon: Activity },
          { value: 'approvals', label: 'Approvals', icon: CheckSquare, count: pending },
          { value: 'performance', label: 'Performance', icon: Gauge },
          { value: 'cost', label: 'Cost', icon: Coins },
          { value: 'traces', label: 'Traces', icon: Waypoints },
          { value: 'alerts', label: 'Alerts', icon: Bell, count: alerts },
        ]}
      />
      <div role="tabpanel" aria-label={tab}>
        {tab === 'activity' && (
          <Card className="p-4 md:p-5">
            <ActivityFeed onOpenTrace={setTraceId} />
          </Card>
        )}
        {tab === 'approvals' && <ApprovalQueue onOpenTrace={setTraceId} />}
        {tab === 'performance' && <PerformancePanel />}
        {tab === 'cost' && <CostPanel />}
        {tab === 'traces' && <TracesPanel />}
        {tab === 'alerts' && <AlertsPanel />}
      </div>
      <TraceDialog id={traceId} onClose={() => setTraceId(undefined)} />
    </Page>
  );
}
