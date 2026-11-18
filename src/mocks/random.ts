/** Deterministic PRNG (mulberry32) so fixtures are stable across reloads. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
  };
}

export const DAY_MS = 86_400_000;

/** ISO timestamp `minutes` before now. */
export const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

/** Local calendar date as yyyy-mm-dd (not UTC, so days never shift across time zones). */
export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Parses a yyyy-mm-dd day string at local noon, safe for getDay() and formatting. */
export const parseDay = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
