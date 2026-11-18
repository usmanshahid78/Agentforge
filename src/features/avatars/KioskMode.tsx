import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { Agent } from '@/types';
import { Avatar } from '@/components/avatar/Avatar';
import { Backdrop } from '@/components/layout/Backdrop';
import { Button } from '@/components/ui/button';
import { useSpeaker } from '@/lib/speech';
import { useHotkey } from '@/lib/useHotkey';

const GREETINGS = [
  'Welcome to Nova Mart! Cold drinks are by the door, and today\'s fresh bread came out at nine.',
  'Hello and welcome! Ask me where anything is, or what\'s on offer today.',
  'Good to see you! It\'s warm out, so our iced coffee is two for one until noon.',
];

/** Full-screen greeting mode for in-store tablets. Tap the avatar to hear a greeting. */
export function KioskMode({ agent, onExit }: { agent: Agent; onExit: () => void }) {
  const speaker = useSpeaker();
  const [i, setI] = useState(0);
  useHotkey('escape', onExit);

  const greet = () => {
    speaker.speak(GREETINGS[i % GREETINGS.length] ?? '', agent.voice);
    setI((n) => n + 1);
  };

  useEffect(() => {
    const t = window.setTimeout(greet, 600);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.documentElement.style.overflow = '';
    };
    // Greet once on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${agent.name} kiosk mode`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-8 p-6 text-center"
    >
      <Backdrop />
      <Button variant="secondary" size="sm" className="absolute right-4 top-4" onClick={onExit} autoFocus>
        <X /> Exit kiosk
      </Button>
      <button type="button" onClick={greet} aria-label={`Hear a greeting from ${agent.name}`} className="rounded-full">
        <Avatar agent={agent} size="2xl" state={speaker.speaking ? 'speaking' : 'idle'} level={speaker.level} allow3d />
      </button>
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan">Nova Mart</p>
        <h2 className="mt-3 text-4xl font-semibold md:text-5xl">Hi, I'm {agent.name}.</h2>
        <p className="mt-6 min-h-16 text-xl text-fg-muted md:text-2xl" aria-live="polite">
          {speaker.caption || 'Tap me to say hello.'}
        </p>
      </div>
      <p className="absolute bottom-6 text-xs text-fg-subtle">Press Esc to exit</p>
    </motion.div>,
    document.body,
  );
}
