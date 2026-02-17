export { TaskBoardState } from "./TaskBoardState";
// ops-workflow-engine.org API Worker
// Cloudflare Workers + D1 Database

interface Env {
  DB: D1Database;
  TASK_BOARD: DurableObjectNamespace;
  GITHUB_TOKEN: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Utility: Generate ID
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Utility: Verify agent token
async function verifyToken(request: Request, env: Env): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  const result = await env.DB.prepare(
    'SELECT id FROM agents WHERE api_token = ? AND active = 1'
  ).bind(token).first();
  
  return result?.id as string || null;
}

// GET /api/tasks - List all tasks
async function listTasks(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const assigned = url.searchParams.get('assigned_to');
  const sprint = url.searchParams.get('sprint');
  
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params: string[] = [];
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (assigned) {
    query += ' AND assigned_to = ?';
    params.push(assigned);
  }
  if (sprint) {
    query += ' AND sprint = ?';
    params.push(sprint);
  }
  
  query += ' ORDER BY position ASC, created_at DESC';
  
  const stmt = env.DB.prepare(query).bind(...params);
  const result = await stmt.all();
  
  return new Response(JSON.stringify(result.results), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// GET /api/tasks/:id - Get task details
async function getTask(id: string, env: Env): Promise<Response> {
  const task = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  
  if (!task) {
    return new Response(JSON.stringify({ error: 'Task not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  
  return new Response(JSON.stringify(task), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// POST /api/tasks - Create task
async function createTask(request: Request, env: Env, agentId: string): Promise<Response> {
  const body = await request.json() as any;
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  
  await env.DB.prepare(
    `INSERT INTO tasks (id, title, description, status, priority, category, assigned_to, sprint, 
     due_date, created_at, updated_at, created_by, tags, attachments, position) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.title || 'Untitled Task',
    body.description || '',
    body.status || 'to-do',
    body.priority || 'p2-medium',
    body.category || null,
    body.assigned_to || null,
    body.sprint || null,
    body.due_date || null,
    now,
    now,
    agentId,
    body.tags ? JSON.stringify(body.tags) : null,
    body.attachments ? JSON.stringify(body.attachments) : null,
    body.position || 0
  ).run();
  
  // Log activity
  await env.DB.prepare(
    'INSERT INTO activity (id, task_id, agent_id, action, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(),
    id,
    agentId,
    'created',
    JSON.stringify({ title: body.title }),
    now
  ).run();
  
  // Broadcast via Durable Object
  const doId = env.TASK_BOARD.idFromName('main-board');
  const stub = env.TASK_BOARD.get(doId);
  await stub.fetch('https://do/broadcast', {
    method: 'POST',
    body: JSON.stringify({ type: 'task_created', taskId: id }),
  });
  
  return new Response(JSON.stringify({ id, ...body, created_at: now }), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// PATCH /api/tasks/:id - Update task
async function updateTask(id: string, request: Request, env: Env, agentId: string): Promise<Response> {
  const body = await request.json() as any;
  const now = Math.floor(Date.now() / 1000);
  
  const updates: string[] = [];
  const params: any[] = [];
  
  if (body.title !== undefined) { updates.push('title = ?'); params.push(body.title); }
  if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description); }
  if (body.status !== undefined) { updates.push('status = ?'); params.push(body.status); }
  if (body.priority !== undefined) { updates.push('priority = ?'); params.push(body.priority); }
  if (body.category !== undefined) { updates.push('category = ?'); params.push(body.category); }
  if (body.assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(body.assigned_to); }
  if (body.sprint !== undefined) { updates.push('sprint = ?'); params.push(body.sprint); }
  if (body.due_date !== undefined) { updates.push('due_date = ?'); params.push(body.due_date); }
  if (body.tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(body.tags)); }
  if (body.attachments !== undefined) { updates.push('attachments = ?'); params.push(JSON.stringify(body.attachments)); }
  if (body.position !== undefined) { updates.push('position = ?'); params.push(body.position); }
  
  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);
  
  await env.DB.prepare(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();
  
  // Log activity
  await env.DB.prepare(
    'INSERT INTO activity (id, task_id, agent_id, action, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(),
    id,
    agentId,
    'updated',
    JSON.stringify(body),
    now
  ).run();
  
  // Broadcast
  const doId = env.TASK_BOARD.idFromName('main-board');
  const stub = env.TASK_BOARD.get(doId);
  await stub.fetch('https://do/broadcast', {
    method: 'POST',
    body: JSON.stringify({ type: 'task_updated', taskId: id, changes: body }),
  });
  
  return new Response(JSON.stringify({ success: true, updated_at: now }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// DELETE /api/tasks/:id - Delete task
async function deleteTask(id: string, env: Env, agentId: string): Promise<Response> {
  await env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM activity WHERE task_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM comments WHERE task_id = ?').bind(id).run();
  
  // Broadcast
  const doId = env.TASK_BOARD.idFromName('main-board');
  const stub = env.TASK_BOARD.get(doId);
  await stub.fetch('https://do/broadcast', {
    method: 'POST',
    body: JSON.stringify({ type: 'task_deleted', taskId: id }),
  });
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// GET /api/agents - List all agents
async function listAgents(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    'SELECT id, name, emoji, color, role, active FROM agents ORDER BY name'
  ).all();
  
  return new Response(JSON.stringify(result.results), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// GET /api/activity - Get activity feed
async function getActivity(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const taskId = url.searchParams.get('task_id');
  
  let query = 'SELECT * FROM activity';
  const params: any[] = [];
  
  if (taskId) {
    query += ' WHERE task_id = ?';
    params.push(taskId);
  }
  
  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);
  
  const result = await env.DB.prepare(query).bind(...params).all();
  
  return new Response(JSON.stringify(result.results), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// POST /api/comments - Add comment
async function addComment(request: Request, env: Env, agentId: string): Promise<Response> {
  const body = await request.json() as any;
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  
  await env.DB.prepare(
    'INSERT INTO comments (id, task_id, agent_id, content, timestamp) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, body.task_id, agentId, body.content, now).run();
  
  // Broadcast
  const doId = env.TASK_BOARD.idFromName('main-board');
  const stub = env.TASK_BOARD.get(doId);
  await stub.fetch('https://do/broadcast', {
    method: 'POST',
    body: JSON.stringify({ type: 'comment_added', taskId: body.task_id, commentId: id }),
  });
  
  return new Response(JSON.stringify({ id, timestamp: now }), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// GET /api/comments/task/:id - Get task comments
async function getComments(taskId: string, env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    'SELECT * FROM comments WHERE task_id = ? ORDER BY timestamp ASC'
  ).bind(taskId).all();
  
  return new Response(JSON.stringify(result.results), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// Main worker handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Routes
    const path = url.pathname;
    
    // Public routes (no auth)
    if (path === '/api/agents' && request.method === 'GET') {
      return listAgents(env);
    }
    
    // Protected routes (require auth)
    const agentId = await verifyToken(request, env);
    if (!agentId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // Task routes
    if (path === '/api/tasks') {
      if (request.method === 'GET') return listTasks(request, env);
      if (request.method === 'POST') return createTask(request, env, agentId);
    }
    
    const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskMatch) {
      const taskId = taskMatch[1];
      if (request.method === 'GET') return getTask(taskId, env);
      if (request.method === 'PATCH') return updateTask(taskId, request, env, agentId);
      if (request.method === 'DELETE') return deleteTask(taskId, env, agentId);
    }
    
    // Activity
    if (path === '/api/activity' && request.method === 'GET') {
      return getActivity(request, env);
    }
    
    // Comments
    if (path === '/api/comments' && request.method === 'POST') {
      return addComment(request, env, agentId);
    }
    
    const commentsMatch = path.match(/^\/api\/comments\/task\/([^/]+)$/);
    if (commentsMatch && request.method === 'GET') {
      return getComments(commentsMatch[1], env);
    }
    
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },
};
