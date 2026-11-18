import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Send, X } from 'lucide-react';
import { coreSystemPrompt, generate, reportFallback, type ChatMessage } from '@/ai';
import { ALL_NAV } from '@/app/nav';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/lib/motion';
import { useStreamingText } from '@/lib/useStreamingText';
import { cn } from '@/lib/utils';

interface Reply {
  text: string;
  to?: string;
  linkLabel?: string;
}

/** Scripted "where do I find X?" answers. Extend by adding rules. */
const RULES: Array<{ match: RegExp; reply: Reply }> = [
  { match: /approv|sign.?off|pending/i, reply: { text: 'Approvals wait in the Observe screen, in the approval queue. You can approve with A and reject with R.', to: '/observe#approvals', linkLabel: 'Open approvals' } },
  { match: /cost|spend|budget|salary/i, reply: { text: 'Costs live in Observe, under Cost. It compares each agent\'s salary with the value it produced.', to: '/observe#cost', linkLabel: 'Open cost view' } },
  { match: /creat|build|new agent|make an agent/i, reply: { text: 'Head to Build. Describe the problem in plain words and I will interview you and write the job description.', to: '/build', linkLabel: 'Start building' } },
  { match: /hire|template|marketplace|role/i, reply: { text: 'The Marketplace has ready-made roles you can hire in one click, including a retail operations bundle.', to: '/templates', linkLabel: 'Open marketplace' } },
  { match: /data|connect|pos|weather|shopify|source/i, reply: { text: 'Data sources are in Connect. Each card shows its status, last sync, and a readiness score.', to: '/connect', linkLabel: 'Open data sources' } },
  { match: /test|backtest|accura/i, reply: { text: 'The Test lab replays past days and shows what the agent would have said next to what actually happened.', to: '/test', linkLabel: 'Open test lab' } },
  { match: /voice|avatar|face|personality|kiosk/i, reply: { text: 'The Avatar studio lets you pick a face, voice and personality for each agent.', to: '/avatars', linkLabel: 'Open avatar studio' } },
  { match: /brief|report|morning|schedul/i, reply: { text: 'Briefings shows your daily morning card and lets you choose when and where it is delivered.', to: '/outputs', linkLabel: 'Open briefings' } },
  { match: /org|chart|department|team|company/i, reply: { text: 'Your org chart is in Company. Drag agents around and click one to open their profile.', to: '/company', linkLabel: 'Open company' } },
  { match: /trust|autonom|permission|limit/i, reply: { text: 'Each agent\'s profile has a trust ladder, from Shadow to Trusted, plus spending limits and allowed actions.', to: '/company', linkLabel: 'Pick an agent' } },
  { match: /edge|device|store device|rollout|deploy/i, reply: { text: 'Deploy covers cloud versus on-site devices, your store fleet and staged model rollouts.', to: '/deploy', linkLabel: 'Open deploy' } },
  { match: /theme|dark|light|motion|sound|setting/i, reply: { text: 'Theme, motion and sound toggles are in Settings, under Appearance.', to: '/settings', linkLabel: 'Open settings' } },
];

const FALLBACK: Reply = {
  text: 'I am not sure yet. Try asking about approvals, costs, data sources, hiring or briefings. You can also press Ctrl+K to search everything.',
};

function answer(question: string): Reply {
  return RULES.find((r) => r.match.test(question))?.reply ?? FALLBACK;
}

interface Message {
  id: number;
  from: 'user' | 'core';
  reply?: Reply;
  text?: string;
  /** Set while a model reply is streaming in; the text is shown as-is, without fake streaming. */
  live?: boolean;
}

