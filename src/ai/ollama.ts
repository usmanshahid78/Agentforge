/**
 * Minimal client for a local Ollama server (https://ollama.com).
 * Requests go to `/ollama`, which the Vite dev and preview servers proxy to
 * http://127.0.0.1:11434 (see vite.config.ts), so the browser never hits CORS.
 */

export const OLLAMA_BASE = '/ollama';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatStats {
  /** Generated tokens. */
  tokens: number;
  /** Generation speed in tokens per second (excludes prompt processing). */
  tokensPerSecond: number;
  /** Wall-clock time until the first visible token, in ms. */
  firstTokenMs: number;
  totalMs: number;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  /** Ask for JSON output: 'json', or a JSON schema the reply must match (Ollama structured outputs). */
  format?: 'json' | Record<string, unknown>;
  /** Called with the full visible text so far, every time it grows. */
  onText?: (text: string) => void;
  signal?: AbortSignal;
}

export class OllamaError extends Error {
  constructor(
    message: string,
    public readonly code: 'unreachable' | 'model-missing' | 'failed',
  ) {
    super(message);
    this.name = 'OllamaError';
  }
}

/** Thinking models (Qwen3, DeepSeek-R1) are slow on CPU when they reason first, so turn it off. */
const THINKING_MODEL = /^(qwen3|deepseek-r1|magistral)/i;

/**
 * Removes <think>...</think> blocks, including an unfinished one at the end of a
 * stream. Some models omit the opening tag, so everything before a lone
 * </think> is reasoning too.
 */
export function stripThinking(text: string): string {
  const close = text.lastIndexOf('</think>');
  const afterLone = close >= 0 && !text.includes('<think>') ? text.slice(close + 8) : text;
  return afterLone.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').replace(/^\s+/, '');
}

/**
 * Splits a streamed NDJSON body into parsed objects. Returns the parsed lines
 * and the trailing partial line to prepend to the next chunk.
 */
export function parseNdjson<T>(buffer: string): { items: T[]; rest: string } {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';
  const items = lines.filter((l) => l.trim()).map((l) => JSON.parse(l) as T);
  return { items, rest };
}

interface ChatChunk {
  message?: { content?: string };
  done?: boolean;
  error?: string;
  eval_count?: number;
  eval_duration?: number; // nanoseconds
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_BASE}${path}`, init);
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new OllamaError('Ollama is not running. Start it, then try again.', 'unreachable');
  }
  // The Vite proxy answers 502/504 (or 500 with an empty body) when Ollama is down.
  if (res.status === 502 || res.status === 504) {
    throw new OllamaError('Ollama is not running. Start it, then try again.', 'unreachable');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (!body) throw new OllamaError('Ollama is not running. Start it, then try again.', 'unreachable');
    let message = body;
    try {
      message = (JSON.parse(body) as { error?: string }).error ?? body;
    } catch {
      /* plain-text error */
    }
    if (res.status === 404 || /not found/i.test(message)) {
      throw new OllamaError(`${message}. Pull it with "ollama pull <model>".`, 'model-missing');
    }
    throw new OllamaError(message, 'failed');
  }
  return res;
}

/** Names of the models installed in Ollama, e.g. ["qwen3:4b", "llama3.2:3b"]. */
export async function listModels(signal?: AbortSignal): Promise<string[]> {
  const res = await request('/api/tags', { signal });
  const data = (await res.json()) as { models?: Array<{ name: string }> };
  return (data.models ?? []).map((m) => m.name).sort();
}

/** Streams a chat completion. Resolves with the final visible text and speed stats. */
export async function chat({ model, messages, temperature, format, onText, signal }: ChatOptions): Promise<{ text: string; stats: ChatStats }> {
  const started = performance.now();
  const res = await request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      ...(format ? { format } : {}),
      ...(THINKING_MODEL.test(model) ? { think: false } : {}),
      options: { temperature: temperature ?? 0.6, num_ctx: 4096 },
    }),
  });
  if (!res.body) throw new OllamaError('Ollama returned an empty response.', 'failed');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let raw = '';
  let visible = '';
  let firstTokenMs = 0;
  let tokens = 0;
  let evalNs = 0;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const parsed = parseNdjson<ChatChunk>(buffer + decoder.decode(value, { stream: true }));
    buffer = parsed.rest;
    for (const chunk of parsed.items) {
      if (chunk.error) throw new OllamaError(chunk.error, 'failed');
      raw += chunk.message?.content ?? '';
      const next = stripThinking(raw);
      if (next !== visible) {
        if (!visible) firstTokenMs = performance.now() - started;
        visible = next;
        onText?.(visible);
      }
      if (chunk.done) {
        tokens = chunk.eval_count ?? 0;
        evalNs = chunk.eval_duration ?? 0;
      }
    }
  }

  const text = visible.trim();
  if (!text) throw new OllamaError('The model returned an empty reply.', 'failed');
  return {
    text,
    stats: {
      tokens,
      tokensPerSecond: evalNs ? tokens / (evalNs / 1e9) : 0,
      firstTokenMs: Math.round(firstTokenMs),
      totalMs: Math.round(performance.now() - started),
    },
  };
}
