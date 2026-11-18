import { useState } from 'react';
import { AlertOctagon, ArrowRightLeft, Brain, CheckCircle2, Database, Wrench, type LucideIcon } from 'lucide-react';
import type { TraceStep, TraceStepKind } from '@/types';
import { Switch } from '@/components/ui/controls';
import { cn } from '@/lib/utils';

const KIND: Record<TraceStepKind, { icon: LucideIcon; label: string; cls: string }> = {
  data: { icon: Database, label: 'Data', cls: 'text-cyan border-cyan/30 bg-cyan/10' },
  tool: { icon: Wrench, label: 'Tool', cls: 'text-violet border-violet/30 bg-violet/10' },
  think: { icon: Brain, label: 'Reasoning', cls: 'text-magenta border-magenta/30 bg-magenta/10' },
  decision: { icon: CheckCircle2, label: 'Decision', cls: 'text-success border-success/30 bg-success/10' },
  handoff: { icon: ArrowRightLeft, label: 'Handoff', cls: 'text-cyan border-cyan/30 bg-cyan/10' },
  error: { icon: AlertOctagon, label: 'Problem', cls: 'text-danger border-danger/30 bg-danger/10' },
};

/**
 * Step-by-step reasoning trace. Plain-language by default; the "Advanced"
 * toggle reveals tool names, inputs/outputs, tokens and latency.
 */
export function TraceTimeline({ steps, defaultAdvanced = false }: { steps: TraceStep[]; defaultAdvanced?: boolean }) {
  const [advanced, setAdvanced] = useState(defaultAdvanced);
  const totalMs = steps.reduce((s, x) => s + x.latencyMs, 0);
  const totalTokens = steps.reduce((s, x) => s + (x.tokens ?? 0), 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[11px] text-fg-subtle">
          {steps.length} steps · {(totalMs / 1000).toFixed(1)} s{advanced && totalTokens ? ` · ${totalTokens.toLocaleString()} tokens` : ''}
        </p>
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          Advanced
          <Switch label="Show technical details" checked={advanced} onChange={setAdvanced} />
        </label>
      </div>
      <ol className="relative space-y-3">
        {steps.map((s, i) => {
          const k = KIND[s.kind];
          const Icon = k.icon;
          return (
            <li key={s.id} className="relative flex gap-3">
              {i < steps.length - 1 && <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-12px)] w-px bg-line/10" />}
              <span className={cn('relative z-10 grid size-8 shrink-0 place-items-center rounded-full border', k.cls)}>
                <Icon className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{k.label}</span>
                </div>
                <p className="text-sm text-fg-muted">{s.detail}</p>
                {advanced && (
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-md bg-bg/60 p-2.5 font-mono text-[11px]">
                    {s.tool && (
                      <>
                        <dt className="text-fg-subtle">tool</dt>
                        <dd className="text-cyan">{s.tool}</dd>
                      </>
                    )}
                    {s.input && (
                      <>
                        <dt className="text-fg-subtle">input</dt>
                        <dd className="break-all">{s.input}</dd>
                      </>
                    )}
                    {s.output && (
                      <>
                        <dt className="text-fg-subtle">output</dt>
                        <dd className="break-all">{s.output}</dd>
                      </>
                    )}
                    <dt className="text-fg-subtle">latency</dt>
                    <dd>{s.latencyMs} ms</dd>
                    {s.tokens !== undefined && (
                      <>
                        <dt className="text-fg-subtle">tokens</dt>
                        <dd>{s.tokens.toLocaleString()}</dd>
                      </>
                    )}
                  </dl>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
