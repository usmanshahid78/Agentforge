import type { Department, DepartmentKey, ID } from '@/types';
import { useDb } from '@/store/db';

export type Accent = Department['accent'];

/** Token names for each accent; used to build `rgb(var(--c-x))` colours. */
export const ACCENT_TOKEN: Record<Accent, string> = {
  violet: '--c-violet',
  cyan: '--c-cyan',
  magenta: '--c-magenta',
  warning: '--c-warning',
};

export const accentColor = (accent: Accent, alpha = 1) => `rgb(var(${ACCENT_TOKEN[accent]}) / ${alpha})`;

export function departmentById(id: ID): Department | undefined {
  return useDb.getState().departments.find((d) => d.id === id);
}

export function departmentByKey(key: DepartmentKey): Department | undefined {
  return useDb.getState().departments.find((d) => d.key === key);
}

export function accentForDepartment(id: ID): Accent {
  return departmentById(id)?.accent ?? 'violet';
}

/** Department → hex-ish accent for WebGL materials (CSS vars are not available there). */
export const ACCENT_HEX: Record<Accent, string> = {
  violet: '#8B5CF6',
  cyan: '#22D3EE',
  magenta: '#F472B6',
  warning: '#FBBF24',
};
