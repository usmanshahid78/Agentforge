import { useEffect, useState } from 'react';
import { useReducedMotion } from './motion';

interface StreamingOptions {
  /** Milliseconds between words. */
  speed?: number;
  /** Start streaming only when true (e.g. after a typing indicator). */
  enabled?: boolean;
  onDone?: () => void;
}

/**
 * Streams `text` word by word to imitate a model generating a reply.
 * With reduced motion the full text appears immediately.
 */
export function useStreamingText(text: string, { speed = 35, enabled = true, onDone }: StreamingOptions = {}) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  const words = text.split(/(\s+)/); // keep whitespace tokens so layout is stable

  useEffect(() => {
    setCount(0);
  }, [text]);

  useEffect(() => {
    if (!enabled) return;
    if (reduced) {
      setCount(words.length);
      return;
    }
    if (count >= words.length) return;
    const id = window.setTimeout(() => setCount((c) => Math.min(words.length, c + 2)), speed);
    return () => window.clearTimeout(id);
  }, [count, enabled, reduced, speed, words.length]);

  const done = count >= words.length;
  useEffect(() => {
    if (done && enabled) onDone?.();
    // onDone is intentionally excluded: callers often pass inline functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, enabled]);

  return { text: words.slice(0, count).join(''), done };
}
