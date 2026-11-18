import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { CharacterAvatarConfig } from '@/types';
import { accentColor } from '@/lib/departments';
import type { AvatarState } from './types';

interface CharacterAvatarProps {
  config: CharacterAvatarConfig;
  state: AvatarState;
  /** 0..1 mouth openness while speaking (see useSpeaker for how it is approximated). */
  level?: number;
  reduced: boolean;
  title?: string;
}

const HEAD_PATH: Record<CharacterAvatarConfig['faceShape'], string> = {
  oval: 'M60 26c14 0 23 11 23 27 0 18-10 31-23 31S37 71 37 53c0-16 9-27 23-27z',
  round: 'M60 27c15 0 24 11 24 26 0 17-10 30-24 30S36 70 36 53c0-15 9-26 24-26z',
  square: 'M41 36c2-7 10-10 19-10s17 3 19 10c3 9 3 22 0 31-3 10-10 16-19 16s-16-6-19-16c-3-9-3-22 0-31z',
  heart: 'M60 26c15 0 23 10 23 25 0 14-7 24-15 29-3 2-6 3-8 3s-5-1-8-3c-8-5-15-15-15-29 0-15 8-25 23-25z',
};

function Hair({ style, color, behind }: { style: CharacterAvatarConfig['hairStyle']; color: string; behind: boolean }) {
  if (style === 'none') return null;
  if (behind) {
    if (style === 'long') return <path d="M34 50c0-20 11-30 26-30s26 10 26 30v40c-6 4-12 5-16 5V55H50v40c-4 0-10-1-16-5V50z" fill={color} />;
    if (style === 'bun') return <circle cx="60" cy="17" r="9" fill={color} />;
    if (style === 'curly') return <path d="M32 52c-4-14 4-30 14-32 4-6 20-6 26 0 12 2 18 18 14 32-2 6-8 4-8 4H40s-6 2-8-4z" fill={color} />;
    return null;
  }
  switch (style) {
    case 'short':
      return <path d="M37 47c0-14 9-22 23-22s23 8 23 22c-4-8-12-11-23-11s-19 3-23 11z" fill={color} />;
    case 'buzz':
      return <path d="M38 45c1-12 10-19 22-19s21 7 22 19c-6-6-13-8-22-8s-16 2-22 8z" fill={color} opacity={0.85} />;
    case 'long':
      return <path d="M36 52c0-17 10-27 24-27s24 10 24 27c-3-10-10-15-18-16-6 4-14 6-22 6-3 2-6 6-8 10z" fill={color} />;
    case 'bun':
      return <path d="M37 46c0-13 9-21 23-21s23 8 23 21c-5-7-13-10-23-10s-18 3-23 10z" fill={color} />;
    case 'curly':
      return (
        <g fill={color}>
          {[40, 48, 56, 64, 72, 80].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 ? 30 : 34} r={7} />
          ))}
        </g>
      );
  }
}

function Outfit({ kind, color }: { kind: CharacterAvatarConfig['outfit']; color: string }) {
  const body = 'M22 120c2-20 16-31 38-31s36 11 38 31z';
  return (
    <g>
      <path d={body} fill={color} />
      {kind === 'blazer' && (
        <>
          <path d="M60 90l-10 30h20z" fill="#F8FAFC" opacity={0.9} />
          <path d="M60 90l-14 6 6 24M60 90l14 6-6 24" stroke="rgb(0 0 0 / 0.25)" strokeWidth={1.5} fill="none" />
        </>
      )}
      {kind === 'hoodie' && <path d="M44 92c4 8 10 12 16 12s12-4 16-12" stroke="rgb(0 0 0 / 0.25)" strokeWidth={3} fill="none" />}
      {kind === 'shirt' && <path d="M52 90l8 10 8-10" stroke="rgb(255 255 255 / 0.7)" strokeWidth={2} fill="none" />}
      {kind === 'turtleneck' && <rect x="50" y="84" width="20" height="9" rx="4" fill={color} stroke="rgb(0 0 0 / 0.15)" />}
    </g>
  );
}

/** Mouth shape from openness: rest line, small "E", round "O". An approximation of visemes. */
function Mouth({ level, speaking }: { level: number; speaking: boolean }) {
  if (!speaking || level < 0.08) return <path d="M54 71q6 3 12 0" stroke="#7A3B3B" strokeWidth={2} fill="none" strokeLinecap="round" />;
  const open = 1.5 + level * 5;
  const wide = level > 0.6 ? 5 : 6.5; // wide "E" for small openings, rounder "O" for big ones
  return <ellipse cx="60" cy="71" rx={wide} ry={open} fill="#5B2333" />;
}

