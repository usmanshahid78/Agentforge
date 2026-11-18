import { useEffect, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useMotionAttribute, useReducedMotion } from '@/lib/motion';
import { useUi } from '@/store/ui';

function ThemeSync() {
  const theme = useUi((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#070A13' : '#F4F6FC');
  }, [theme]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  useMotionAttribute();
  const reduced = useReducedMotion();
  const theme = useUi((s) => s.theme);

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <TooltipProvider delayDuration={250}>
        <ThemeSync />
        {children}
        <Toaster
          theme={theme}
          position="top-right"
          expand
          visibleToasts={4}
          toastOptions={{
            classNames: {
              toast: 'glass-strong !rounded-lg !border-line/10 !text-fg font-sans',
              description: '!text-fg-muted',
            },
          }}
        />
      </TooltipProvider>
    </MotionConfig>
  );
}
