import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentRecommendation, ID, Project, ProjectAgent, ProjectRun, RunLogEntry } from '@/types';
import { seedProjects } from '@/mocks/portfolio';
import { leadOf, outcomeSentence, statusAfterRun } from '@/lib/portfolio';

export type NewAgent = Pick<ProjectAgent, 'name' | 'role' | 'responsibility' | 'integrations'>;

/**
 * Portfolio state: industries are fixed, projects (use cases) are mutable.
 * Persisted separately from the main db so it can evolve on its own;
 * `resetDemo` in src/store/db.ts resets both.
 */
interface PortfolioState {
  projects: Project[];
  /** Not started → configuring: the lead agent is hired. */
  hireLead: (projectId: ID) => void;
  setParam: (projectId: ID, key: string, value: string) => void;
  connectIntegration: (projectId: ID, name: string) => void;
  addAgent: (projectId: ID, agent: NewAgent, fromRecommendation?: ID) => void;
  dismissRecommendation: (projectId: ID, recId: ID) => void;
  removeAgent: (projectId: ID, agentId: ID) => void;
  setPaused: (projectId: ID, paused: boolean) => void;
  /** Saves a finished run, appends the lead's outcome, and re-derives status. */
  finishRun: (projectId: ID, log: RunLogEntry[], startedAt: number) => void;
  resolveFinding: (projectId: ID, findingId: ID, status: 'approved' | 'escalated') => void;
  reset: () => void;
}

const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const usePortfolio = create<PortfolioState>()(
  persist(
    (set) => {
      const patch = (projectId: ID, fn: (p: Project) => Partial<Project>) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === projectId ? { ...p, ...fn(p) } : p)) }));

      return {
        projects: seedProjects(),

        hireLead: (projectId) =>
          patch(projectId, (p) => ({
            status: 'configuring',
            team: p.team.map((a) => ({ ...a, status: 'idle' })),
          })),
        setParam: (projectId, key, value) =>
          patch(projectId, (p) => ({ params: p.params.map((x) => (x.key === key ? { ...x, value } : x)) })),
        connectIntegration: (projectId, name) =>
          patch(projectId, (p) => ({
            integrations: p.integrations.map((i) => (i.name === name ? { ...i, status: 'connected' } : i)),
          })),
        addAgent: (projectId, agent, fromRecommendation) =>
          patch(projectId, (p) => {
            const lead = leadOf(p);
            const created: ProjectAgent = {
              ...agent,
              id: id(`${p.id}-agt`),
              kind: 'specialist',
              parentId: lead?.id,
              status: p.status === 'live' || p.status === 'issue' ? 'working' : 'idle',
              departmentId: 'dep-ops',
            };
            return {
              team: [...p.team, created],
              recommendations: fromRecommendation ? p.recommendations.filter((r) => r.id !== fromRecommendation) : p.recommendations,
            };
          }),
        dismissRecommendation: (projectId, recId) =>
          patch(projectId, (p) => ({ recommendations: p.recommendations.filter((r) => r.id !== recId) })),
        removeAgent: (projectId, agentId) =>
          patch(projectId, (p) => ({ team: p.team.filter((a) => a.id !== agentId || a.kind === 'lead') })),
        setPaused: (projectId, paused) =>
          patch(projectId, (p) => ({ paused, team: p.team.map((a) => ({ ...a, status: paused ? 'paused' : 'working' })) })),
        finishRun: (projectId, log, startedAt) =>
          patch(projectId, (p) => {
            const lead = leadOf(p);
            const ran: Project = { ...p, runs: [...p.runs, {} as ProjectRun] };
            const outcome = outcomeSentence(ran);
            const full: RunLogEntry[] = lead
              ? [...log, { id: id('log'), at: new Date().toISOString(), agentId: lead.id, kind: 'result', text: outcome }]
              : log;
            const run: ProjectRun = {
              id: id('run'),
              startedAt: new Date(startedAt).toISOString(),
              durationMs: Date.now() - startedAt,
              log: full,
              outcome,
              findingsCount: p.findings.filter((f) => f.status === 'open').length,
              costUsd: Number((0.18 + full.length * 0.031).toFixed(2)),
            };
            return {
              runs: [...p.runs, run].slice(-20),
              status: statusAfterRun(p),
              paused: false,
              team: p.team.map((a) => ({ ...a, status: 'working' })),
            };
          }),
        resolveFinding: (projectId, findingId, status) =>
          patch(projectId, (p) => {
            const findings = p.findings.map((f) => (f.id === findingId ? { ...f, status } : f));
            const next = { ...p, findings };
            return { findings, status: p.runs.length ? statusAfterRun(next) : p.status };
          }),
        reset: () => set({ projects: seedProjects() }),
      };
    },
    { name: 'agentforge-portfolio', version: 1 },
  ),
);

export const recommendationToAgent = (r: AgentRecommendation): NewAgent => ({
  name: r.name,
  role: r.role,
  responsibility: r.responsibility,
  integrations: r.integrations,
});
