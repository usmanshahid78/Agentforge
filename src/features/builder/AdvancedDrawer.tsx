import { RefreshCw } from 'lucide-react';
import { Dialog, DialogDescription, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider, Switch } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { AVAILABLE_TOOLS, MODELS, useBuilder } from '@/store/builder';
import { cn } from '@/lib/utils';
import { systemPromptFromDraft } from './prompt';

export function AdvancedDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { advanced, setAdvanced, interview } = useBuilder();
  const prompt = advanced.systemPrompt || systemPromptFromDraft(interview.draft);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-lg" aria-describedby="adv-desc">
        <div className="border-b border-line/10 px-6 pb-4 pt-6">
          <DialogTitle>Advanced controls</DialogTitle>
          <DialogDescription id="adv-desc">
            For power users. Changes here override what the interview wrote.
          </DialogDescription>
        </div>
        <div className="scrollbar-thin flex-1 space-y-7 overflow-y-auto p-6">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="sys-prompt" className="text-sm font-medium">
                System prompt
              </label>
              <Button variant="ghost" size="sm" onClick={() => setAdvanced({ systemPrompt: '' })}>
                <RefreshCw /> Regenerate from JD
              </Button>
            </div>
            <Textarea
              id="sys-prompt"
              value={prompt}
              onChange={(e) => setAdvanced({ systemPrompt: e.target.value })}
              className="min-h-64 font-mono text-xs leading-relaxed"
            />
          </section>

          <section>
            <h3 className="mb-3 text-sm font-medium">Tools</h3>
            <ul className="space-y-2">
              {AVAILABLE_TOOLS.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-md border border-line/10 px-3 py-2.5">
                  <div className="flex-1">
                    <div className="text-sm">{t.label}</div>
                    <div className="text-xs text-fg-subtle">{t.description}</div>
                  </div>
                  <Switch
                    label={t.label}
                    checked={!!advanced.tools[t.id]}
                    onChange={(v) => setAdvanced({ tools: { ...advanced.tools, [t.id]: v } })}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-medium" id="model-label">
              Model
            </h3>
            <div role="radiogroup" aria-labelledby="model-label" className="space-y-2">
              {MODELS.map((m) => {
                const on = advanced.model === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setAdvanced({ model: m.id })}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                      on ? 'border-violet/50 bg-violet/10' : 'border-line/10 hover:border-line/20',
                    )}
                  >
                    <span className={cn('grid size-4 place-items-center rounded-full border', on ? 'border-violet' : 'border-line/30')}>
                      {on && <span className="size-2 rounded-full bg-violet" />}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm">{m.label}</span>
                      <span className="block font-mono text-[11px] text-fg-subtle">{m.id}</span>
                    </span>
                    <span className="text-xs text-fg-muted">{m.note}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <Slider
              label="Temperature"
              value={advanced.temperature}
              onChange={(v) => setAdvanced({ temperature: v })}
              min={0}
              max={1}
              step={0.05}
              format={(v) => v.toFixed(2)}
              leftLabel="Precise"
              rightLabel="Creative"
            />
          </section>
        </div>
      </SheetContent>
    </Dialog>
  );
}
