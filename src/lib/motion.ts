import { useEffect } from 'react';
import { useReducedMotion as useSystemReducedMotion, type Variants } from 'framer-motion';
import { useUi } from '@/store/ui';

/** True when motion should be minimised: in-app setting first, then the OS preference. */
export function useReducedMotion(): boolean {
  const pref = useUi((s) => s.motion);
  const system = useSystemReducedMotion() ?? false;
  return pref === 'reduce' || (pref === 'system' && system);
}

/** Mirrors the in-app motion setting onto <html> so CSS animations obey it too. */
export function useMotionAttribute() {
  const reduced = useReducedMotion();
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reduced);
  }, [reduced]);
}

export const easeOut = [0.22, 1, 0.36, 1] as const;

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: easeOut } },
};

export const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.05 } },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
};
