import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';
import { hasWebGL } from '@/lib/webgl';
import { cn } from '@/lib/utils';

const CoreScene = lazy(() => import('./CoreScene'));

/** Static 2D Core used when WebGL is unavailable, reduced motion is on, or while the 3D chunk loads. */
export function CoreFallback({ animate = true }: { animate?: boolean }) {
  return (
    <div aria-hidden className="relative grid size-full place-items-center">
      <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgb(var(--c-violet)/0.45)_0%,transparent_70%)] blur-2xl" />
      <motion.div
        className="relative size-[56%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0%,rgb(var(--c-cyan))_22%,rgb(var(--c-violet))_58%,rgb(var(--c-magenta)/0.85)_88%)] shadow-glow-violet"
        animate={animate ? { scale: [1, 1.04, 1] } : undefined}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-[12%] rounded-full border border-cyan/25" />
    </div>
  );
}

/** Hero Core orb: 3D when possible, 2D otherwise. The 3D bundle is lazy-loaded. */
export function Core({ className, intensity }: { className?: string; intensity?: number }) {
  const reduced = useReducedMotion();
  const use3d = !reduced && hasWebGL();
  return (
    <div className={cn('relative', className)} aria-hidden>
      {use3d && (
        <div className="absolute inset-[22%] rounded-full bg-[radial-gradient(circle,rgb(var(--c-violet)/0.55)_0%,rgb(var(--c-cyan)/0.15)_55%,transparent_75%)] blur-2xl" />
      )}
      {use3d ? (
        <Suspense fallback={<CoreFallback />}>
          <CoreScene intensity={intensity} />
        </Suspense>
      ) : (
        <CoreFallback animate={!reduced} />
      )}
    </div>
  );
}
