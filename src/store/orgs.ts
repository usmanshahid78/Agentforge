import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ID, Organization } from '@/types';
import { seedOrganizations } from '@/mocks/organizations';

/** Back office state: organizations created from descriptions. `resetDemo` in src/store/db.ts resets it too. */
interface OrgState {
  orgs: Organization[];
  add: (org: Organization) => void;
  remove: (id: ID) => void;
  reset: () => void;
}

export const useOrgs = create<OrgState>()(
  persist(
    (set) => ({
      orgs: seedOrganizations(),
      add: (org) => set((s) => ({ orgs: [org, ...s.orgs.filter((o) => o.id !== org.id)] })),
      remove: (id) => set((s) => ({ orgs: s.orgs.filter((o) => o.id !== id) })),
      reset: () => set({ orgs: seedOrganizations() }),
    }),
    { name: 'agentforge-orgs', version: 1 },
  ),
);
