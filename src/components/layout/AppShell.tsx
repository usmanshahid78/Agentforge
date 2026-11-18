import { Suspense } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/utils';
import { Backdrop } from './Backdrop';
import { CommandPalette } from './CommandPalette';
import { CoreAssistant } from './CoreAssistant';
import { MobileTabBar } from './MobileTabBar';
import { NotificationsDrawer } from './NotificationsDrawer';
import { OnboardingTour } from './OnboardingTour';
import { RouteFallback } from './RouteFallback';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  const location = useLocation();
  const outlet = useOutlet();
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const tourDismissed = useUi((s) => s.tourDismissed);

  return (
    <div className="relative min-h-dvh">
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-violet px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Backdrop />
      <Sidebar />
      <div
        className={cn(
          'flex min-h-dvh flex-col transition-[padding] duration-300 ease-out',
          sidebarOpen ? 'md:pl-[calc(var(--sidebar-w-open)+12px)]' : 'md:pl-[calc(var(--sidebar-w)+12px)]',
        )}
      >
        <Topbar />
        <AnimatePresence mode="wait" initial={false}>
          <Suspense key={location.pathname} fallback={<RouteFallback />}>
            {outlet}
          </Suspense>
        </AnimatePresence>
      </div>
      <MobileTabBar />
      {/* The builder has its own interviewer; keep its action buttons unobstructed. */}
      {!location.pathname.startsWith('/build') && location.pathname !== '/chat' && <CoreAssistant />}
      <CommandPalette />
      <NotificationsDrawer />
      {!tourDismissed && location.pathname === '/mission' && <OnboardingTour />}
    </div>
  );
}
