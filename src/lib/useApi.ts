import { useCallback, useEffect, useRef, useState } from 'react';
import type { SimulateOptions } from '@/api/client';
import { useDb } from '@/store/db';

export interface ApiState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  refetch: () => void;
}

/**
 * Minimal query hook for the mock API: first load shows latency and may fail,
 * then any write to the mock database triggers an instant silent refresh so
 * every screen stays in sync. Swap for TanStack Query alongside a real backend.
 */
export function useApi<T>(
  fetcher: (opts?: SimulateOptions) => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
): ApiState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const rev = useDb((s) => s.rev);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const loaded = useRef(false);

  // Full load: on mount, on dependency change and on manual retry.
  useEffect(() => {
    let alive = true;
    loaded.current = false;
    setLoading(true);
    setError(undefined);
    fetcherRef
      .current()
      .then((d) => {
        if (!alive) return;
        setData(d);
        loaded.current = true;
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps]);

  // Silent refresh after mock-database writes.
  useEffect(() => {
    if (!loaded.current) return;
    let alive = true;
    fetcherRef
      .current({ instant: true })
      .then((d) => alive && setData(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [rev]);

  const refetch = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, error, loading, refetch };
}
