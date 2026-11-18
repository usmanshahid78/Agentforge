import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/* --------------------------------- Switch --------------------------------- */

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50',
        checked ? 'border-violet/50 bg-violet' : 'border-line/15 bg-line/10',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-[18px] rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

/* ------------------------------- Segmented -------------------------------- */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: string; icon?: LucideIcon }>;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  const onKey = (e: KeyboardEvent) => {
    const i = options.findIndex((o) => o.value === value);
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = options[(i + d + options.length) % options.length];
    if (next) onChange(next.value);
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
      className={cn('inline-flex rounded-md border border-line/10 bg-line/5 p-1', className)}
    >
      {options.map((o) => {
        const Icon = o.icon;
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-sm transition-colors',
              active ? 'bg-violet/20 text-fg shadow-[inset_0_0_0_1px_rgb(var(--c-violet)/0.35)]' : 'text-fg-muted hover:text-fg',
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------- Slider --------------------------------- */

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  leftLabel,
  rightLabel,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  leftLabel?: string;
  rightLabel?: string;
  format?: (v: number) => string;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        {format && <span className="font-mono text-xs text-fg-muted">{format(value)}</span>}
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="af-range w-full"
        style={{ ['--pct' as string]: `${pct}%` }}
      />
      {(leftLabel || rightLabel) && (
        <div className="mt-1 flex justify-between text-xs text-fg-subtle">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Progress ring ------------------------------ */

export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  label,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
}) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--c-violet))" />
            <stop offset="100%" stopColor="rgb(var(--c-cyan))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-border) / 0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - Math.min(100, Math.max(0, value)) / 100) }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: 'drop-shadow(0 0 6px rgb(var(--c-violet) / 0.6))' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ---------------------------------- Meter ---------------------------------- */

export function Meter({
  value,
  label,
  tone = 'auto',
  showValue = true,
}: {
  value: number;
  label: string;
  tone?: 'auto' | 'violet' | 'cyan';
  showValue?: boolean;
}) {
  const color =
    tone === 'violet'
      ? 'bg-violet'
      : tone === 'cyan'
        ? 'bg-cyan'
        : value >= 75
          ? 'bg-success'
          : value >= 45
            ? 'bg-warning'
            : 'bg-danger';
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-fg-muted">{label}</span>
        {showValue && <span className="font-mono text-xs">{Math.round(value)}%</span>}
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-line/10"
        role="meter"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={false}
          animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------- Tabs ----------------------------------- */

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: Array<{ value: T; label: string; icon?: LucideIcon; count?: number }>;
  label: string;
  className?: string;
}) {
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.value === value);
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = tabs[(i + d + tabs.length) % tabs.length];
    if (next) onChange(next.value);
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKey}
      className={cn('scrollbar-thin flex gap-1 overflow-x-auto border-b border-line/10', className)}
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 px-3.5 pb-3 pt-2 text-sm font-medium transition-colors',
              active ? 'text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            {t.label}
            {t.count !== undefined && (
              <span className="rounded-full bg-line/10 px-1.5 font-mono text-[10px] text-fg-muted">{t.count}</span>
            )}
            {/* No shared layoutId here: once it had animated, it stalled the route exit transition
                (AnimatePresence mode="wait"), leaving the old page on screen after navigating. */}
            {active && (
              <motion.span
                initial={{ scaleX: 0.4, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-grad-brand shadow-[0_0_12px_rgb(var(--c-violet)/0.8)]"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
