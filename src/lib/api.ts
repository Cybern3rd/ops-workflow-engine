// API client for ops.workflow-engine.org
// Communicates with Cloudflare Workers backend

const API_BASE = import.meta.env.PUBLIC_API_URL || 'https://api.workflow-engine.org';
const API_TOKEN = import.meta.env.PUBLIC_API_TOKEN || '';

async function request(endpoint: string, options: RequestInit = {}) {
  // Get agent name from localStorage if available
  const agentName = typeof window !== 'undefined' ? localStorage.getItem('agent-name') : null;
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
      ...(agentName ? { 'X-Agent-Name': agentName } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || response.statusText);
  }

  return response.json();
}

export const api = {
  // Generic methods
  get: async <T = any>(endpoint: string): Promise<T> => {
    return request(endpoint);
  },

  post: async <T = any>(endpoint: string, data: any): Promise<T> => {
    return request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  patch: async <T = any>(endpoint: string, data: any): Promise<T> => {
    return request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async <T = any>(endpoint: string): Promise<T> => {
    return request(endpoint, {
      method: 'DELETE',
    });
  },

  // Tasks
  getTasks: async (filters?: { status?: string; assigned_to?: string; sprint?: string }) => {
    const params = new URLSearchParams(filters as any);
    return request(`/api/tasks?${params}`);
  },

  getTask: async (id: string) => {
    return request(`/api/tasks/${id}`);
  },

  createTask: async (task: any) => {
    return request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  updateTask: async (id: string, updates: any) => {
    return request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteTask: async (id: string) => {
    return request(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  // Agents
  getAgents: async () => {
    return request('/api/agents');
  },

  // Activity
  getActivity: async (limit = 50, taskId?: string) => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (taskId) params.append('task_id', taskId);
    return request(`/api/activity?${params}`);
  },

  // Comments
  addComment: async (taskId: string, content: string) => {
    return request('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ task_id: taskId, content }),
    });
  },

  getComments: async (taskId: string) => {
    return request(`/api/comments/task/${taskId}`);
  },

  // Sprints
  getSprints: async () => {
    return request('/api/sprints');
  },
};
