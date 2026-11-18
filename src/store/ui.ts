import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode } from '@/types';

export type MotionPref = 'system' | 'reduce' | 'full';
export type DeployMode = 'cloud' | 'edge' | 'hybrid';

interface UiState {
  theme: ThemeMode;
  sidebarOpen: boolean;
  motion: MotionPref;
  sound: boolean;
  simulateFailures: boolean;
  tourDismissed: boolean;
  businessId: string;
  deployMode: DeployMode;
  setDeployMode: (m: DeployMode) => void;
  commandOpen: boolean;
  notificationsOpen: boolean;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setMotion: (m: MotionPref) => void;
  setSound: (on: boolean) => void;
  setSimulateFailures: (on: boolean) => void;
  dismissTour: () => void;
  resetTour: () => void;
  setBusiness: (id: string) => void;
  setCommandOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarOpen: true,
      motion: 'system',
      sound: false,
      simulateFailures: true,
      tourDismissed: false,
      businessId: 'biz-nova',
      deployMode: 'hybrid',
      setDeployMode: (deployMode) => set({ deployMode }),
      commandOpen: false,
      notificationsOpen: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setMotion: (motion) => set({ motion }),
      setSound: (sound) => set({ sound }),
      setSimulateFailures: (simulateFailures) => set({ simulateFailures }),
      dismissTour: () => set({ tourDismissed: true }),
      resetTour: () => set({ tourDismissed: false }),
      setBusiness: (businessId) => set({ businessId }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
    }),
    {
      name: 'agentforge-ui',
      version: 1,
      // Transient overlays are never persisted.
      partialize: ({ commandOpen: _c, notificationsOpen: _n, ...rest }) => rest,
    },
  ),
);
