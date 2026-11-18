import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { reportFallback, useAi } from '@/ai';
import { frameJob, refineAnswer } from '@/features/builder/ai';
import {
  currentStep,
  genericScript,
  interviewReducer,
  isWeatherProblem,
  matchChoices,
  retailWeatherScript,
  startInterview,
  type InterviewEvent,
  type AiFraming,
  type InterviewState,
  type Script,
} from '@/features/builder/interview';
import { roleTemplates } from '@/mocks';
import type { AgentMode } from '@/types';

export interface SessionConfig {
  problem?: string;
  templateId?: string;
  /** Set once the local model has framed a free-form problem. */
  ai?: AiFraming;
}

export interface AdvancedSettings {
  systemPrompt: string;
  tools: Record<string, boolean>;
  model: string;
  temperature: number;
}

export const AVAILABLE_TOOLS = [
  { id: 'sql', label: 'Query sales data', description: 'Read-only SQL over connected sources' },
  { id: 'forecast', label: 'Forecasting', description: 'Time-series forecasting toolkit' },
  { id: 'web', label: 'Web search', description: 'Look up local news and events' },
  { id: 'email', label: 'Send email', description: 'Deliver briefings by email' },
  { id: 'whatsapp', label: 'Send WhatsApp', description: 'Deliver briefings to your phone' },
  { id: 'orders', label: 'Edit purchase orders', description: 'Change stock orders (needs approval)' },
] as const;

export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'Most capable, higher cost' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'Balanced (recommended)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', note: 'Fastest, lowest cost' },
] as const;

/** Rebuilds the script from persisted config (functions cannot be stored). */
export function resolveScript(config: SessionConfig): Script {
  const template = roleTemplates.find((t) => t.id === config.templateId);
  if (template?.id === 'tpl-env') return retailWeatherScript();
  if (template) return genericScript({ template });
  if (!config.problem || isWeatherProblem(config.problem)) return retailWeatherScript(config.problem);
  return genericScript({ problem: config.problem, ai: config.ai });
}

/** Free-form problems (not the curated weather demo or a template) are framed by the model. */
const needsFraming = (config: SessionConfig) => !!config.problem && !config.templateId && !isWeatherProblem(config.problem);

/** Bumped on every new session so late model replies for an old session are ignored. */
let session = 0;

interface BuilderState {
  config: SessionConfig;
  interview: InterviewState;
  mode: AgentMode;
  advanced: AdvancedSettings;
  built: boolean;
  tested: boolean;
  hiredAgentId?: string;
  /** The local model is working on the next message. */
  pending: boolean;
  begin: (config: SessionConfig, mode?: AgentMode) => void;
  send: (event: InterviewEvent) => void;
  setMode: (mode: AgentMode) => void;
  setAdvanced: (patch: Partial<AdvancedSettings>) => void;
  markBuilt: () => void;
  markTested: () => void;
  markHired: (id: string) => void;
}

const defaultAdvanced = (): AdvancedSettings => ({
  systemPrompt: '',
  tools: { sql: true, forecast: true, web: true, email: true, whatsapp: true, orders: false },
  model: 'claude-sonnet-5-5',
  temperature: 0.3,
});

export const useBuilder = create<BuilderState>()(
  persist(
    (set, get) => ({
      config: {},
      interview: startInterview(retailWeatherScript()),
      mode: 'company',
      advanced: defaultAdvanced(),
      built: false,
      tested: false,
      hiredAgentId: undefined,
      pending: false,
      begin: (config, mode) => {
        const id = ++session;
        const frame = needsFraming(config) && useAi.getState().provider === 'local';
        const interview = startInterview(resolveScript(config));
        set({
          config,
          // While the model frames the role, the chat shows only a typing indicator.
          interview: frame ? { ...interview, messages: [] } : interview,
          pending: frame,
          mode: mode ?? get().mode,
          advanced: defaultAdvanced(),
          built: false,
          tested: false,
          hiredAgentId: undefined,
        });
        if (!frame || !config.problem) return;
        frameJob(config.problem)
          .catch((e: unknown) => {
            reportFallback(e);
            return undefined;
          })
          .then((ai) => {
            if (id !== session) return;
            const next = ai ? { ...config, ai } : config;
            set({ config: next, interview: startInterview(resolveScript(next)), pending: false });
          });
      },
      send: (event) => {
        const s = get();
        if (s.pending) return;
        const script = resolveScript(s.config);
        const step = currentStep(script, s.interview);
        const typed = event.type === 'TEXT' ? event.text.trim() : '';
        // Chips and answers the keyword rules understand keep their scripted replies; the model reads the rest.
        if (!step || !typed || step.id === 'name' || matchChoices(step, typed).length || useAi.getState().provider !== 'local') {
          set({ interview: interviewReducer(script, s.interview, event) });
          return;
        }
        const id = session;
        const at = s.interview.messages.length;
        const userMessage = { id: at, from: 'user' as const, text: typed, stepId: step.id };
        set({ interview: { ...s.interview, messages: [...s.interview.messages, userMessage] }, pending: true });
        refineAnswer({ problem: s.config.problem, step, answer: typed, draft: s.interview.draft })
          .catch((e: unknown) => {
            reportFallback(e);
            return undefined;
          })
          .then((r) => {
            if (id !== session) return;
            // The rules still apply the answer: as the quick replies the model picked, or as free text.
            const next = interviewReducer(
              script,
              s.interview,
              r?.choiceIds.length ? { type: 'ANSWER', choiceIds: r.choiceIds } : { type: 'TEXT', text: typed },
            );
            const messages = next.messages.map((m) => (m.id === at ? { ...m, text: typed } : m));
            const reply = messages[messages.length - 1];
            if (!r || !reply || reply.from !== 'ai') return set({ interview: { ...next, messages }, pending: false });
            // Keep the scripted follow-up question; replace only the acknowledgement before it.
            const followUp = reply.text.split('\n\n').slice(1).join('\n\n');
            const text = followUp ? `${r.ack}\n\n${followUp}` : r.ack;
            const { extraOutputs, ...patch } = r.patch;
            set({
              interview: {
                ...next,
                draft: { ...next.draft, ...patch, outputs: [...new Set([...(next.draft.outputs ?? []), ...extraOutputs])].slice(0, 7) },
                messages: [...messages.slice(0, -1), { ...reply, text }],
              },
              pending: false,
            });
          });
      },
      setMode: (mode) => set({ mode }),
      setAdvanced: (patch) => set((s) => ({ advanced: { ...s.advanced, ...patch } })),
      markBuilt: () => set({ built: true }),
      markTested: () => set({ tested: true }),
      markHired: (hiredAgentId) => set({ hiredAgentId }),
    }),
    {
      name: 'agentforge-builder',
      version: 1,
      partialize: ({ pending: _pending, ...rest }) => rest,
      // A reload while the model was working leaves the chat without the AI's next message: restore it.
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as Partial<BuilderState>) };
        const { interview, config } = state;
        const script = resolveScript(config);
        if (!interview.messages.length) return { ...state, interview: startInterview(script) };
        const last = interview.messages[interview.messages.length - 1];
        const step = currentStep(script, interview);
        if (last?.from === 'user' && step) {
          const message = { id: interview.messages.length, from: 'ai' as const, text: step.question, stepId: step.id };
          return { ...state, interview: { ...interview, messages: [...interview.messages, message] } };
        }
        return state;
      },
    },
  ),
);
