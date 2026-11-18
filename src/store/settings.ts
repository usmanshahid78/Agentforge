import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { owner } from '@/mocks';
import type { Owner } from '@/types';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Owner['role'];
  status: 'active' | 'invited';
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed?: string;
}

interface SettingsState {
  profile: { name: string; email: string; phone: string };
  team: TeamMember[];
  apiKeys: ApiKey[];
  notify: { email: boolean; whatsapp: boolean; push: boolean; digest: 'instant' | 'hourly' | 'daily'; quietHours: boolean };
  privacy: { trainOnData: boolean; retentionDays: 30 | 90 | 365; shareAnonymised: boolean };
  setProfile: (p: SettingsState['profile']) => void;
  invite: (m: TeamMember) => void;
  setRole: (id: string, role: Owner['role']) => void;
  removeMember: (id: string) => void;
  addKey: (k: ApiKey) => void;
  revokeKey: (id: string) => void;
  setNotify: (p: Partial<SettingsState['notify']>) => void;
  setPrivacy: (p: Partial<SettingsState['privacy']>) => void;
}

/** Account settings (mock). Persisted separately from the demo database. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      profile: { name: owner.name, email: owner.email, phone: '+44 7700 900123' },
      team: [
        { id: 'tm-1', name: owner.name, email: owner.email, role: 'Owner', status: 'active' },
        { id: 'tm-2', name: 'Omar Haddad', email: 'omar@novamart.example', role: 'Manager', status: 'active' },
        { id: 'tm-3', name: 'Priya Shah', email: 'priya@novamart.example', role: 'Viewer', status: 'invited' },
      ],
      apiKeys: [{ id: 'key-1', name: 'Till integration', prefix: 'af_live_7Hq2', createdAt: '2026-06-02T10:00:00Z', lastUsed: new Date(Date.now() - 3_600_000).toISOString() }],
      notify: { email: true, whatsapp: true, push: false, digest: 'instant', quietHours: true },
      privacy: { trainOnData: false, retentionDays: 365, shareAnonymised: false },
      setProfile: (profile) => set({ profile }),
      invite: (m) => set((s) => ({ team: [...s.team, m] })),
      setRole: (id, role) => set((s) => ({ team: s.team.map((m) => (m.id === id ? { ...m, role } : m)) })),
      removeMember: (id) => set((s) => ({ team: s.team.filter((m) => m.id !== id) })),
      addKey: (k) => set((s) => ({ apiKeys: [...s.apiKeys, k] })),
      revokeKey: (id) => set((s) => ({ apiKeys: s.apiKeys.filter((k) => k.id !== id) })),
      setNotify: (p) => set((s) => ({ notify: { ...s.notify, ...p } })),
      setPrivacy: (p) => set((s) => ({ privacy: { ...s.privacy, ...p } })),
    }),
    { name: 'agentforge-settings', version: 1 },
  ),
);
