import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** `mock`: scripted replies (no model). `local`: a model served by Ollama on this machine. */
export type AiProvider = 'mock' | 'local';

/** Small models that run on a laptop CPU with 16 GB of RAM. */
export const RECOMMENDED_MODELS = [
  { name: 'qwen3:4b-instruct', note: 'Recommended: best quality at this size, answers directly (about 2.5 GB)' },
  { name: 'llama3.2:3b', note: 'Faster, a little weaker (about 2 GB)' },
  { name: 'gemma3:4b', note: 'Good writing style (about 3.3 GB)' },
  { name: 'qwen3:4b', note: 'Thinks before answering: better reasoning, but minutes per reply on a CPU' },
];

interface AiState {
  provider: AiProvider;
  model: string;
  setProvider: (p: AiProvider) => void;
  setModel: (m: string) => void;
}

export const useAi = create<AiState>()(
  persist(
    (set) => ({
      provider: 'local',
      model: 'qwen3:4b-instruct',
      setProvider: (provider) => set({ provider }),
      setModel: (model) => set({ model }),
    }),
    {
      name: 'agentforge-ai',
      version: 2,
      // v1 defaulted to qwen3:4b, which now always reasons first and is far too slow on a CPU.
      migrate: (persisted, version) => {
        const s = persisted as Partial<AiState>;
        return version < 2 && s.model === 'qwen3:4b' ? { ...s, model: 'qwen3:4b-instruct' } : s;
      },
    },
  ),
);
