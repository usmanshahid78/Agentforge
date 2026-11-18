import { motion } from 'framer-motion';
import type { DepartmentKey } from '@/types';
import { accentColor, type Accent } from '@/lib/departments';
import { cn } from '@/lib/utils';
import type { AvatarState } from './types';

const SECONDARY: Record<Accent, Accent> = { violet: 'cyan', cyan: 'violet', magenta: 'violet', warning: 'magenta' };

/** Department decides the silhouette: round, squircle, soft blob or tile. */
const SHAPE: Record<string, string> = {
  operations: '50%',
  sales: '42%',
  'customer-care': '58% 42% 55% 45% / 48% 55% 45% 52%',
  finance: '32%',
};

interface OrbAvatarProps {
  px: number;
  accent: Accent;
  department?: DepartmentKey;
  state: AvatarState;
  /** 0..1 speech level driving the speaking pulse. */
  level?: number;
  initial?: string;
  reduced: boolean;
}

/**
 * Layered CSS/SVG orb. States:
 * idle (slow breathing), listening (ripples), thinking (swirl),
 * speaking (level-reactive pulse + waveform ring), alert (amber flash).
 */
export function OrbAvatar({ px, accent: deptAccent, department, state, level = 0, initial, reduced }: OrbAvatarProps) {
  const accent: Accent = state === 'alert' ? 'warning' : deptAccent;
  const second = SECONDARY[accent];
  const radius = SHAPE[department ?? 'operations'] ?? '50%';
  const speakingScale = 1 + level * 0.12;
  const showRing = px >= 64;

  return (
    <span className="absolute inset-0 grid place-items-center" aria-hidden>
      {/* glow */}
      <motion.span
        className="absolute inset-[-12%] rounded-full blur-xl"
        style={{ background: accentColor(accent, 0.45) }}
        animate={reduced ? undefined : state === 'alert' ? { opacity: [0.2, 0.9, 0.2] } : { opacity: state === 'speaking' ? 0.35 + level * 0.5 : [0.25, 0.45, 0.25] }}
        transition={state === 'speaking' ? { duration: 0.1 } : { duration: state === 'alert' ? 0.9 : 4, repeat: Infinity }}
      />

      {/* listening ripples */}
      {state === 'listening' &&
        !reduced &&
        [0, 0.6].map((d) => (
          <motion.span
            key={d}
            className="absolute inset-0 border-2"
            style={{ borderColor: accentColor(accent, 0.7), borderRadius: radius }}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.7, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, delay: d, ease: 'easeOut' }}
          />
        ))}

      {/* speaking waveform ring */}
      {state === 'speaking' && showRing && (
        <svg viewBox="-50 -50 100 100" className="absolute inset-[-22%] size-[144%] overflow-visible">
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i / 36) * Math.PI * 2;
            const len = 3 + level * 9 * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.7 + level * 9)));
            const r0 = 36;
            return (
              <line
                key={i}
                x1={Math.cos(a) * r0}
                y1={Math.sin(a) * r0}
                x2={Math.cos(a) * (r0 + len)}
                y2={Math.sin(a) * (r0 + len)}
                stroke={accentColor(accent, 0.8)}
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      )}

      {/* body */}
      <motion.span
        className="absolute inset-0 overflow-hidden"
        style={{
          borderRadius: radius,
          background: `radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.9) 0%, ${accentColor(accent)} 30%, ${accentColor(second, 0.95)} 72%, ${accentColor(second, 0.55)} 100%)`,
          boxShadow: `inset 0 -${px / 8}px ${px / 4}px rgb(0 0 0 / 0.28), 0 0 ${px / 4}px ${accentColor(accent, 0.5)}`,
        }}
        animate={
          reduced
            ? undefined
            : state === 'speaking'
              ? { scale: speakingScale }
              : state === 'alert'
                ? { scale: [1, 1.06, 1] }
                : { scale: [1, 1.035, 1] }
        }
        transition={state === 'speaking' ? { duration: 0.08 } : { duration: state === 'alert' ? 0.9 : 4.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* thinking swirl */}
        {state === 'thinking' && (
          <motion.span
            className="absolute inset-[-20%] mix-blend-overlay"
            style={{ background: `conic-gradient(from 0deg, transparent, rgb(255 255 255 / 0.85), transparent 40%, ${accentColor(second, 0.8)}, transparent 75%)` }}
            animate={reduced ? undefined : { rotate: 360 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
          />
        )}
        {/* alert flash */}
        {state === 'alert' && !reduced && (
          <motion.span
            className="absolute inset-0 bg-warning"
            animate={{ opacity: [0, 0.45, 0] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
        )}
      </motion.span>

      {initial && px >= 40 && (
        <span className={cn('relative font-display font-semibold text-white/90 mix-blend-overlay')} style={{ fontSize: px * 0.36 }}>
          {initial}
        </span>
      )}
    </span>
  );
}