function CoreMessage({ reply, live, onDone }: { reply: Reply; live?: boolean; onDone?: () => void }) {
  const fake = useStreamingText(reply.text, { onDone, enabled: live === undefined });
  const { text, done } = live === undefined ? fake : { text: reply.text, done: !live };
  return (
    <div className="max-w-[85%] rounded-lg rounded-tl-sm bg-line/5 px-3.5 py-2.5 text-sm">
      <p>{text}</p>
      {done && reply.to && (
        <Link
          to={reply.to}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cyan hover:underline"
        >
          {reply.linkLabel} <ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  );
}

export function CoreAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, from: 'core', reply: { text: 'Hi, I am Core. Ask me where to find anything in your AI company.' } },
  ]);
  const [busy, setBusy] = useState(false);
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setInput('');
    const scripted = answer(q);
    const id = Date.now() + 1;
    // The model writes the words; the scripted rule still supplies the link to the right screen.
    const link = scripted === FALLBACK ? {} : { to: scripted.to, linkLabel: scripted.linkLabel };
    const history: ChatMessage[] = messages
      .slice(1)
      .map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text ?? m.reply?.text ?? '' }));
    setMessages((m) => [...m, { id: Date.now(), from: 'user', text: q }, { id, from: 'core', reply: { text: '...' }, live: true }]);
    const update = (patch: Partial<Message>) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));

    setBusy(true);
    try {
      const text = await generate({
        system: coreSystemPrompt(),
        history: [...history, { role: 'user', content: q }],
        temperature: 0.3,
        onText: (t) => update({ reply: { text: t } }),
      });
      update(text === null ? { reply: scripted, live: undefined } : { reply: { text, ...link }, live: false });
    } catch (err) {
      reportFallback(err);
      update({ reply: scripted, live: undefined });
    } finally {
      setBusy(false);
    }
  };

  const suggestions = ALL_NAV.slice(3, 6).map((n) => `Where are ${n.label.toLowerCase()}?`);

  return (
    <div className="fixed bottom-24 right-4 z-40 md:bottom-6 md:right-6" data-tour="core">
      <AnimatePresence>
        {open && (
          <motion.section
            initial={reduced ? false : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="glass-strong absolute bottom-16 right-0 flex h-[440px] max-h-[70vh] w-[min(360px,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-xl shadow-glow-violet"
            aria-label="Core assistant"
          >
            <header className="flex items-center gap-3 border-b border-line/10 px-4 py-3">
              <span className="size-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0%,rgb(var(--c-cyan))_35%,rgb(var(--c-violet))_80%)] shadow-glow-cyan" />
              <div className="flex-1">
                <h2 className="text-sm font-semibold">Core</h2>
                <p className="text-xs text-fg-subtle">Your guide to AgentForge</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close assistant">
                <X />
              </Button>
            </header>
            <div ref={listRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              {messages.map((m) =>
                m.from === 'user' ? (
                  <div key={m.id} className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-violet/20 px-3.5 py-2.5 text-sm">
                    {m.text}
                  </div>
                ) : (
                  <CoreMessage key={m.id} reply={m.reply ?? FALLBACK} live={m.live} />
                ),
              )}
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInput(s)}
                      className="rounded-full border border-line/10 px-3 py-1 text-xs text-fg-muted transition-colors hover:border-violet/40 hover:text-fg"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <form onSubmit={(e) => void submit(e)} className="flex gap-2 border-t border-line/10 p-3">
              <label htmlFor="core-input" className="sr-only">
                Ask Core
              </label>
              <input
                id="core-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Where do I find..."
                className="h-10 flex-1 rounded-md border border-line/10 bg-surface/40 px-3 text-sm outline-none placeholder:text-fg-subtle focus-visible:border-violet/60 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button type="submit" variant="primary" size="icon" aria-label="Send" disabled={busy}>
                <Send />
              </Button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close Core assistant' : 'Open Core assistant'}
        aria-expanded={open}
        className={cn(
          'group relative grid size-14 place-items-center rounded-full transition-transform duration-300 hover:scale-105',
        )}
      >
        <span className="absolute inset-0 rounded-full bg-grad-primary opacity-60 blur-lg transition-opacity group-hover:opacity-90" />
        <span className="relative size-12 rounded-full border border-white/20 bg-[radial-gradient(circle_at_35%_30%,#fff_0%,rgb(var(--c-cyan))_30%,rgb(var(--c-violet))_70%,rgb(var(--c-magenta))_100%)] shadow-glow-violet" />
        {!reduced && (
          <span className="absolute inset-0 animate-ping rounded-full border border-cyan/40 [animation-duration:3s]" />
        )}
      </button>
    </div>
  );
}
