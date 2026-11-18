import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, RotateCcw, SlidersHorizontal, UserPlus, Wrench } from 'lucide-react';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/controls';
import { Dialog, DialogDescription, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { useBuilder, resolveScript } from '@/store/builder';
import type { AgentMode } from '@/types';
import { AdvancedDrawer } from './AdvancedDrawer';
import { ChatPane } from './ChatPane';
import { currentStep } from './interview';
import { JdCard } from './JdCard';
import { ProgressPanel } from './ProgressPanel';

export default function BuilderPage() {
  const [params, setParams] = useSearchParams();
  const { interview, config, mode, pending, begin, send, setMode } = useBuilder();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Start a fresh session when arriving with a new problem or template.
  useEffect(() => {
    const q = params.get('q') ?? undefined;
    const template = params.get('template') ?? undefined;
    const m = params.get('mode') === 'builder' ? 'builder' : undefined;
    const fresh = params.get('fresh') === '1';
    if (fresh) {
      begin({}, m ?? 'company');
    } else if (q || template) {
      if (q !== config.problem || template !== config.templateId) begin({ problem: q, templateId: template }, m ?? 'company');
    } else if (m) {
      setMode(m);
      if (m === 'builder') setAdvancedOpen(true);
    }
    if (q || template || m || fresh) setParams({}, { replace: true });
    // Run once per navigation; params are cleared immediately after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const script = resolveScript(config);
  const step = currentStep(script, interview);

  const onMode = (m: AgentMode) => {
    setMode(m);
    if (m === 'builder') setAdvancedOpen(true);
  };

  return (
    <Page wide className="flex flex-col lg:h-[calc(100dvh-var(--topbar-h))] lg:pb-6">
      <header className="mb-4 flex flex-wrap items-center gap-3 pt-2">
        <div className="mr-auto">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">Conversational builder</p>
          <h1 className="text-2xl font-semibold md:text-3xl">Describe the job. Get the agent.</h1>
        </div>
        <Segmented<AgentMode>
          label="Builder mode"
          value={mode}
          onChange={onMode}
          options={[
            { value: 'company', label: 'Hire a team member', icon: UserPlus },
            { value: 'builder', label: 'Create your own', icon: Wrench },
          ]}
        />
        <Button variant={mode === 'builder' ? 'outline' : 'ghost'} onClick={() => setAdvancedOpen(true)}>
          <SlidersHorizontal /> Advanced
        </Button>
        <Button variant="ghost" onClick={() => begin({}, mode)} aria-label="Start over">
          <RotateCcw /> <span className="hidden sm:inline">Start over</span>
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_340px]">
        <Card className="flex h-[calc(100dvh-22rem)] min-h-[380px] flex-col p-4 lg:h-auto lg:min-h-0">
          <ChatPane
            messages={interview.messages}
            step={step}
            clarifying={interview.status === 'clarifying'}
            onEvent={send}
            pending={pending}
            footer={
              <Button variant="outline" size="sm" className="w-full lg:hidden" onClick={() => setSheetOpen(true)}>
                <FileText /> View job description and progress
              </Button>
            }
          />
        </Card>

        <Card className="scrollbar-thin hidden min-h-0 overflow-y-auto p-5 lg:block">
          <JdCard draft={interview.draft} />
        </Card>

        <Card className="scrollbar-thin hidden min-h-0 overflow-y-auto p-5 lg:block">
          <ProgressPanel />
        </Card>
      </div>

      {/* Mobile: JD and progress live in a bottom sheet */}
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Job description and progress</DialogTitle>
          <DialogDescription className="sr-only">The live job description and build steps.</DialogDescription>
          <div className="scrollbar-thin space-y-6 overflow-y-auto p-5 pt-8">
            <JdCard draft={interview.draft} />
            <ProgressPanel />
          </div>
        </SheetContent>
      </Dialog>

      <AdvancedDrawer open={advancedOpen} onOpenChange={setAdvancedOpen} />
    </Page>
  );
}
