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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Name',
};

// Helper to add CORS to any response
function withCors(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// Utility: Generate ID
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Utility: Get agent ID from auth header or X-Agent-Name header
async function verifyToken(request: Request, env: Env): Promise<string | null> {
  // Check for Bearer token first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const result = await env.DB.prepare(
      'SELECT id FROM agents WHERE api_token = ? AND active = 1'
    ).bind(token).first();
    
    if (result?.id) return result.id as string;
  }
  
  // Fall back to X-Agent-Name header (for browser clients)
  const agentName = request.headers.get('X-Agent-Name');
  if (agentName) {
    return agentName.toLowerCase().replace(/\s+/g, '-');
  }
  
  return null;
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
  
  // Log activity (best effort - don't fail if activity log fails)
  try {
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
  } catch (e) {
    console.error('Activity log failed:', e);
  }
  
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
  
  // Log activity (best effort)
  try {
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
  } catch (e) {
    console.error('Activity log failed:', e);
  }

  return new Response(JSON.stringify({ success: true, updated_at: now }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// DELETE /api/tasks/:id - Delete task
async function deleteTask(id: string, env: Env, agentId: string): Promise<Response> {
  await env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM activity WHERE task_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM comments WHERE task_id = ?').bind(id).run();
  
  // Broadcast (disabled - causing 500 errors)
  // TODO: Fix Durable Object broadcast
  
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
  
  // Broadcast (disabled - causing 500 errors)
  // TODO: Fix Durable Object broadcast

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

// POST /api/documents/upload - Upload document to GitHub
async function uploadDocument(request: Request, env: Env, agentId: string): Promise<Response> {
  const body = await request.json() as any;
  const { task_id, filename, content, message } = body;

  if (!task_id || !filename || !content) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // GitHub API: Create/update file
    const path = `docs/${task_id}/${filename}`;
    const githubUrl = `https://api.github.com/repos/Cybern3rd/ops-workflow-engine-docs/contents/${path}`;
    
    const githubResponse = await fetch(githubUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ops-workflow-engine',
      },
      body: JSON.stringify({
        message: message || `Upload ${filename} for task ${task_id}`,
        content: btoa(content), // Base64 encode
        committer: {
          name: 'ops-workflow-engine',
          email: 'neo_pm@agentmail.to',
        },
      }),
    });

    if (!githubResponse.ok) {
      const error = await githubResponse.text();
      throw new Error(`GitHub API error: ${error}`);
    }

    const githubData = await githubResponse.json() as any;
    const fileUrl = githubData.content.html_url;

    // Update task with attachment
    const task = await env.DB.prepare('SELECT attachments FROM tasks WHERE id = ?').bind(task_id).first();
    const attachments = task?.attachments ? JSON.parse(task.attachments as string) : [];
    attachments.push({
      filename,
      url: fileUrl,
      uploaded_by: agentId,
      uploaded_at: Math.floor(Date.now() / 1000),
    });

    await env.DB.prepare(
      'UPDATE tasks SET attachments = ?, updated_at = ? WHERE id = ?'
    ).bind(JSON.stringify(attachments), Math.floor(Date.now() / 1000), task_id).run();

    // Log activity
    await env.DB.prepare(
      'INSERT INTO activity (id, task_id, agent_id, action, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(),
      task_id,
      agentId,
      'document_uploaded',
      JSON.stringify({ filename, url: fileUrl }),
      Math.floor(Date.now() / 1000)
    ).run();

    return new Response(JSON.stringify({ url: fileUrl, path }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

// GET /api/documents/list/:task_id - List task documents
async function listDocuments(taskId: string, env: Env): Promise<Response> {
  const task = await env.DB.prepare('SELECT attachments FROM tasks WHERE id = ?').bind(taskId).first();
  
  if (!task || !task.attachments) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const attachments = JSON.parse(task.attachments as string);
  
  return new Response(JSON.stringify(attachments), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// GET /api/sprints - List all sprints
async function listSprints(env: Env): Promise<Response> {
  const result = await env.DB.prepare('SELECT * FROM sprints ORDER BY start_date DESC').all();
  
  return new Response(JSON.stringify(result.results), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// POST /api/sprints - Create sprint
async function createSprint(request: Request, env: Env, agentId: string): Promise<Response> {
  const body = await request.json() as any;
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    'INSERT INTO sprints (id, name, start_date, end_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    id,
    body.name || 'Untitled Sprint',
    body.start_date || null,
    body.end_date || null,
    body.status || 'planning',
    now
  ).run();

  return new Response(JSON.stringify({ id, ...body, created_at: now }), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// PATCH /api/sprints/:id - Update sprint
async function updateSprint(id: string, request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  const updates: string[] = [];
  const params: any[] = [];

  if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
  if (body.start_date !== undefined) { updates.push('start_date = ?'); params.push(body.start_date); }
  if (body.end_date !== undefined) { updates.push('end_date = ?'); params.push(body.end_date); }
  if (body.status !== undefined) { updates.push('status = ?'); params.push(body.status); }

  params.push(id);

  await env.DB.prepare(
    `UPDATE sprints SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return new Response(JSON.stringify({ success: true }), {
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
    if ((path === '/api/agents' || path === '/agents') && request.method === 'GET') {
      return withCors(await listAgents(env));
    }
    
    // Try to verify token, but allow anonymous access
    let agentId = await verifyToken(request, env);
    if (!agentId) {
      // For now, allow anonymous access with a default agent
      // TODO: Add proper auth flow later
      agentId = 'anonymous';
    }
    
    // Task routes
    if (path === '/api/tasks') {
      if (request.method === 'GET') return withCors(await listTasks(request, env));
      if (request.method === 'POST') return withCors(await createTask(request, env, agentId));
    }
    
    const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskMatch) {
      const taskId = taskMatch[1];
      if (request.method === 'GET') return withCors(await getTask(taskId, env));
      if (request.method === 'PATCH') return withCors(await updateTask(taskId, request, env, agentId));
      if (request.method === 'DELETE') return withCors(await deleteTask(taskId, env, agentId));
    }
    
    // Activity
    if (path === '/api/activity' && request.method === 'GET') {
      return withCors(await getActivity(request, env));
    }
    
    // Comments
    if (path === '/api/comments' && request.method === 'POST') {
      return withCors(await addComment(request, env, agentId));
    }
    
    const commentsMatch = path.match(/^\/api\/comments\/task\/([^/]+)$/);
    if (commentsMatch && request.method === 'GET') {
      return withCors(await getComments(commentsMatch[1], env));
    }
    
    // Documents
    if (path === '/api/documents/upload' && request.method === 'POST') {
      return withCors(await uploadDocument(request, env, agentId));
    }
    
    const docsListMatch = path.match(/^\/api\/documents\/list\/([^/]+)$/);
    if (docsListMatch && request.method === 'GET') {
      return withCors(await listDocuments(docsListMatch[1], env));
    }
    
    // Sprints
    if (path === '/api/sprints') {
      if (request.method === 'GET') return withCors(await listSprints(env));
      if (request.method === 'POST') return withCors(await createSprint(request, env, agentId));
    }
    
    const sprintMatch = path.match(/^\/api\/sprints\/([^/]+)$/);
    if (sprintMatch && request.method === 'PATCH') {
      return withCors(await updateSprint(sprintMatch[1], request, env));
    }
    
    // WebSocket - support both /ws and /api/ws
    if (path === '/ws' || path === '/api/ws') {
      // Upgrade to WebSocket via Durable Object
      const doId = env.TASK_BOARD.idFromName('main-board');
      const stub = env.TASK_BOARD.get(doId);
      return stub.fetch(request);
    }
    
    return withCors(new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }));
  },
};
