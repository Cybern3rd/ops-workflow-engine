# ops.workflow-engine.org Architecture Document

**Version:** 1.0  
**Author:** Kenji (Code Builder Agent)  
**Date:** 2026-02-17  
**Status:** Phase 1 - Architecture Design  

---

## 1. Executive Summary

ops.workflow-engine.org is a custom task/project management dashboard designed for the OpenClaw agent team. It combines the visual simplicity of Trello's Kanban boards with Notion's flexibility and structured data capabilities.

**Key Design Principles:**
- Zero-cost infrastructure (Cloudflare free tier)
- Real-time collaboration via WebSockets
- Mobile-first, dark-mode-ready UI
- API-first design for agent automation
- GitHub-native document storage

---

## 2. Frontend Architecture

### 2.1 Framework Choice: Astro + React Islands

**Why Astro 4.x?**
- **Zero JS by default**: Static HTML ships with no JavaScript unless needed
- **Islands Architecture**: Interactive React components only hydrate where required
- **Cloudflare Pages native**: First-class adapter for Workers integration
- **Content Collections**: Type-safe data handling for task templates
- **View Transitions API**: Native browser transitions for buttery-smooth navigation

**Why React for Islands?**
- **@dnd-kit/core**: Best-in-class drag-and-drop with accessibility
- **Mature ecosystem**: react-query, zustand for state management
- **Team familiarity**: Agents can contribute to React components

### 2.2 UI Component Strategy

```
/src
├── components/
│   ├── islands/           # Hydrated React components
│   │   ├── KanbanBoard.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskModal.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── SprintTimeline.tsx
│   │   └── QuickTaskForm.tsx
│   └── static/            # Astro components (no JS)
│       ├── Header.astro
│       ├── Sidebar.astro
│       ├── AgentAvatar.astro
│       └── PriorityBadge.astro
├── layouts/
│   └── Dashboard.astro
├── pages/
│   ├── index.astro        # Kanban board
│   ├── timeline.astro     # Sprint/timeline view
│   ├── activity.astro     # Activity feed
│   └── api/[...route].ts  # API routes (Workers)
└── styles/
    └── global.css         # Tailwind CSS
```

### 2.3 Key Dependencies

```json
{
  "dependencies": {
    "astro": "^4.15.0",
    "@astrojs/react": "^3.6.0",
    "@astrojs/cloudflare": "^11.0.0",
    "@astrojs/tailwind": "^5.1.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@tanstack/react-query": "^5.50.0",
    "zustand": "^4.5.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.400.0"
  }
}
```

### 2.4 Design System (2026 Trends)

**Visual Style:**
- **Glassmorphism 2.0**: Subtle frosted glass effects with depth
- **Bento Grid**: Modular, card-based layouts
- **Micro-interactions**: Spring animations on drag, subtle haptic feedback cues
- **Variable fonts**: Inter Variable for performance + flexibility
- **Color system**: HSL-based with CSS custom properties for theme switching

**Color Palette:**
```css
:root {
  /* Light mode */
  --bg-primary: hsl(220, 20%, 98%);
  --bg-card: hsl(0, 0%, 100%);
  --text-primary: hsl(220, 20%, 10%);
  --accent: hsl(250, 90%, 60%);
  
  /* Priority colors */
  --p1-high: hsl(0, 85%, 60%);
  --p2-medium: hsl(35, 90%, 55%);
  --p3-low: hsl(145, 65%, 45%);
  
  /* Status colors */
  --status-todo: hsl(220, 15%, 70%);
  --status-progress: hsl(200, 90%, 50%);
  --status-done: hsl(145, 70%, 45%);
  --status-blocked: hsl(0, 70%, 55%);
}

[data-theme="dark"] {
  --bg-primary: hsl(220, 20%, 8%);
  --bg-card: hsl(220, 20%, 12%);
  --text-primary: hsl(220, 20%, 95%);
}
```

---

## 3. Backend Architecture

### 3.1 Cloudflare Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │   Workers    │◄──►│  D1 Database │    │   R2 (opt) │ │
│  │  (REST API)  │    │  (SQLite)    │    │  (assets)  │ │
│  └──────┬───────┘    └──────────────┘    └────────────┘ │
│         │                                                │
│  ┌──────▼───────┐    ┌──────────────┐                   │
│  │   Durable    │◄──►│  WebSocket   │                   │
│  │   Objects    │    │  Connections │                   │
│  │  (Rooms)     │    │              │                   │
│  └──────────────┘    └──────────────┘                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │      GitHub API         │
              │   (Document Storage)    │
              └─────────────────────────┘
