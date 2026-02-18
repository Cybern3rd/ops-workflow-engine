import { create } from 'zustand';
import { api } from '../lib/api';

interface Agent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  role: string;
  active: number;
}

interface AgentsState {
  agents: Agent[];
  loadAgents: () => Promise<void>;
  getAgent: (id: string) => Agent | undefined;
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
  agents: [],

  loadAgents: async () => {
    try {
      const agents = await api.get<Agent[]>('/agents');
      set({ agents });
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  },

  getAgent: (id: string) => {
    return get().agents.find(a => a.id === id);
  },
}));
