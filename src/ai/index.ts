import { toast } from 'sonner';
import { chat, OllamaError, type ChatMessage } from './ollama';
import { useAi } from './store';

export { agentSystemPrompt, coreSystemPrompt } from './prompts';
export { listModels, OllamaError, type ChatMessage, type ChatStats } from './ollama';
export { useAi, RECOMMENDED_MODELS, type AiProvider } from './store';

/** Keep prompts short: small models on CPU slow down sharply as the context grows. */
const MAX_HISTORY = 8;

interface GenerateOptions {
  system: string;
  /** Earlier turns plus the new user message, oldest first. */
  history: ChatMessage[];
  temperature?: number;
  onText?: (text: string) => void;
  signal?: AbortSignal;
}

/**
 * The app's AI layer. Returns the model's reply, or `null` when the provider is
 * `mock` so the caller uses its scripted answer. Throws OllamaError when the
 * local model cannot be used; callers should fall back and call `reportFallback`.
 */
export async function generate({ system, history, temperature, onText, signal }: GenerateOptions): Promise<string | null> {
  const { provider, model } = useAi.getState();
  if (provider === 'mock') return null;
  const { text } = await chat({
    model,
    temperature,
    signal,
    onText,
    messages: [{ role: 'system', content: system }, ...history.slice(-MAX_HISTORY)],
  });
  return text;
}

interface GenerateJsonOptions {
  system: string;
  prompt: string;
  /** JSON schema the reply must match. Validate the result anyway: small models still drift. */
  schema: Record<string, unknown>;
  signal?: AbortSignal;
}

/** Like `generate`, but returns parsed JSON. `null` when the provider is `mock`. */
export async function generateJson<T>({ system, prompt, schema, signal }: GenerateJsonOptions): Promise<T | null> {
  const { provider, model } = useAi.getState();
  if (provider === 'mock') return null;
  const { text } = await chat({
    model,
    temperature: 0.2,
    format: schema,
    signal,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
  });
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new OllamaError('The model returned invalid JSON.', 'failed');
  }
}

let lastWarning = 0;

/** Tells the user (at most once a minute) that scripted replies are being used instead. */
export function reportFallback(error: unknown) {
  if ((error as Error)?.name === 'AbortError') return;
  console.warn('[ai] falling back to scripted reply:', error);
  if (Date.now() - lastWarning < 60_000) return;
  lastWarning = Date.now();
  const detail = error instanceof OllamaError ? error.message : 'The local model failed.';
  toast.warning('Using scripted replies', { description: `${detail} Check Settings > AI model.` });
}
