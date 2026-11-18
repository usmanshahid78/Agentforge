import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';
import type { Agent } from '@/types';
import { agentSystemPrompt, generate, reportFallback, useAi } from '@/ai';
import { Button } from '@/components/ui/button';
import { agentAnswer } from '@/lib/personality';
import { useSpeaker, useVoiceInput } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { Avatar, type AvatarState } from './Avatar';

interface Msg {
  id: number;
  from: 'user' | 'agent';
  text: string;
}

const SUGGESTIONS = ['Who are you?', 'How are you doing?', 'What can you do alone?', 'What about the weekend weather?'];

/** Chat + voice with an agent. The avatar speaks replies, with captions. */
export function TalkPanel({ agent, compact = false }: { agent: Agent; compact?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  /** The last local-model call failed, so replies are scripted. */
  const [offline, setOffline] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const speaker = useSpeaker();
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController>();
  const { provider, model } = useAi();

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    const history = [...msgs, { id: Date.now(), from: 'user' as const, text }];
    const replyId = Date.now() + 1;
    setMsgs(history);
    setThinking(true);
    setBusy(true);
    // Shows the reply as the model streams it; the first token replaces the "thinking" line.
    const show = (reply: string) => {
      setThinking(false);
      setMsgs((m) => (m.some((x) => x.id === replyId) ? m.map((x) => (x.id === replyId ? { ...x, text: reply } : x)) : [...m, { id: replyId, from: 'agent', text: reply }]));
    };

    abortRef.current = new AbortController();
    let reply: string | null = null;
    try {
      reply = await generate({
        system: agentSystemPrompt(agent),
        history: history.map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text })),
        temperature: agent.temperature,
        onText: show,
        signal: abortRef.current.signal,
      });
      setOffline(false);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      reportFallback(e);
      setOffline(true);
    }
    if (reply === null) {
      await new Promise((r) => window.setTimeout(r, 700));
      reply = agentAnswer(agent, text);
    }
    show(reply);
    setBusy(false);
    if (voiceOn) speaker.speak(reply, agent.voice);
  };
  const voice = useVoiceInput((q) => void ask(q));

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, thinking]);

  const state: AvatarState = speaker.speaking ? 'speaking' : thinking ? 'thinking' : voice.listening ? 'listening' : 'idle';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
    setInput('');
  };

  return (
    <section aria-label={`Talk to ${agent.name}`} className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col items-center gap-3 pb-4">
        <Avatar agent={agent} size={compact ? 'lg' : 'xl'} state={state} level={speaker.level} allow3d />
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold">Talk to {agent.name}</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={voiceOn ? 'Turn spoken replies off' : 'Turn spoken replies on'}
            aria-pressed={voiceOn}
            onClick={() => {
              if (voiceOn) speaker.stop();
              setVoiceOn((v) => !v);
            }}
          >
            {voiceOn ? <Volume2 /> : <VolumeX />}
          </Button>
        </div>
        <p className="-mt-2 text-xs text-fg-subtle">{provider !== 'local' ? 'Scripted replies' : offline ? 'Ollama not reachable · scripted replies' : `Local model · ${model}`}</p>
        {/* Captions for spoken output */}
        <p className={cn('min-h-10 max-w-sm text-center text-sm text-fg-muted transition-opacity', speaker.speaking ? 'opacity-100' : 'opacity-0')} aria-live="polite">
          {speaker.speaking ? speaker.caption : ''}
        </p>
      </div>

      <div ref={listRef} className="scrollbar-thin min-h-24 flex-1 space-y-3 overflow-y-auto">
        {msgs.length === 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void ask(s)}
                className="rounded-full border border-line/10 px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-violet/40 hover:text-fg"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={cn('flex', m.from === 'user' && 'justify-end')}>
            <div
              className={cn(
                'max-w-[88%] rounded-lg px-3.5 py-2.5 text-sm',
                m.from === 'user' ? 'rounded-tr-sm bg-violet/20' : 'rounded-tl-sm bg-line/5',
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {thinking && <div className="text-xs text-fg-subtle">{agent.name} is thinking...</div>}
      </div>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <label htmlFor={`talk-${agent.id}`} className="sr-only">
          Message {agent.name}
        </label>
        <input
          id={`talk-${agent.id}`}
          value={voice.listening ? voice.interim : input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={voice.listening ? 'Listening...' : `Ask ${agent.name} anything`}
          className="h-10 min-w-0 flex-1 rounded-md border border-line/10 bg-surface/40 px-3 text-sm outline-none placeholder:text-fg-subtle focus-visible:border-violet/60 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {voice.supported && (
          <Button variant={voice.listening ? 'danger' : 'ghost'} size="icon" aria-label={voice.listening ? 'Stop listening' : 'Speak'} onClick={voice.listening ? voice.stop : voice.start}>
            {voice.listening ? <MicOff /> : <Mic />}
          </Button>
        )}
        <Button type="submit" variant="primary" size="icon" aria-label="Send" disabled={!input.trim() || busy}>
          <Send />
        </Button>
      </form>
    </section>
  );
}