/**
 * Layered SVG bust. Animated with a blink cycle, subtle head sway, and
 * mouth shapes driven by the speech level.
 */
export function CharacterAvatar({ config, state, level = 0, reduced, title }: CharacterAvatarProps) {
  const [blink, setBlink] = useState(false);
  const speaking = state === 'speaking';

  useEffect(() => {
    if (reduced) return;
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 140);
        loop();
      }, 2200 + Math.random() * 2600);
    };
    loop();
    return () => window.clearTimeout(t);
  }, [reduced]);

  const glow = state === 'alert' ? 'warning' : config.glow;

  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 size-full" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <radialGradient id={`bg-${config.glow}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={accentColor(glow, 0.55)} />
          <stop offset="100%" stopColor={accentColor(glow, 0.05)} />
        </radialGradient>
        <clipPath id="af-char-clip">
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath="url(#af-char-clip)">
        <rect width="120" height="120" fill={`url(#bg-${config.glow})`} />
        {state === 'listening' && !reduced && (
          <motion.circle cx="60" cy="60" r="40" fill="none" stroke={accentColor(glow, 0.7)} strokeWidth={2} initial={{ r: 40, opacity: 0.8 }} animate={{ r: 62, opacity: 0 }} transition={{ duration: 1.4, repeat: Infinity }} />
        )}
        <Outfit kind={config.outfit} color={config.outfitColor} />
        <motion.g
          style={{ originX: '60px', originY: '86px' }}
          animate={reduced ? undefined : state === 'thinking' ? { rotate: [-3, -3.5, -3], y: [0, -0.5, 0] } : { rotate: [-1.6, 1.6, -1.6] }}
          transition={{ duration: state === 'thinking' ? 2 : 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Hair style={config.hairStyle} color={config.hairColor} behind />
          <rect x="54" y="76" width="12" height="14" rx="5" fill={config.skinTone} />
          <path d={HEAD_PATH[config.faceShape]} fill={config.skinTone} />
          {/* ears */}
          <ellipse cx="37" cy="56" rx="3.5" ry="5" fill={config.skinTone} />
          <ellipse cx="83" cy="56" rx="3.5" ry="5" fill={config.skinTone} />
          {/* brows */}
          <path d={state === 'thinking' ? 'M46 47l9-2M65 45l9 1' : 'M46 47q4-2 9-1M65 46q5-1 9 1'} stroke={config.hairColor} strokeWidth={2} strokeLinecap="round" fill="none" />
          {/* eyes */}
          <g>
            <ellipse cx="51" cy="55" rx="2.6" ry={blink ? 0.3 : 3} fill="#1E1B2E" />
            <ellipse cx="69" cy="55" rx="2.6" ry={blink ? 0.3 : 3} fill="#1E1B2E" />
            {!blink && (
              <>
                <circle cx="52" cy="54" r="0.9" fill="#fff" />
                <circle cx="70" cy="54" r="0.9" fill="#fff" />
              </>
            )}
          </g>
          {/* cheeks */}
          <circle cx="46" cy="64" r="3.5" fill="#F472B6" opacity={0.18} />
          <circle cx="74" cy="64" r="3.5" fill="#F472B6" opacity={0.18} />
          <Mouth level={level} speaking={speaking} />
          <Hair style={config.hairStyle} color={config.hairColor} behind={false} />
          {config.accessory === 'glasses' && (
            <g fill="none" stroke="#111827" strokeWidth={1.6} opacity={0.85}>
              <rect x="43" y="49" width="15" height="11" rx="4" />
              <rect x="62" y="49" width="15" height="11" rx="4" />
              <path d="M58 54h4" />
            </g>
          )}
          {config.accessory === 'headset' && (
            <g fill="none" stroke="#1F2937" strokeWidth={3} strokeLinecap="round">
              <path d="M35 56c0-20 11-30 25-30s25 10 25 30" />
              <rect x="31" y="52" width="7" height="12" rx="3" fill="#1F2937" />
              <path d="M35 64c2 8 8 10 14 10" strokeWidth={2} />
              <circle cx="50" cy="74" r="2" fill={accentColor(glow)} stroke="none" />
            </g>
          )}
          {config.accessory === 'earring' && <circle cx="83" cy="63" r="2" fill="#FBBF24" />}
        </motion.g>
        {state === 'alert' && !reduced && (
          <motion.rect width="120" height="120" fill={accentColor('warning', 0.3)} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.9, repeat: Infinity }} />
        )}
      </g>
    </svg>
  );
}
