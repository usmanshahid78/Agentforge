import { useCallback, useEffect, useState } from 'react';
import { Copy, Cpu, FlaskConical, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { listModels, RECOMMENDED_MODELS, useAi, type AiProvider, type ChatStats } from '@/ai';
import { chat, OllamaError } from '@/ai/ollama';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/controls';

type Status = { kind: 'checking' } | { kind: 'ok'; models: string[] } | { kind: 'down'; message: string };

const TEST_PROMPT = 'In two sentences, tell a shop owner why a hot Saturday changes what they should stock.';

function Cmd({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 break-all rounded bg-bg/60 px-2 py-1.5 font-mono text-xs">{children}</code>
      <Button variant="ghost" size="icon-sm" aria-label={`Copy ${children}`} onClick={() => { void navigator.clipboard?.writeText(children); toast.success('Copied'); }}>
        <Copy />
      </Button>
    </div>
  );
}

/** Settings > AI model: choose scripted replies or a local Ollama model, and measure its speed. */
export function AiModel() {
  const { provider, model, setProvider, setModel } = useAi();
  const [status, setStatus] = useState<Status>({ kind: 'checking' });
  const [test, setTest] = useState<{ running: boolean; text: string; stats?: ChatStats; error?: string }>({ running: false, text: '' });

  const check = useCallback(async () => {
    setStatus({ kind: 'checking' });
    try {
      setStatus({ kind: 'ok', models: await listModels() });
    } catch (e) {
      setStatus({ kind: 'down', message: e instanceof OllamaError ? e.message : 'Could not reach Ollama.' });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const installed = status.kind === 'ok' ? status.models : [];
  const missing = status.kind === 'ok' && !installed.includes(model);

  const runTest = async () => {
    setTest({ running: true, text: '' });
    try {
      const { text, stats } = await chat({
        model,
        messages: [{ role: 'user', content: TEST_PROMPT }],
        onText: (t) => setTest((s) => ({ ...s, text: t })),
      });
      setTest({ running: false, text, stats });
    } catch (e) {
      setTest({ running: false, text: '', error: (e as Error).message });
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-2 flex items-start gap-3">
        <div className="mr-auto">
          <h2 className="font-display text-lg font-semibold">AI model</h2>
          <p className="text-sm text-fg-muted">The model behind agent chat and Core. Local models run on this computer through Ollama; nothing leaves the machine.</p>
        </div>
        {status.kind === 'ok' ? <Badge tone="success">Ollama running</Badge> : status.kind === 'down' ? <Badge tone="warning">Ollama offline</Badge> : <Badge>Checking...</Badge>}
      </div>

      <div className="flex flex-col gap-3 border-b border-line/5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">Replies come from</div>
          <div className="text-sm text-fg-muted">If the local model is unreachable, the app falls back to scripted replies.</div>
        </div>
        <Segmented<AiProvider>
          label="AI provider"
          value={provider}
          onChange={setProvider}
          options={[{ value: 'local', label: 'Local model', icon: Cpu }, { value: 'mock', label: 'Scripted', icon: Sparkles }]}
        />
      </div>

      <div className="flex flex-col gap-3 border-b border-line/5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label htmlFor="ai-model" className="text-sm font-medium">Model</label>
          <div className="text-sm text-fg-muted">
            {missing ? <span className="text-warning">{model} is not installed. Pull it below or pick another.</span> : 'Any model installed in Ollama.'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            id="ai-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-9 min-w-44 rounded-md border border-line/10 bg-surface/60 px-2 text-sm text-fg"
          >
            {[...new Set([model, ...installed, ...RECOMMENDED_MODELS.map((m) => m.name)])].map((name) => (
              <option key={name} value={name}>
                {name}
                {status.kind === 'ok' && !installed.includes(name) ? ' (not installed)' : ''}
              </option>
            ))}
          </select>
          <Button variant="ghost" size="icon-sm" aria-label="Check Ollama again" onClick={() => void check()}>
            <RefreshCw />
          </Button>
        </div>
      </div>

      <div className="border-b border-line/5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Test the model</div>
            <div className="text-sm text-fg-muted">Sends one short prompt and measures speed. The first run is slower while the model loads.</div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void runTest()} disabled={test.running || status.kind !== 'ok'}>
            <FlaskConical /> {test.running ? 'Running...' : 'Run test'}
          </Button>
        </div>
        {(test.text || test.running) && <p className="rounded-md bg-line/5 p-3 text-sm" aria-live="polite">{test.text || 'Loading the model...'}</p>}
        {test.error && <p className="text-sm text-danger">{test.error}</p>}
        {test.stats && (
          <p className="mt-2 font-mono text-xs text-fg-subtle">
            {test.stats.tokensPerSecond.toFixed(1)} tokens/s · first words after {(test.stats.firstTokenMs / 1000).toFixed(1)} s · {test.stats.tokens} tokens in {(test.stats.totalMs / 1000).toFixed(1)} s
          </p>
        )}
      </div>

      <div className="space-y-3 pt-4 text-sm">
        <h3 className="font-medium">Set up</h3>
        <p className="text-fg-muted">1. Install Ollama from ollama.com (it starts in the background). 2. Pull a model:</p>
        <ul className="space-y-2">
          {RECOMMENDED_MODELS.map((m) => (
            <li key={m.name}>
              <p className="mb-1 text-xs text-fg-subtle">{m.name}: {m.note}</p>
              <Cmd>{`ollama pull ${m.name}`}</Cmd>
            </li>
          ))}
        </ul>
        <p className="text-fg-muted">3. Run the app with <code className="font-mono text-xs">npm run dev</code> and press refresh above. The dev server forwards <code className="font-mono text-xs">/ollama</code> to port 11434.</p>
      </div>
    </Card>
  );
}
