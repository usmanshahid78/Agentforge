import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCheck, Pencil, TrendingDown, TrendingUp, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ApprovalRequest } from '@/types';
import { api } from '@/api';
import { Avatar } from '@/components/avatar/Avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { EmptyState } from '@/components/ui/states';
import { useDb } from '@/store/db';
import { sfx } from '@/lib/sound';
import { cn, fmt } from '@/lib/utils';

const RISK = { low: 'success', medium: 'warning', high: 'danger' } as const;

export function ApprovalQueue({ onOpenTrace }: { onOpenTrace: (id: string) => void }) {
  const approvals = useDb((s) => s.approvals);
  const agents = useDb((s) => s.agents);
  const addEvent = useDb((s) => s.addEvent);
  const resolveApproval = useDb((s) => s.resolveApproval);
  const pending = approvals.filter((a) => a.status === 'pending');
  const resolved = approvals.filter((a) => a.status !== 'pending');
  const [focus, setFocus] = useState(0);
  const [editing, setEditing] = useState<ApprovalRequest>();
  const [editAction, setEditAction] = useState('');
  const [editNote, setEditNote] = useState('');
  const refs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    if (focus >= pending.length) setFocus(Math.max(0, pending.length - 1));
  }, [pending.length, focus]);

  const decide = useCallback(
    async (a: ApprovalRequest, status: 'approved' | 'rejected') => {
      const agent = agents.find((x) => x.id === a.agentId);
      sfx(status === 'approved' ? 'success' : 'click');
      await api.resolveApproval(a.id, status);
      addEvent({
        agentId: a.agentId,
        title: status === 'approved' ? `Approved: ${a.action}` : `Rejected: ${a.action}`,
        detail: status === 'approved' ? `${agent?.name ?? 'The agent'} will carry this out now.` : `${agent?.name ?? 'The agent'} will not do this and will learn from it.`,
        severity: status === 'approved' ? 'success' : 'warning',
      });
      toast[status === 'approved' ? 'success' : 'message'](status === 'approved' ? 'Approved' : 'Rejected', { description: a.action });
    },
    [agents, addEvent],
  );

  const openEdit = (a: ApprovalRequest) => {
    setEditing(a);
    setEditAction(a.action);
    setEditNote('');
  };

  // Keyboard: J/K move, A approve, R reject, E edit (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (editing || e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(t.tagName) || t.closest('[role="dialog"]')) return;
      const current = pending[focus];
      const k = e.key.toLowerCase();
      if (k === 'j' || k === 'arrowdown') {
        e.preventDefault();
        setFocus((f) => Math.min(pending.length - 1, f + 1));
      } else if (k === 'k' || k === 'arrowup') {
        e.preventDefault();
        setFocus((f) => Math.max(0, f - 1));
      } else if (current && k === 'a') void decide(current, 'approved');
      else if (current && k === 'r') void decide(current, 'rejected');
      else if (current && k === 'e') openEdit(current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, focus, decide, editing]);

  useEffect(() => {
    refs.current[focus]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focus]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
        <span>{pending.length} waiting</span>
        <span className="ml-auto hidden items-center gap-1.5 sm:flex">
          <Kbd>J</Kbd>
          <Kbd>K</Kbd> move <Kbd>A</Kbd> approve <Kbd>R</Kbd> reject <Kbd>E</Kbd> edit
        </span>
      </div>

      {pending.length === 0 ? (
        <EmptyState icon={CheckCheck} title="All caught up" description="New requests from your agents will appear here." />
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {pending.map((a, i) => {
              const agent = agents.find((x) => x.id === a.agentId);
              const positive = a.impactValue >= 0;
              return (
                <motion.li key={a.id} layout exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}>
                  <Card
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    onClick={() => setFocus(i)}
                    className={cn('p-5 transition-colors', i === focus && 'border-violet/50 shadow-glow-violet')}
                    aria-current={i === focus}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {agent && <Avatar agent={agent} size="sm" state={i === focus ? 'listening' : 'idle'} />}
                      <span className="text-sm font-medium">{agent?.name ?? 'Agent'}</span>
                      <span className="text-xs text-fg-subtle">{agent?.role}</span>
                      <Badge tone={RISK[a.risk]} className="ml-auto capitalize">
                        {a.risk} risk
                      </Badge>
                      <time className="font-mono text-[11px] text-fg-subtle" dateTime={a.createdAt}>
                        {fmt.ago(a.createdAt)}
                      </time>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-semibold">{a.action}</h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-md bg-line/[0.04] p-3">
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">Why</p>
                        <p className="text-sm">{a.reasoning}</p>
                      </div>
                      <div className="rounded-md bg-line/[0.04] p-3">
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">Expected impact</p>
                        <p className="flex items-start gap-1.5 text-sm">
                          {positive ? <TrendingUp className="mt-0.5 size-4 shrink-0 text-success" aria-label="gain" /> : <TrendingDown className="mt-0.5 size-4 shrink-0 text-warning" aria-label="cost" />}
                          {a.expectedImpact}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="success" size="sm" onClick={() => void decide(a, 'approved')}>
                        <Check /> Approve
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(a)}>
                        <Pencil /> Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => void decide(a, 'rejected')}>
                        <X /> Reject
                      </Button>
                      {a.traceId && (
                        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => a.traceId && onOpenTrace(a.traceId)}>
                          See reasoning
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {resolved.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-fg-muted">Decided recently ({resolved.length})</summary>
          <ul className="mt-2 space-y-1">
            {resolved.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                {a.status === 'approved' ? <Check className="size-4 text-success" aria-label="approved" /> : <X className="size-4 text-danger" aria-label="rejected" />}
                <span className="flex-1 text-fg-muted">{a.action}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit before approving</DialogTitle>
            <DialogDescription>Change what the agent will do. It will learn from your edit.</DialogDescription>
          </DialogHeader>
          <label htmlFor="edit-action" className="mb-1.5 block text-sm font-medium">
            Action
          </label>
          <Input id="edit-action" value={editAction} onChange={(e) => setEditAction(e.target.value)} />
          <label htmlFor="edit-note" className="mb-1.5 mt-4 block text-sm font-medium">
            Note to the agent (optional)
          </label>
          <Textarea id="edit-note" value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="e.g. Never go below £70 on headphones" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!editAction.trim()}
              onClick={() => {
                if (!editing) return;
                resolveApproval(editing.id, 'approved', { action: editAction.trim() });
                addEvent({ agentId: editing.agentId, title: `Approved with changes: ${editAction.trim()}`, detail: editNote || 'Owner edited the proposal before approving.', severity: 'success' });
                toast.success('Approved with your changes');
                setEditing(undefined);
              }}
            >
              Approve edited
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
