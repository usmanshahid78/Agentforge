import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, Bot, Check, Copy, Cpu, MessageSquare, Plus, RefreshCw, Sparkles, Square, User } from 'lucide-react';
import { chat, listModels, type ChatMessage } from '@/ai/ollama';
import { useAi } from '@/ai/store';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChatMarkdown } from './ChatMarkdown';

interface Message extends ChatMessage { id: string; interrupted?: boolean }
const STARTERS = [
  { title: 'Explore an idea', prompt: 'Help me brainstorm three practical ideas for a new small business.' },
  { title: 'Write something', prompt: 'Help me write a friendly email introducing my business to a new customer.' },
  { title: 'Make a plan', prompt: 'Help me create a simple weekly plan to be more productive.' },
  { title: 'Explain a concept', prompt: 'Explain how local AI models work in simple terms.' },
];

export default function ChatPage() {
  const { model, setModel } = useAi();
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const controller = useRef<AbortController | null>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);

  async function checkModels(signal?: AbortSignal) {
    setStatus('checking');
    try {
      const installed = await listModels(signal);
      setModels(installed);
      setStatus('online');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setStatus('offline');
    }
  }

  useEffect(() => {
    document.title = 'AI Chat · AgentForge';
    const health = new AbortController();
    void checkModels(health.signal);
    return () => { health.abort(); controller.current?.abort(); };
  }, []);

  useEffect(() => {
    if (messages.length) transcript.current?.scrollTo({ top: transcript.current.scrollHeight });
  }, [messages, busy, error]);

  async function send(text: string, previous = messages) {
    if (!text.trim() || controller.current) return;
    const user: Message = { id: crypto.randomUUID(), role: 'user', content: text.trim() };
    const assistant: Message = { id: crypto.randomUUID(), role: 'assistant', content: '' };
    const history = [...previous, user];
    const abort = new AbortController();
    controller.current = abort;
    setMessages([...history, assistant]);
    setInput('');
    setError('');
    setBusy(true);
    const update = (content: string) => setMessages((all) => all.map((m) => m.id === assistant.id ? { ...m, content } : m));
    try {
      const result = await chat({
        model,
        messages: [{ role: 'system', content: 'You are a helpful AI assistant. Give clear, accurate, practical answers. Ask for clarification when needed. Be honest when you do not know.' }, ...history.filter((m) => m.content).slice(-16).map(({ role, content }) => ({ role, content }))],
        signal: abort.signal,
        onText: update,
      });
      update(result.text);
      setStatus('online');
    } catch (e) {
      setMessages((all) => all.map((m) => m.id === assistant.id ? { ...m, interrupted: true } : m));
      if ((e as Error).name !== 'AbortError') setError((e as Error).message || 'Could not get a reply. Please try again.');
    } finally {
      controller.current = null;
      setBusy(false);
      composer.current?.focus();
    }
  }

  function submit(e: FormEvent) { e.preventDefault(); void send(input); }
  function retry() {
    const lastUser = messages.map((m) => m.role).lastIndexOf('user');
    const message = messages[lastUser];
    if (message) void send(message.content, messages.slice(0, lastUser));
  }
  async function copy(message: Message) {
    try { await navigator.clipboard.writeText(message.content); setCopied(message.id); }
    catch { setError('Could not copy the reply. You can select and copy the text manually.'); }
  }

  return (
    <Page className="ai-chat-page flex min-h-[520px] flex-col !pb-24 md:!pb-5">
      <section aria-label="AI chat" className="glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/10 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-violet/10 text-violet"><MessageSquare className="size-5" /></div>
            <div><h1 className="text-lg font-semibold">AI Chat</h1><p className="flex items-center gap-1.5 text-xs text-fg-muted"><span className={cn('size-1.5 rounded-full', status === 'online' ? 'bg-success' : status === 'offline' ? 'bg-danger' : 'bg-warning')} />{status === 'online' ? 'Ollama connected' : status === 'offline' ? 'Ollama offline' : 'Checking connection…'}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" aria-label="Refresh connection" onClick={() => void checkModels()}><RefreshCw /></Button>
            <Button size="sm" variant="outline" disabled={busy || messages.length === 0} onClick={() => { setMessages([]); setError(''); setInput(''); composer.current?.focus(); }}><Plus />New chat</Button>
          </div>
        </header>

        <div ref={transcript} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center py-6">
              <div className="mb-5 flex size-14 items-center justify-center rounded-xl border border-violet/20 bg-violet/10 text-violet"><Sparkles className="size-7" /></div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">Your local assistant</p>
              <h2 className="text-3xl font-semibold sm:text-4xl">What’s on your mind?</h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-fg-muted">A little inspiration, a tricky question, or a fresh start. Talk it through with your local AI.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">{STARTERS.map((s) => <button key={s.title} onClick={() => void send(s.prompt)} className="group rounded-lg border border-line/10 bg-surface/30 p-4 text-left transition-colors hover:border-violet/40 hover:bg-violet/5"><span className="text-sm font-medium">{s.title}<span className="float-right text-violet">↗</span></span><span className="mt-1.5 block text-xs leading-relaxed text-fg-muted">{s.prompt}</span></button>)}</div>
            </div>
          ) : (
            <div role="log" aria-label="Conversation" aria-busy={busy} className="mx-auto max-w-3xl space-y-7">
              {messages.map((m) => <article key={m.id} aria-label={m.role === 'user' ? 'Your message' : 'Assistant reply'} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
                <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', m.role === 'user' ? 'bg-line/10 text-fg-muted' : 'bg-violet/10 text-violet')}>{m.role === 'user' ? <User className="size-4" /> : <Bot className="size-4" />}</div>
                <div className={cn('min-w-0 max-w-[85%]', m.role === 'user' && 'flex flex-col items-end')}>
                  <p className="mb-1.5 text-xs font-medium text-fg-muted">{m.role === 'user' ? 'You' : 'Assistant'}</p>
                  <div className={cn('break-words text-sm leading-7 [overflow-wrap:anywhere]', m.role === 'user' && 'whitespace-pre-wrap rounded-lg rounded-tr-sm bg-violet/10 px-4 py-2.5')}>
                    {m.content ? (m.role === 'assistant' ? <ChatMarkdown>{m.content}</ChatMarkdown> : m.content) : (busy && !m.interrupted ? <span role="status" className="text-fg-subtle motion-safe:animate-pulse">Thinking…</span> : <span className="text-fg-subtle">{error ? 'No reply received.' : 'Response stopped.'}</span>)}
                  </div>
                  {m.interrupted && m.content && <p className="mt-1 text-xs text-fg-subtle">Response interrupted</p>}
                  {m.role === 'assistant' && m.content && !busy && <Button size="icon-sm" variant="ghost" aria-label={copied === m.id ? 'Reply copied' : 'Copy reply'} onClick={() => void copy(m)} className="mt-1">{copied === m.id ? <Check /> : <Copy />}</Button>}
                </div>
              </article>)}
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 pb-4 sm:px-6">
          {(status === 'offline' || (status === 'online' && !models.includes(model))) && <p role="status" className="mb-3 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">{status === 'offline' ? 'Ollama is unreachable. Start Ollama, then refresh the connection.' : models.length ? `${model} is not installed. Choose an installed model below.` : 'No models installed. Pull a model in Ollama, then refresh.'}</p>}
          {error && <div role="alert" className="mb-3 flex items-center justify-between gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"><span>{error}</span><Button size="sm" variant="ghost" disabled={busy} onClick={retry}><RefreshCw />Retry</Button></div>}
          <form onSubmit={submit} className="rounded-lg border border-line/15 bg-bg-elevated/80 p-3 focus-within:border-violet/50">
            <label htmlFor="chat-message" className="sr-only">Message your local AI</label>
            <textarea ref={composer} id="chat-message" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!busy) void send(input); } }} rows={2} placeholder="Message your local AI…" className="max-h-40 min-h-14 w-full resize-y bg-transparent px-1 text-sm outline-none placeholder:text-fg-subtle focus-visible:ring-0 focus-visible:ring-offset-0" />
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 text-fg-muted"><Cpu className="size-3.5 shrink-0" /><label htmlFor="chat-model" className="sr-only">Chat model</label><select id="chat-model" value={model} onChange={(e) => setModel(e.target.value)} disabled={busy} className="max-w-[180px] truncate rounded bg-transparent py-1 text-xs sm:max-w-xs">{[...new Set([model, ...models])].map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
              {busy ? <Button size="sm" variant="outline" onClick={() => controller.current?.abort()}><Square />Stop</Button> : <Button type="submit" size="icon-sm" variant="primary" aria-label="Send message" disabled={!input.trim()}><ArrowUp /></Button>}
            </div>
          </form>
          <p className="mt-2 text-center text-[11px] text-fg-subtle">AI can make mistakes. Check important details.<span className="hidden sm:inline"> Enter to send · Shift + Enter for a new line</span></p>
        </div>
      </section>
    </Page>
  );
}
