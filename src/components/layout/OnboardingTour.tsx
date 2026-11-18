import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUi } from '@/store/ui';
import { APP_NAME } from '@/lib/constants';

interface TourStep {
  /** Tried in order; the first visible element is highlighted. */
  targets: string[];
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  { targets: ['[data-tour="prompt"]'], title: 'Describe the job', body: 'Type a problem in plain words, like "watch my stock". We interview you and write the job description.' },
  { targets: ['[data-tour="paths"]'], title: 'Two ways to build', body: 'Hire a ready-made team member, or create your own agent with full control over tools and instructions.' },
  { targets: ['[data-tour="nav"]', '[data-tour="nav-mobile"]'], title: 'Your AI company', body: 'Org chart, approvals, costs, briefings and data sources are all one click away.' },
  { targets: ['[data-tour="search"]'], title: 'Jump anywhere', body: 'Press Ctrl+K (Cmd+K on Mac) to find any agent, screen or action.' },
  { targets: ['[data-tour="bell"]'], title: 'Approvals and alerts', body: 'Agents ask before doing anything important. Their requests land here.' },
  { targets: ['[data-tour="core"]'], title: 'Ask Core', body: 'Lost? Ask Core where to find things. That is the end of the tour.' },
];

const visible = (el: Element | null): el is HTMLElement => {
  if (!(el instanceof HTMLElement)) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
};

/** First-visit guided tour. Skippable; dismissal is remembered. */
export function OnboardingTour() {
  const dismiss = useUi((s) => s.dismissTour);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect>();
  const nextRef = useRef<HTMLButtonElement>(null);
  const steps = STEPS;
  const step = steps[i];

  const measure = useCallback(() => {
    if (!step) return;
    const el = step.targets.map((t) => document.querySelector(t)).find(visible);
    if (!el) {
      // Target not on screen at this size: skip forward.
      setI((n) => (n < steps.length - 1 ? n + 1 : n));
      return;
    }
    el.scrollIntoView({ block: 'nearest' });
    setRect(el.getBoundingClientRect());
  }, [step, steps.length]);

  useLayoutEffect(() => {
    // Wait a frame for the page transition to settle.
    const t = window.setTimeout(measure, 450);
    return () => window.clearTimeout(t);
  }, [measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  useEffect(() => {
    nextRef.current?.focus();
  }, [i, rect]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
      if (e.key === 'ArrowRight') setI((n) => Math.min(steps.length - 1, n + 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismiss, steps.length]);

  if (!step || !rect) return null;
  const pad = 8;
  const below = rect.bottom + 220 < window.innerHeight;
  const cardW = Math.min(340, window.innerWidth - 32);
  const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), window.innerWidth - cardW - 16);
  const top = below ? rect.bottom + pad + 12 : Math.max(16, rect.top - pad - 12 - 190);
  const last = i === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute rounded-xl ring-2 ring-violet"
        initial={false}
        animate={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        style={{ boxShadow: '0 0 0 9999px rgb(var(--c-bg) / 0.72), 0 0 32px rgb(var(--c-violet) / 0.6)' }}
      />
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong absolute rounded-xl p-5 shadow-glow-violet"
        style={{ left, top, width: cardW }}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-cyan">
            Welcome to {APP_NAME} · {i + 1}/{steps.length}
          </span>
          <button type="button" onClick={dismiss} className="rounded p-1 text-fg-muted hover:text-fg" aria-label="Skip tour">
            <X className="size-4" />
          </button>
        </div>
        <h2 id="tour-title" className="font-display text-lg font-semibold">
          {step.title}
        </h2>
        <p id="tour-body" className="mt-1 text-sm text-fg-muted">
          {step.body}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Skip
          </Button>
          <div className="ml-auto flex gap-2">
            {i > 0 && (
              <Button variant="outline" size="sm" onClick={() => setI(i - 1)} aria-label="Previous step">
                <ArrowLeft />
              </Button>
            )}
            <Button ref={nextRef} variant="primary" size="sm" onClick={() => (last ? dismiss() : setI(i + 1))}>
              {last ? 'Get started' : 'Next'} {!last && <ArrowRight />}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
