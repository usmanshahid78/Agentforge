import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { roleTemplates } from '@/mocks';
import { TemplateCard } from './TemplateCard';

/** Role marketplace in a modal, plus a "write your own JD" path into the builder. */
export function HireDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const list = roleTemplates.filter((t) => `${t.title} ${t.summary} ${t.department}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>Hire an agent</DialogTitle>
          <DialogDescription>Pick a ready-made role, or write your own job description.</DialogDescription>
        </DialogHeader>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search roles" className="pl-9" aria-label="Search roles" autoFocus />
        </div>
        <div className="scrollbar-thin -mx-1 grid flex-1 gap-3 overflow-y-auto px-1 pb-1 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate('/build?fresh=1');
            }}
            className="text-left"
          >
            <Card interactive className="flex h-full flex-col items-start justify-center gap-3 border-dashed p-5">
              <span className="grid size-11 place-items-center rounded-md bg-violet/10 text-violet">
                <PenLine className="size-5" aria-hidden />
              </span>
              <h3 className="font-display text-lg font-semibold">Write your own JD</h3>
              <p className="text-sm text-fg-muted">Describe the job in your own words and the interviewer will shape it.</p>
            </Card>
          </button>
          {list.map((t) => (
            <TemplateCard key={t.id} template={t} compact onHired={() => onOpenChange(false)} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