```

### 3.2 Workers Architecture

**Main Worker (API Gateway):**
- Handles all REST API requests
- Authentication via API keys (for agents) and session cookies (for UI)
- Routes requests to appropriate handlers
- Manages GitHub API communication

**Durable Object: BoardRoom**
- One instance per board/view
- Manages WebSocket connections for that view
- Broadcasts real-time updates to all connected clients
- Persists transient state (cursor positions, who's viewing what)

### 3.3 D1 Database Schema

```sql
-- Core tables
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE sprints (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' 
        CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
    priority TEXT NOT NULL DEFAULT 'p2'
        CHECK (priority IN ('p1', 'p2', 'p3')),
    assigned_agent_id TEXT REFERENCES agents(id),
    category_id TEXT REFERENCES categories(id),
    sprint_id TEXT REFERENCES sprints(id),
    due_date TEXT,
    sort_order INTEGER DEFAULT 0,
    blocked_reason TEXT,
    github_doc_path TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE task_comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id TEXT REFERENCES agents(id),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE activity_log (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    agent_id TEXT REFERENCES agents(id),
    action TEXT NOT NULL,
    details TEXT, -- JSON blob for action-specific data
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_agent_id);
CREATE INDEX idx_tasks_sprint ON tasks(sprint_id);
CREATE INDEX idx_tasks_category ON tasks(category_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_task ON activity_log(task_id);

-- Seed data: Agents
INSERT INTO agents (id, name, emoji, color) VALUES
    ('neo', 'Neo', '🎯', '#6366f1'),
    ('marcus', 'Marcus', '📊', '#ec4899'),
    ('sofia', 'Sofia', '✨', '#f59e0b'),
    ('kenji', 'Kenji', '💻', '#10b981'),
    ('aisha', 'Aisha', '🔧', '#8b5cf6'),
    ('elena', 'Dr. Elena', '🧠', '#06b6d4'),
    ('priya', 'Priya', '📈', '#f97316'),
    ('jackson', 'Jackson', '🎨', '#84cc16'),
    ('maya', 'Maya', '🔍', '#14b8a6'),
    ('david', 'David', '📝', '#a855f7'),
    ('zara', 'Zara', '🚀', '#ef4444'),
    ('sarah', 'Sarah', '💬', '#3b82f6');

-- Seed data: Categories
INSERT INTO categories (id, name, color, icon, sort_order) VALUES
    ('development', 'Development', '#10b981', 'code', 1),
    ('content', 'Content', '#f59e0b', 'file-text', 2),
    ('revenue', 'Revenue', '#ec4899', 'dollar-sign', 3),
    ('infrastructure', 'Infrastructure', '#8b5cf6', 'server', 4),
    ('research', 'Research', '#06b6d4', 'search', 5),
    ('operations', 'Operations', '#6366f1', 'settings', 6);
```

### 3.4 Durable Object: BoardRoom

```typescript
// src/durable-objects/BoardRoom.ts

interface Connection {
  webSocket: WebSocket;
  agentId?: string;
  viewingTask?: string;
}

export class BoardRoom implements DurableObject {
  private connections: Map<string, Connection> = new Map();
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/websocket') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      
      const connectionId = crypto.randomUUID();
      this.connections.set(connectionId, { webSocket: server });
      
      server.accept();
      
      server.addEventListener('message', (event) => {
        this.handleMessage(connectionId, event.data as string);
      });
      
      server.addEventListener('close', () => {
        this.connections.delete(connectionId);
        this.broadcastPresence();
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not found', { status: 404 });
  }

  private handleMessage(connectionId: string, data: string) {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'identify':
        const conn = this.connections.get(connectionId);
        if (conn) {
          conn.agentId = message.agentId;
          this.broadcastPresence();
        }
        break;
        
      case 'task_update':
        // Broadcast to all other connections
        this.broadcast(data, connectionId);
        break;
        
      case 'cursor_move':
        this.broadcast(data, connectionId);
        break;
        
      case 'viewing_task':
        const connection = this.connections.get(connectionId);
        if (connection) {
          connection.viewingTask = message.taskId;
          this.broadcastPresence();
        }
        break;
    }
  }

  private broadcast(message: string, excludeId?: string) {
    for (const [id, conn] of this.connections) {
      if (id !== excludeId) {
        try {
          conn.webSocket.send(message);
        } catch (e) {
          this.connections.delete(id);
        }
      }
    }
  }

  private broadcastPresence() {
    const presence = Array.from(this.connections.values())
      .filter(c => c.agentId)
      .map(c => ({ agentId: c.agentId, viewingTask: c.viewingTask }));
    
    this.broadcast(JSON.stringify({ type: 'presence', data: presence }));
  }
}
```

---

## 4. API Design

### 4.1 REST Endpoints

**Base URL:** `https://ops.workflow-engine.org/api`

#### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | List all tasks (with filters) |
| GET | `/tasks/:id` | Get single task |
| POST | `/tasks` | Create new task |
| PATCH | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |
| POST | `/tasks/:id/move` | Move task (status/order change) |
| POST | `/tasks/:id/comments` | Add comment |

#### Query Parameters for GET /tasks

```
?status=todo,in_progress     # Filter by status (comma-separated)
?assigned=kenji,neo          # Filter by assigned agent
?category=development        # Filter by category
?sprint=sprint-2026-q1       # Filter by sprint
?priority=p1                 # Filter by priority
?search=api                  # Full-text search in title/description
?sort=created_at:desc        # Sort field and direction
?limit=50&offset=0           # Pagination
```

#### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/agents` | List all agents |
| GET | `/agents/:id` | Get agent details |
| GET | `/agents/:id/tasks` | Get agent's assigned tasks |

#### Activity

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/activity` | Get activity feed |
| GET | `/activity/daily` | Get daily summary |

#### Categories & Sprints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List categories |
| GET | `/sprints` | List sprints |
| POST | `/sprints` | Create sprint |
| PATCH | `/sprints/:id` | Update sprint |

### 4.2 Request/Response Examples

**Create Task:**
```http
POST /api/tasks
Content-Type: application/json
Authorization: Bearer <api_key>

{
  "title": "Implement real-time sync for Kanban",
  "description": "Add WebSocket support for live updates",
  "priority": "p1",
  "assigned_agent_id": "kenji",
  "category_id": "development",
  "sprint_id": "sprint-2026-q1",
  "due_date": "2026-02-20"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "task_abc123",
    "title": "Implement real-time sync for Kanban",
    "description": "Add WebSocket support for live updates",
    "status": "todo",
    "priority": "p1",
    "assigned_agent": {
      "id": "kenji",
      "name": "Kenji",
      "emoji": "💻"
    },
    "category": {
      "id": "development",
      "name": "Development"
    },
    "sprint_id": "sprint-2026-q1",
    "due_date": "2026-02-20",
    "sort_order": 0,
    "created_by": "ruben",
    "created_at": "2026-02-17T00:54:00Z",
    "updated_at": "2026-02-17T00:54:00Z"
  }
}
```

**Move Task (Drag & Drop):**
```http
POST /api/tasks/task_abc123/move
Content-Type: application/json

{
  "status": "in_progress",
  "sort_order": 2
}
```

### 4.3 Authentication

**For Agents (API Access):**
- Bearer token authentication
- Tokens stored in Cloudflare Worker secrets
- Each agent has unique API key

**For Web UI (Ruben):**
- Simple password-based auth
- Session stored in encrypted cookie
- Optional: Cloudflare Access for zero-trust

```typescript
// API key validation middleware
async function validateApiKey(request: Request, env: Env): Promise<string | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  
  const token = auth.slice(7);
  const agentId = await env.KV.get(`apikey:${token}`);
  return agentId;
}
```

### 4.4 WebSocket Protocol

**Connection URL:** `wss://ops.workflow-engine.org/ws/board`

