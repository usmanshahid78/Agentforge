import { useUi } from '@/store/ui';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: 'network' | 'not-found' | 'validation' = 'network',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const FAILURE_RATE = 0.05;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface SimulateOptions {
  /** Skip latency and failure injection (used for silent background refreshes). */
  instant?: boolean;
  /** Never fail, e.g. for writes the demo script depends on. */
  reliable?: boolean;
}

/**
 * Wraps a fixture read in realistic network behaviour: 300–900ms latency and a
 * 5% random failure (toggleable in Settings) so loading and error states get
 * exercised. Replace each caller's body with a real fetch when a backend exists.
 */
export async function simulate<T>(resolve: () => T, opts: SimulateOptions = {}): Promise<T> {
  if (!opts.instant) {
    await sleep(300 + Math.random() * 600);
    const failuresOn = useUi.getState().simulateFailures;
    if (!opts.reliable && failuresOn && Math.random() < FAILURE_RATE) {
      throw new ApiError('The connection dropped while loading. Try again.');
    }
  }
  // Clone so callers can never mutate the mock database by accident.
  return structuredClone(resolve());
}

export type { SimulateOptions };
