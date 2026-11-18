import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Lock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Agent, TrustLevel } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { reviews } from '@/mocks';
import { useDb } from '@/store/db';
import { evaluateMove, trackRecordFor, TRUST_META, TRUST_ORDER } from '@/lib/trust';
import { cn } from '@/lib/utils';

export function TrustLadder({ agent }: { agent: Agent }) {
  const events = useDb((s) => s.events);
  const setTrust = useDb((s) => s.setTrust);
  const addEvent = useDb((s) => s.addEvent);
  const [target, setTarget] = useState<TrustLevel>();
  const [override, setOverride] = useState(false);
  const record = trackRecordFor(agent, events, reviews, agent.id === 'agt-atlas' ? 91.6 : undefined);
  const current = TRUST_ORDER.indexOf(agent.trust);
  const move = target ? evaluateMove(agent.trust, target, record) : undefined;

  const confirm = () => {
    if (!target || !move) return;
    setTrust(agent.id, target);
    addEvent({
      agentId: agent.id,
      title: `${agent.name} ${move.direction === 'up' ? 'promoted' : 'moved down'} to ${TRUST_META[target].label}`,
      detail: move.direction === 'up' ? (move.recommended ? 'Track record met every requirement.' : 'Owner override: not every requirement was met.') : 'Owner reduced autonomy.',
      severity: move.direction === 'up' ? 'success' : 'warning',
    });
    toast.success(`${agent.name} is now ${TRUST_META[target].label}`);
    setTarget(undefined);
    setOverride(false);
  };

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display font-semibold">Trust ladder</h2>
        <span className="text-xs text-fg-subtle">Click a level to change it</span>
      </div>
      <ol className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Trust level">
        {TRUST_ORDER.map((t, i) => {
          const meta = TRUST_META[t];
          const active = t === agent.trust;
          const below = i < current;
          return (
            <li key={t}>
              <button
                type="button"
                aria-current={active ? 'step' : undefined}
                onClick={() => !active && setTarget(t)}
                className={cn(
                  'relative h-full w-full overflow-hidden rounded-md border p-3 text-left transition-colors',
                  active ? 'border-violet/60 bg-violet/15' : below ? 'border-success/20 bg-success/5 hover:border-success/40' : 'border-line/10 hover:border-line/25',
                )}
              >
                {active && <motion.span layoutId={`trust-${agent.id}`} className="absolute inset-x-0 top-0 h-0.5 bg-grad-brand" />}
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-fg-subtle">{i + 1}</span>
                  <span className="text-sm font-medium">{meta.label}</span>
                  {below && <CheckCircle2 className="ml-auto size-3.5 text-success" aria-label="earned" />}
                  {i > current && <Lock className="ml-auto size-3.5 text-fg-subtle" aria-label="locked" />}
                </div>
                <p className="mt-1 text-xs text-fg-muted">{meta.description}</p>
              </button>
            </li>
          );
        })}
      </ol>

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) { setTarget(undefined); setOverride(false); } }}>
        <DialogContent className="max-w-md">
          {target && move && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {move.direction === 'up' ? <ArrowUp className="size-5 text-violet" /> : <ArrowDown className="size-5 text-warning" />}
                  {move.direction === 'up' ? 'Promote' : 'Move'} {agent.name} to {TRUST_META[target].label}?
                </DialogTitle>
                <DialogDescription>
                  {TRUST_META[target].label}: {TRUST_META[target].description.toLowerCase()}.
                </DialogDescription>
              </DialogHeader>

              {move.direction === 'down' && <p className="text-sm text-fg-muted">{agent.name} will have less freedom immediately. Pending actions above the new level will come to you for approval.</p>}

              {move.direction === 'up' && (
                <>
                  {!move.allowed && (
                    <p className="flex gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden /> {move.reason}
                    </p>
                  )}
                  <h3 className="mb-2 mt-1 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">Track record</h3>
                  <ul className="space-y-2">
                    {move.requirements.map((r) => (
                      <li key={r.label} className="flex gap-2.5 text-sm">
                        {r.met ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="met" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label="not met" />}
                        <span>
                          <span className="font-medium">{r.label}.</span> <span className="text-fg-muted">{r.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {move.allowed && !move.recommended && (
                    <label className="mt-4 flex items-start gap-2.5 rounded-md border border-line/10 p-3 text-sm">
                      <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="mt-0.5 size-4 accent-violet" />
                      <span>I understand the track record does not support this yet, and I want to promote anyway.</span>
                    </label>
                  )}
                </>
              )}

              <DialogFooter>
                <Button variant="ghost" onClick={() => setTarget(undefined)}>
                  Cancel
                </Button>
                <Button
                  variant={move.direction === 'down' ? 'danger' : 'primary'}
                  disabled={!move.allowed || (move.direction === 'up' && !move.recommended && !override)}
                  onClick={confirm}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