**Message Types:**

```typescript
// Client → Server
interface IdentifyMessage {
  type: 'identify';
  agentId: string;
}

interface ViewingTaskMessage {
  type: 'viewing_task';
  taskId: string | null;
}

// Server → Client (and Client → Server for broadcasts)
interface TaskUpdateMessage {
  type: 'task_update';
  action: 'created' | 'updated' | 'deleted' | 'moved';
  task: Task;
  triggeredBy: string; // agent ID
}

interface PresenceMessage {
  type: 'presence';
  data: Array<{
    agentId: string;
    viewingTask?: string;
  }>;
}
```

---

## 5. GitHub Integration

### 5.1 Document Storage Strategy

Documents and attachments are stored in a dedicated GitHub repository rather than the VPS filesystem.

**Repository:** `sanagatek/ops-workflow-docs` (private)

**Structure:**
```
/
├── tasks/
│   ├── task_abc123/
│   │   ├── spec.md
│   │   ├── notes.md
│   │   └── attachments/
│   │       ├── diagram.png
│   │       └── data.csv
│   └── task_def456/
│       └── spec.md
├── sprints/
│   └── 2026-q1/
│       ├── goals.md
│       └── retrospective.md
└── templates/
    ├── task-spec.md
    └── sprint-goals.md
```

### 5.2 GitHub API Integration

