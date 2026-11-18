import { lazy, Suspense } from 'react';
import type { Agent } from '@/types';
import { ACCENT_HEX, accentForDepartment, departmentById } from '@/lib/departments';
import { useReducedMotion } from '@/lib/motion';
import { hasWebGL } from '@/lib/webgl';
import { cn } from '@/lib/utils';
import { CharacterAvatar } from './CharacterAvatar';
import { OrbAvatar } from './OrbAvatar';
import { SIZE_PX, type AvatarSize, type AvatarState } from './types';

const Stage3D = lazy(() => import('./Stage3D'));

export type { AvatarSize, AvatarState } from './types';

const SECOND_HEX: Record<string, string> = { violet: ACCENT_HEX.cyan, cyan: ACCENT_HEX.violet, magenta: ACCENT_HEX.violet, warning: ACCENT_HEX.magenta };

export interface AvatarProps {
  agent: Pick<Agent, 'name' | 'departmentId' | 'status'> & Partial<Pick<Agent, 'avatar'>>;
  size?: AvatarSize;
  state?: AvatarState;
  /** Speech level 0..1 for lip-sync / speaking pulse. */
  level?: number;
  /** Show the live status dot. */
  showStatus?: boolean;
  /** Allow the WebGL stage for 3D avatars (only for large hero placements). */
  allow3d?: boolean;
  className?: string;
}

/**
 * The one avatar component used everywhere.
 * - orb: CSS/SVG orb, colour and silhouette from the department
 * - character: layered SVG bust with blink, sway and visemes
 * - model3d: React Three Fiber stage (lazy); small sizes fall back to the orb
 */
export function Avatar({ agent, size = 'md', state = 'idle', level = 0, showStatus = false, allow3d = false, className }: AvatarProps) {
  const reduced = useReducedMotion();
  const px = SIZE_PX[size];
  const accent = accentForDepartment(agent.departmentId);
  const dept = departmentById(agent.departmentId);
  const kind = agent.avatar?.kind ?? 'orb';
  const live = agent.status === 'working';
  const use3d = kind === 'model3d' && allow3d && !reduced && hasWebGL();

  const orb = <OrbAvatar px={px} accent={accent} department={dept?.key} state={state} level={level} initial={agent.name.charAt(0)} reduced={reduced} />;

  return (
    <span
      role="img"
      aria-label={`${agent.name}${state !== 'idle' ? `, ${state}` : ''}${live ? ', working' : ''}`}
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: px, height: px }}
    >
      {kind === 'character' && agent.avatar?.character ? (
        <span className="absolute inset-0 overflow-hidden rounded-full ring-1 ring-line/10">
          <CharacterAvatar config={agent.avatar.character} state={state} level={level} reduced={reduced} />
        </span>
      ) : use3d ? (
        <Suspense fallback={orb}>
          <span className="absolute inset-[-10%]">
            <Stage3D color={ACCENT_HEX[accent]} accent2={SECOND_HEX[accent] ?? ACCENT_HEX.cyan} state={state} level={level} modelUrl={agent.avatar?.modelUrl} />
          </span>
        </Suspense>
      ) : (
        orb
      )}
      {showStatus && (
        <span
          aria-hidden
          className={cn(
            'absolute bottom-[4%] right-[4%] rounded-full border-2 border-bg',
            live ? 'animate-pulse-live bg-success' : agent.status === 'error' ? 'bg-danger' : agent.status === 'paused' ? 'bg-warning' : 'bg-fg-subtle',
          )}
          style={{ width: Math.max(8, px / 5.5), height: Math.max(8, px / 5.5) }}
        />
      )}
    </span>
  );
}
