import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Radio } from 'lucide-react';
import type { ActivityEvent, Severity } from '@/types';
import { Avatar } from '@/components/avatar/Avatar';
import { Segmented } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/states';
import { useDb } from '@/store/db';
import { fmt } from '@/lib/utils';
import { useLiveFeed } from './liveFeed';
import { SeverityBadge } from './SeverityBadge';

type Filter = 'all' | Severity;

export function ActivityFeed({ onOpenTrace, limit }: { onOpenTrace: (traceId: string) => void; limit?: number }) {
  const events = useDb((s) => s.events);
  const agents = useDb((s) => s.agents);
  const [filter, setFilter] = useState<Filter>('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [live, setLive] = useState(true);
  useLiveFeed(live);

  const list = useMemo(
    () => events.filter((e) => (filter === 'all' || e.severity === filter) && (agentFilter === 'all' || e.agentId === agentFilter)).slice(0, limit ?? 60),
    [events, filter, agentFilter, limit],
  );

  const row = (e: ActivityEvent) => {
    const agent = agents.find((a) => a.id === e.agentId);
    const clickable = !!e.traceId;
    const content = (
      <>
        {agent ? <Avatar agent={agent} size="sm" /> : <span className="size-8 rounded-full bg-line/10" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="text-sm font-medium">{agent?.name ?? 'Former agent'}</span>
            <span className="text-sm text-fg">{e.title}</span>
          </div>
          <p className="text-sm text-fg-muted">{e.detail}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <SeverityBadge severity={e.severity} />
          <time className="font-mono text-[11px] text-fg-subtle" dateTime={e.at}>
            {fmt.ago(e.at)}
          </time>
        </div>
        {clickable && <ChevronRight className="size-4 shrink-0 self-center text-fg-subtle" aria-hidden />}
      </>
    );
    return (
      <motion.li key={e.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        {clickable ? (
          <button type="button" onClick={() => e.traceId && onOpenTrace(e.traceId)} className="flex w-full gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-line/[0.04]" aria-label={`${e.title}, open trace`}>
            {content}
          </button>
        ) : (
          <div className="flex gap-3 px-2 py-3">{content}</div>
        )}
      </motion.li>
    );
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented<Filter>
          label="Severity"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'critical', label: 'Critical' },
            { value: 'warning', label: 'Warnings' },
            { value: 'success', label: 'Done' },
          ]}
        />
        <label className="sr-only" htmlFor="feed-agent">
          Agent
        </label>
        <select id="feed-agent" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="h-9 rounded-md border border-line/10 bg-surface/60 px-2 text-sm text-fg">
          <option value="all">All agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setLive((l) => !l)}
          aria-pressed={live}
          className="ml-auto flex items-center gap-2 rounded-full border border-line/10 px-3 py-1.5 text-xs text-fg-muted hover:text-fg"
        >
          {live ? <span className="live-dot" /> : <Radio className="size-3.5" />} {live ? 'Live' : 'Paused'}
        </button>
      </div>
      {list.length === 0 ? (
        <EmptyState title="No activity matches" description="Try another filter." />
      ) : (
        <ul className="divide-y divide-line/5" aria-live="polite">
          <AnimatePresence initial={false}>{list.map(row)}</AnimatePresence>
        </ul>
      )}
    </div>
  );
}