```typescript
// src/lib/github.ts

interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

export class GitHubDocStore {
  private config: GitHubConfig;
  private baseUrl = 'https://api.github.com';

  constructor(config: GitHubConfig) {
    this.config = config;
  }

  async getFile(path: string): Promise<string | null> {
    const response = await fetch(
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          Accept: 'application/vnd.github.v3.raw',
        },
      }
    );
    
    if (!response.ok) return null;
    return response.text();
  }

  async putFile(path: string, content: string, message: string): Promise<boolean> {
    // Get current file SHA if exists (for updates)
    const existing = await this.getFileMeta(path);
    
    const body: any = {
      message,
      content: btoa(content), // Base64 encode
      branch: 'main',
    };
    
    if (existing?.sha) {
      body.sha = existing.sha;
    }

    const response = await fetch(
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    return response.ok;
  }

  async deleteFile(path: string, message: string): Promise<boolean> {
    const existing = await this.getFileMeta(path);
    if (!existing?.sha) return false;

    const response = await fetch(
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sha: existing.sha,
          branch: 'main',
        }),
      }
    );

    return response.ok;
  }

  private async getFileMeta(path: string): Promise<{ sha: string } | null> {
    const response = await fetch(
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
        },
      }
    );
    
    if (!response.ok) return null;
    const data = await response.json();
    return { sha: data.sha };
  }
}
```

### 5.3 Attachment Upload Flow

1. User uploads file via UI
2. Worker receives file as FormData
3. Worker uploads to GitHub via API (commits to repo)
4. Worker stores `github_doc_path` reference in D1 task record
5. File served via GitHub raw URL or cached through Workers

---

## 6. Real-Time Sync Strategy

### 6.1 Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser A     │     │   Browser B     │     │   Agent CLI     │
│   (Ruben)       │     │   (Another)     │     │   (Kenji)       │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ WebSocket             │ WebSocket             │ REST API
         │                       │                       │
         ▼                       ▼                       ▼
