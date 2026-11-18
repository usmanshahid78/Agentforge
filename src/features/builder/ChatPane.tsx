import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, HelpCircle, Mic, MicOff, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceInput } from '@/lib/speech';
import { useReducedMotion } from '@/lib/motion';
import { useStreamingText } from '@/lib/useStreamingText';
import { cn } from '@/lib/utils';
import type { InterviewEvent, Message, Step } from './interview';

function InterviewerMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'size-8 shrink-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0%,rgb(var(--c-cyan))_30%,rgb(var(--c-violet))_75%,rgb(var(--c-magenta))_100%)] shadow-glow-violet',
        className,
      )}
    />
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((p, i) => (
        <p key={i} className={i > 0 ? 'mt-2.5' : undefined}>
          {p}
        </p>
      ))}
    </>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-3" aria-label="Interviewer is typing">
      <InterviewerMark />
      <div className="glass flex gap-1 rounded-lg rounded-tl-sm px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-fg-muted"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

function StreamingAiMessage({ text, onDone }: { text: string; onDone: () => void }) {
  const [typing, setTyping] = useState(true);
  const reduced = useReducedMotion();
  useEffect(() => {
    const t = window.setTimeout(() => setTyping(false), reduced ? 0 : 650);
    return () => window.clearTimeout(t);
  }, [reduced]);
  const { text: shown } = useStreamingText(text, { enabled: !typing, speed: 28, onDone });
  if (typing) return <TypingDots />;
  return <AiBubble text={shown} />;
}

function AiBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <InterviewerMark className="mt-0.5" />
      <div className="glass max-w-[88%] rounded-lg rounded-tl-sm px-4 py-3 text-[15px] leading-relaxed">
        <Paragraphs text={text} />
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
      <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-grad-primary px-4 py-2.5 text-[15px] text-white shadow-[0_8px_24px_-12px_rgb(var(--c-violet)/0.8)]">
        {text}
      </div>
    </motion.div>
  );
}

interface ChatPaneProps {
  messages: Message[];
  step: Step | undefined;
  clarifying: boolean;
  onEvent: (e: InterviewEvent) => void;
  /** The local model is writing the next message. */
  pending?: boolean;
  footer?: React.ReactNode;
}

export function ChatPane({ messages, step, clarifying, onEvent, pending = false, footer }: ChatPaneProps) {
  // Messages present at mount are history: render them fully, stream only new ones.
  const [streamedUpTo, setStreamedUpTo] = useState(() => (messages.length > 1 ? messages.length - 1 : -1));
  const [selected, setSelected] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];
  const streaming = pending || (!!last && last.from === 'ai' && last.id > streamedUpTo);

  const voice = useVoiceInput((text) => onEvent({ type: 'TEXT', text }));

  useEffect(() => {
    setSelected([]);
  }, [step?.id]);

  // When a step restarts (new session), reset streaming history.
  useEffect(() => {
    if (messages.length <= 1) setStreamedUpTo(-1);
  }, [messages.length]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const id = window.setInterval(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }), 250);
    const stop = window.setTimeout(() => window.clearInterval(id), 6000);
    el.scrollTo({ top: el.scrollHeight });
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [messages.length, pending]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    onEvent({ type: 'TEXT', text });
  };

  const toggle = (id: string) => {
    if (!step) return;
    if (!step.multi) {
      onEvent({ type: 'ANSWER', choiceIds: [id] });
      return;
    }
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const showChips = !!step && !streaming;

  return (
    <section aria-label="Interview" className="flex h-full min-h-0 flex-col">
      <div
        ref={listRef}
        className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-1 pb-4 pt-1"
        aria-live="polite"
        aria-busy={streaming}
      >
        {messages.map((m) =>
          m.from === 'user' ? (
            <UserBubble key={m.id} text={m.text} />
          ) : m.id > streamedUpTo ? (
            <StreamingAiMessage key={m.id} text={m.text} onDone={() => setStreamedUpTo(m.id)} />
          ) : (
            <AiBubble key={m.id} text={m.text} />
          ),
        )}
        {pending && <TypingDots />}
      </div>

      <div className="space-y-3 pt-2">
        <AnimatePresence mode="wait">
          {showChips && (
            <motion.div
              key={`${step.id}-${clarifying}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={step.multi ? 'Quick replies, choose one or more' : 'Quick replies'}
            >
              {step.choices.map((c) => {
                const on = selected.includes(c.id);
                const suggested = clarifying && c.recommended;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    aria-pressed={step.multi ? on : undefined}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-all',
                      on
                        ? 'border-violet/60 bg-violet/20 text-fg shadow-[0_0_16px_-4px_rgb(var(--c-violet)/0.8)]'
                        : suggested
                          ? 'border-cyan/50 bg-cyan/10 text-fg'
                          : 'border-line/15 bg-surface/40 text-fg-muted hover:border-violet/40 hover:text-fg',
                    )}
                  >
                    {on && <Check className="size-3.5" aria-hidden />}
                    {c.label}
                    {suggested && !on && <span className="text-[10px] uppercase tracking-wider text-cyan">Suggested</span>}
                  </button>
                );
              })}
              {!clarifying && (
                <button
                  type="button"
                  onClick={() => onEvent({ type: 'UNSURE' })}
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-line/20 px-3.5 py-1.5 text-sm text-fg-subtle transition-colors hover:border-cyan/50 hover:text-fg"
                >
                  <HelpCircle className="size-3.5" aria-hidden /> I'm not sure
                </button>
              )}
              {step.multi && selected.length > 0 && (
                <Button size="sm" variant="primary" className="rounded-full" onClick={() => onEvent({ type: 'ANSWER', choiceIds: selected })}>
                  Continue <ArrowRight />
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {footer}

        {step && (
          <form onSubmit={submit} className="glass flex items-center gap-2 rounded-xl p-1.5 pl-4">
            <label htmlFor="builder-input" className="sr-only">
              Your answer
            </label>
            <input
              id="builder-input"
              value={voice.listening ? voice.interim : input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={voice.listening ? 'Listening...' : 'Type your answer, or pick a reply above'}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-subtle focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={voice.listening}
            />
            {voice.supported && (
              <Button
                variant={voice.listening ? 'danger' : 'ghost'}
                size="icon"
                aria-label={voice.listening ? 'Stop voice input' : 'Answer with your voice'}
                aria-pressed={voice.listening}
                onClick={voice.listening ? voice.stop : voice.start}
                className={cn(voice.listening && 'animate-pulse')}
              >
                {voice.listening ? <MicOff /> : <Mic />}
              </Button>
            )}
            <Button type="submit" variant="primary" size="icon" aria-label="Send" disabled={!input.trim() || streaming}>
              <Send />
            </Button>
          </form>
        )}
        {voice.error && <p className="text-xs text-danger">{voice.error}</p>}
      </div>
    </section>
  );
}
