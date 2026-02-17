import { create } from 'zustand';
import { api } from '../lib/api';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'to-do' | 'in-progress' | 'done' | 'blocked';
  priority: 'p1-high' | 'p2-medium' | 'p3-low';
  category?: string;
  assigned_to?: string;
  sprint?: string;
  due_date?: string;
  created_at: number;
  updated_at: number;
  position: number;
}

interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  loadTasks: () => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, position: number) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  loadTasks: async () => {
    set({ loading: true, error: null });
    try {
      const tasks = await api.getTasks();
      set({ tasks, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createTask: async (task) => {
    try {
      const newTask = await api.createTask(task);
      set((state) => ({ tasks: [...state.tasks, newTask] }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateTask: async (id, updates) => {
    try {
      await api.updateTask(id, updates);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteTask: async (id) => {
    try {
      await api.deleteTask(id);
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  moveTask: async (id, position) => {
    try {
      await api.updateTask(id, { position });
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, position } : t)),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },
}));