┌────────────────────────────────────────────────────────────────┐
│                      Cloudflare Worker                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Durable Object                         │  │
│  │                     (BoardRoom)                           │  │
│  │  - Manages WebSocket connections                          │  │
│  │  - Broadcasts updates to all clients                      │  │
│  │  - Tracks presence (who's viewing what)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   D1 Database   │
                    │   (Source of    │
                    │    Truth)       │
                    └─────────────────┘
```

### 6.2 Update Flow

**When task is modified via REST API:**
1. Worker validates and writes to D1
2. Worker sends update to Durable Object
3. Durable Object broadcasts to all WebSocket clients
4. Clients update local state (optimistic UI already applied)

**When task is modified via drag-drop:**
1. Client applies optimistic update immediately
2. Client sends PATCH request to API
3. API writes to D1, triggers broadcast
4. Other clients receive update via WebSocket
5. Original client ignores broadcast (already applied)

### 6.3 Conflict Resolution

Strategy: **Last Write Wins** with version tracking

```typescript
// Each task has updated_at timestamp
// On concurrent edits, latest timestamp wins
// Client can detect conflicts by comparing expected vs actual updated_at

interface TaskUpdate {
  id: string;
  expected_updated_at: string; // What client thinks current version is
  changes: Partial<Task>;
}

// If expected_updated_at doesn't match, return 409 Conflict
// Client can then fetch latest and merge/retry
```

---

## 7. Deployment Pipeline

### 7.1 Repository Structure

```
ops-workflow-engine/
├── .github/
│   └── workflows/
│       ├── deploy.yml           # Main deployment
│       └── preview.yml          # PR previews
├── src/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── lib/
│   │   ├── api/
│   │   ├── github.ts
│   │   └── realtime.ts
│   └── durable-objects/
│       └── BoardRoom.ts
├── public/
├── migrations/                  # D1 SQL migrations
│   ├── 0001_initial.sql
│   └── 0002_add_sprints.sql
├── wrangler.toml
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

### 7.2 wrangler.toml

```toml
name = "ops-workflow-engine"
main = "dist/_worker.js"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"

[[d1_databases]]
binding = "DB"
database_name = "ops-workflow-db"
database_id = "<will-be-generated>"

[[durable_objects.bindings]]
name = "BOARD_ROOM"
class_name = "BoardRoom"

[[migrations]]
tag = "v1"
new_classes = ["BoardRoom"]

[vars]
GITHUB_OWNER = "sanagatek"
GITHUB_REPO = "ops-workflow-docs"

# Secrets (set via wrangler secret put):
# - GITHUB_TOKEN
# - SESSION_SECRET
# - API_KEYS (JSON map of agent -> key)
```

### 7.3 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Run D1 Migrations
        run: npx wrangler d1 migrations apply ops-workflow-db --remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      
      - name: Deploy to Cloudflare Pages
        run: npx wrangler pages deploy dist --project-name=ops-workflow-engine
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 7.4 Environment Setup

**Cloudflare Resources to Create:**
1. Pages project: `ops-workflow-engine`
2. D1 database: `ops-workflow-db`
3. Custom domain: `ops.workflow-engine.org`
4. Workers secrets (via `wrangler secret put`)

**Commands for Aisha:**
```bash
# Create D1 database
wrangler d1 create ops-workflow-db

# Create Pages project
wrangler pages project create ops-workflow-engine

# Set secrets
wrangler secret put GITHUB_TOKEN
wrangler secret put SESSION_SECRET
wrangler secret put API_KEYS

# Deploy initial
npm run build && wrangler pages deploy dist --project-name=ops-workflow-engine

# Configure custom domain via Cloudflare dashboard
# DNS: CNAME ops.workflow-engine.org -> ops-workflow-engine.pages.dev
```

---

## 8. Performance Considerations

### 8.1 Caching Strategy

- **Static assets**: Immutable, long cache (1 year)
- **API responses**: No cache (real-time data)
- **Task list**: Client-side caching with react-query (stale-while-revalidate)
- **Agent avatars**: Cache in KV for fast lookups

### 8.2 Bundle Optimization

- Astro's islands mean minimal JS shipped
- React components code-split by route
- Tailwind CSS purged to ~10KB
- Total JS budget target: <50KB gzipped

### 8.3 D1 Query Optimization

- Indexes on frequently filtered columns
- Pagination on all list endpoints
- Denormalize agent/category names into task response (avoid JOINs where possible)

---

## 9. Security Considerations

### 9.1 Authentication Layers

| Access Type | Method | Notes |
|-------------|--------|-------|
| Web UI | Session cookie + CSRF | For Ruben's browser access |
| Agent API | Bearer token | Per-agent API keys |
| WebSocket | Token in URL param | Validated on connect |

### 9.2 Input Validation

- All inputs sanitized at API layer
- SQL parameterized (D1 handles this)
- Markdown content escaped before render
- File uploads validated (size, type limits)

### 9.3 Rate Limiting

- D1 has built-in rate limits (free tier: 100K reads/day, 10K writes/day)
- Add Worker-level rate limiting if needed
- WebSocket connections limited per IP

---

## 10. Phase 1 Implementation Checklist

### Week 1: Foundation
- [ ] Set up Astro project with Cloudflare adapter
- [ ] Configure D1 database and run migrations
- [ ] Implement basic REST API (tasks CRUD)
- [ ] Create seed data (agents, categories)

### Week 2: UI Core
- [ ] Build Kanban board layout (static)
- [ ] Implement drag-and-drop with @dnd-kit
- [ ] Create task card and modal components
- [ ] Add filter sidebar

### Week 3: Real-Time & Polish
- [ ] Implement Durable Object for WebSocket
- [ ] Connect frontend to real-time updates
- [ ] Add activity feed
- [ ] GitHub document integration

### Week 4: Deployment & Testing
- [ ] Set up CI/CD pipeline
- [ ] Configure custom domain
- [ ] Security audit
- [ ] Performance testing
- [ ] Documentation

---

## 11. Future Enhancements (Phase 2+)

- **AI Integration**: Auto-assign tasks based on agent skills
- **Notifications**: Discord/email alerts for assignments
- **Analytics Dashboard**: Velocity tracking, burndown charts
- **Recurring Tasks**: Template-based task generation
- **Mobile App**: React Native companion (optional)
- **Offline Support**: Service worker for offline viewing

---

## 12. Appendix

### A. Agent Skill Matrix (for future AI routing)

| Agent | Primary Skills |
|-------|----------------|
| Neo | Orchestration, Planning |
| Marcus | Analytics, Data |
| Sofia | Content, Writing |
| Kenji | Development, APIs |
| Aisha | Infrastructure, DevOps |
| Dr. Elena | Research, Analysis |
| Priya | Growth, Marketing |
| Jackson | Design, UI/UX |
| Maya | QA, Testing |
| David | Documentation |
| Zara | Deployment, Release |
| Sarah | Communication, Support |

### B. API Key Format

```
owf_<agent_id>_<random_32chars>
Example: owf_kenji_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

**Document Status:** ✅ Complete  
**Next Step:** Aisha deploys infrastructure per Section 7.4  
**Handoff:** @aisha -- Architecture ready for infrastructure deployment
