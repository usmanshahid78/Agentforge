import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ActivityEvent,
  Agent,
  AppNotification,
  ApprovalRequest,
  Connector,
  ConnectorStatus,
  Department,
  Device,
  ID,
  TrustLevel,
} from '@/types';
import {
  activityEvents,
  approvals as seedApprovals,
  connectors as seedConnectors,
  departments as seedDepartments,
  devices as seedDevices,
  notifications as seedNotifications,
  seedAgents,
} from '@/mocks';
import { usePortfolio } from './portfolio';
import { useOrgs } from './orgs';

export interface BriefingSchedule {
  time: string; // "08:00"
  days: number[]; // 0 = Sunday
  channels: Array<'email' | 'whatsapp' | 'pdf' | 'voice'>;
  presenterId?: ID;
}

export interface Feedback {
  vote: 'up' | 'down';
  note: string;
}

/**
 * The mock "database": all mutable demo state, persisted to localStorage so a
 * refresh keeps the story. Only src/api and feature actions should write here.
 * `rev` bumps on every write so data hooks can refresh silently.
 */
interface DbState {
  rev: number;
  agents: Agent[];
  departments: Department[];
  connectors: Connector[];
  approvals: ApprovalRequest[];
  events: ActivityEvent[];
  notifications: AppNotification[];
  devices: Device[];
  nodePositions: Record<ID, { x: number; y: number }>;
  briefing: BriefingSchedule;
  /** Backtest feedback keyed by recommendation id. */
  feedback: Record<string, Feedback>;

  upsertAgent: (agent: Agent) => void;
  updateAgent: (id: ID, patch: Partial<Agent>) => void;
  removeAgent: (id: ID) => void;
  setTrust: (id: ID, trust: TrustLevel) => void;
  addDepartment: (dep: Department) => void;
  setConnectorStatus: (id: ID, status: ConnectorStatus) => void;
  resolveApproval: (id: ID, status: 'approved' | 'rejected', patch?: Partial<ApprovalRequest>) => void;
  addApproval: (a: ApprovalRequest) => void;
  addEvent: (event: Omit<ActivityEvent, 'id' | 'at'>) => void;
  notify: (n: Omit<AppNotification, 'id' | 'at' | 'read'>) => void;
  markAllNotificationsRead: () => void;
  setDevices: (fn: (d: Device[]) => Device[]) => void;
  setNodePosition: (id: ID, pos: { x: number; y: number }) => void;
  clearNodePositions: () => void;
  setBriefing: (b: Partial<BriefingSchedule>) => void;
  setFeedback: (id: string, f: Feedback | undefined) => void;
  resetDemo: () => void;
}

const seed = () => ({
  agents: structuredClone(seedAgents),
  departments: structuredClone(seedDepartments),
  connectors: structuredClone(seedConnectors),
  approvals: structuredClone(seedApprovals),
  events: structuredClone(activityEvents),
  notifications: structuredClone(seedNotifications),
  devices: structuredClone(seedDevices),
  nodePositions: {},
  briefing: { time: '08:00', days: [1, 2, 3, 4, 5, 6], channels: ['email', 'whatsapp'] } as BriefingSchedule,
  feedback: {},
});

export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const useDb = create<DbState>()(
  persist(
    (set) => {
      const write = (fn: (s: DbState) => Partial<DbState>) => set((s) => ({ ...fn(s), rev: s.rev + 1 }));
      return {
        rev: 0,
        ...seed(),

        upsertAgent: (agent) =>
          write((s) => ({
            agents: s.agents.some((a) => a.id === agent.id)
              ? s.agents.map((a) => (a.id === agent.id ? agent : a))
              : [...s.agents, agent],
          })),
        updateAgent: (id, patch) =>
          write((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
        removeAgent: (id) => write((s) => ({ agents: s.agents.filter((a) => a.id !== id) })),
        setTrust: (id, trust) =>
          write((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, trust } : a)) })),
        addDepartment: (dep) => write((s) => ({ departments: [...s.departments, dep] })),
        setConnectorStatus: (id, status) =>
          write((s) => ({
            connectors: s.connectors.map((c) =>
              c.id === id
                ? {
                    ...c,
                    status,
                    lastSync: status === 'connected' ? new Date().toISOString() : c.lastSync,
                    issues: status === 'connected' && c.status === 'needs-attention' ? [] : c.issues,
                  }
                : c,
            ),
          })),
        resolveApproval: (id, status, patch) =>
          write((s) => ({ approvals: s.approvals.map((a) => (a.id === id ? { ...a, ...patch, status } : a)) })),
        addApproval: (a) => write((s) => ({ approvals: [a, ...s.approvals] })),
        addEvent: (event) =>
          write((s) => ({
            events: [{ ...event, id: uid('evt'), at: new Date().toISOString() }, ...s.events].slice(0, 200),
          })),
        notify: (n) =>
          write((s) => ({
            notifications: [{ ...n, id: uid('ntf'), at: new Date().toISOString(), read: false }, ...s.notifications],
          })),
        markAllNotificationsRead: () =>
          write((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
        setDevices: (fn) => write((s) => ({ devices: fn(s.devices) })),
        setNodePosition: (id, pos) => write((s) => ({ nodePositions: { ...s.nodePositions, [id]: pos } })),
        clearNodePositions: () => write(() => ({ nodePositions: {} })),
        setBriefing: (b) => write((s) => ({ briefing: { ...s.briefing, ...b } })),
        setFeedback: (id, f) =>
          write((s) => {
            const next = { ...s.feedback };
            if (f) next[id] = f;
            else delete next[id];
            return { feedback: next };
          }),
        resetDemo: () => {
          usePortfolio.getState().reset();
          useOrgs.getState().reset();
          write(() => seed());
        },
      };
    },
    {
      name: 'agentforge-db',
      version: 2,
      // v1 -> v2 added departments, devices, layout, briefing and feedback.
      migrate: (persisted) => ({ ...seed(), ...(persisted as object) }),
    },
  ),
);
