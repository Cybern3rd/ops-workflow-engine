# ops.workflow-engine.org - Complete Architecture

**Domain:** ops.workflow-engine.org  
**Repository:** https://github.com/Cybern3rd/ops-workflow-engine  
**Document Storage:** https://github.com/Cybern3rd/ops-workflow-engine-docs  
**Deployment:** Cloudflare Pages + Workers  

---

## Technology Stack

### Frontend
- **Framework:** Astro 4.x (for performance + SEO)
- **UI Library:** React 18 (for interactive components)
- **Drag & Drop:** @dnd-kit/core (modern, accessible)
- **Styling:** Tailwind CSS 4 (utility-first, dark mode)
- **State:** Zustand (lightweight, no boilerplate)
- **Real-time:** Native WebSocket API + Durable Objects

### Backend
- **API:** Cloudflare Workers (edge compute, 0ms cold start)
- **Database:** Cloudflare D1 (SQLite at edge)
- **Real-time:** Durable Objects (WebSocket, state management)
- **Auth:** JWT tokens (agent-specific, scoped permissions)
- **File Storage:** GitHub API (via Octokit)

### Infrastructure
- **Hosting:** Cloudflare Pages (automatic deployments)
- **DNS:** Cloudflare DNS (ops.workflow-engine.org)
- **CI/CD:** GitHub Actions → Cloudflare Pages
- **Cost:** $0 (free tier handles all traffic)

---

## Database Schema (D1 SQLite)

```sql
-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK(status IN ('to-do', 'in-progress', 'done', 'blocked')),
  priority TEXT NOT NULL CHECK(priority IN ('p1-high', 'p2-medium', 'p3-low')),
  category TEXT,
  assigned_to TEXT,
  sprint TEXT,
  due_date TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  tags TEXT, -- JSON array
  attachments TEXT, -- JSON array of GitHub URLs
  position INTEGER DEFAULT 0 -- for drag-and-drop ordering
);

-- Agents table
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT,
  color TEXT,
  role TEXT,
  api_token TEXT UNIQUE NOT NULL,
  active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- Activity log
CREATE TABLE activity (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT, -- JSON
  timestamp INTEGER NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(id),
  FOREIGN KEY(agent_id) REFERENCES agents(id)
);

-- Sprints/timelines
CREATE TABLE sprints (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  status TEXT CHECK(status IN ('planning', 'active', 'completed')),
  created_at INTEGER NOT NULL
);

-- Comments
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(id),
  FOREIGN KEY(agent_id) REFERENCES agents(id)
);

-- Indexes for performance
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_activity_task ON activity(task_id);
CREATE INDEX idx_activity_timestamp ON activity(timestamp DESC);
```

---

## API Endpoints (Cloudflare Workers)

### Authentication
- `POST /api/auth/token` - Generate agent token (admin only)
- `POST /api/auth/verify` - Verify token validity

### Tasks
- `GET /api/tasks` - List all tasks (with filters)
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/move` - Update task position (drag-and-drop)

### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get agent details
- `PATCH /api/agents/:id` - Update agent info

### Activity
- `GET /api/activity` - Get activity feed (paginated)
- `GET /api/activity/task/:id` - Get task-specific activity

### Sprints
- `GET /api/sprints` - List all sprints
- `POST /api/sprints` - Create sprint
- `PATCH /api/sprints/:id` - Update sprint

### Comments
- `GET /api/comments/task/:id` - Get task comments
- `POST /api/comments` - Add comment

### Documents (GitHub Integration)
- `POST /api/documents/upload` - Upload document to GitHub
- `GET /api/documents/:path` - Get document URL
- `GET /api/documents/list/:task_id` - List task documents

### Real-time
- `GET /api/ws` - WebSocket upgrade for real-time updates

---

## Real-time Architecture (Durable Objects)

### TaskBoardState (Durable Object)
- Maintains live WebSocket connections for all clients
- Broadcasts task updates to all connected clients
- Handles collaborative drag-and-drop conflicts
- Persists connection state

### Features
- When task updated: broadcast to all clients instantly
- When task moved: update positions, broadcast new order
- When comment added: broadcast to task viewers
- Connection recovery: automatic reconnect with state sync

---

## Frontend Structure

```
src/
├── pages/
│   ├── index.astro              # Main kanban board
│   ├── tasks/[id].astro         # Task detail view
│   ├── timeline.astro           # Sprint timeline view
│   └── activity.astro           # Activity feed
├── components/
│   ├── KanbanBoard.tsx          # Drag-and-drop board
│   ├── TaskCard.tsx             # Individual task card
│   ├── TaskModal.tsx            # Create/edit task modal
│   ├── ActivityFeed.tsx         # Live activity stream
│   ├── AgentPicker.tsx          # Agent assignment dropdown
│   ├── PriorityBadge.tsx        # Priority indicator
│   ├── StatusColumn.tsx         # Kanban column
│   └── DocumentUploader.tsx     # GitHub file upload
├── stores/
│   ├── tasksStore.ts            # Zustand task state
│   ├── agentsStore.ts           # Agent data
│   └── wsStore.ts               # WebSocket connection
├── lib/
│   ├── api.ts                   # API client
│   ├── websocket.ts             # WebSocket manager
│   └── github.ts                # GitHub integration
└── styles/
    └── global.css               # Tailwind + custom styles
```

---

## GitHub Document Storage

### Upload Flow
1. Agent completes task with deliverable (e.g., newsletter)
2. POST `/api/documents/upload` with file content
3. Backend uses Octokit to commit to `ops-workflow-engine-docs` repo
4. File stored at: `docs/{task_id}/{filename}`
5. GitHub URL returned and attached to task

### Access Flow
1. User clicks document attachment in task
2. Frontend redirects to GitHub raw URL
3. Ruben views document directly in GitHub UI

### Benefits
- Zero VPS storage usage
- Version control for all deliverables
- Public access for easy sharing
- GitHub's CDN for fast delivery

---

## Deployment Pipeline

### 1. GitHub Actions (CI/CD)
```yaml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: ops-workflow-engine
          directory: dist
```

### 2. Wrangler (Workers Deployment)
```bash
wrangler publish api/worker.ts
wrangler d1 execute ops-db --file=database/schema.sql
wrangler durable-objects publish
```

### 3. DNS Configuration
- `ops.workflow-engine.org` CNAME → `ops-workflow-engine.pages.dev`
- Auto SSL via Cloudflare

---

## Security

### Agent Authentication
- Each agent has unique API token
- Tokens stored in D1 database (hashed)
- JWT with agent_id, scopes, expiry
- Rate limiting per agent (100 req/min)

### Permissions
- All agents: Read all tasks, create/update assigned tasks
- Neo: Admin access (all operations)
- Ruben: Web UI access (no token needed, session auth)

### Data Protection
- All API requests over HTTPS
- WebSocket connections via WSS
- GitHub tokens stored in Workers secrets
- No sensitive data in frontend

---

## 2026 Design Trends

### Visual Style
- **Glassmorphism:** Frosted glass cards with blur effects
- **Neumorphism:** Soft shadows for depth
- **Bold Typography:** Large, readable fonts
- **Micro-interactions:** Smooth hover effects, animations
- **Dark Mode First:** Optimized for dark, light as option

### UX Features
- **Drag & Drop:** Smooth, physics-based animations
- **Keyboard Shortcuts:** Full keyboard navigation
- **Loading States:** Skeleton screens, not spinners
- **Empty States:** Helpful, action-oriented
- **Toast Notifications:** Non-intrusive feedback

### Performance
- **Lighthouse Score:** 100/100/100/100
- **First Paint:** <0.5s
- **Interactive:** <1s
- **Bundle Size:** <100KB (gzipped)

---

## Mobile Responsiveness

### Breakpoints
- Mobile: < 640px (single column, swipe navigation)
- Tablet: 640-1024px (two columns, touch-optimized)
- Desktop: > 1024px (full Kanban, keyboard shortcuts)

### Mobile Features
- Bottom sheet for task details
- Swipe actions (assign, priority, delete)
- Pull-to-refresh activity feed
- Native feel with smooth animations

---

## Phase 1 Implementation Order

1. ✅ Project setup (Astro + React + Tailwind)
2. ✅ Database schema (D1 setup)
3. ✅ API endpoints (Workers)
4. ✅ Task CRUD operations
5. ✅ Kanban board UI
6. ✅ Drag-and-drop functionality
7. ✅ Agent assignment
8. ✅ Priority/category filters
9. ✅ Real-time updates (Durable Objects + WebSocket)
10. ✅ Activity feed
11. ✅ GitHub document storage
12. ✅ Sprint/timeline view
13. ✅ Dark mode
14. ✅ Mobile responsive
15. ✅ Deployment + DNS

**Timeline:** Complete build in 24-48 hours (no MVP, full feature set)

---

## Cost Analysis

| Service | Usage | Cost |
|---------|-------|------|
| Cloudflare Pages | 500 builds/month | $0 |
| Cloudflare Workers | 100K req/day | $0 |
| D1 Database | 5GB storage | $0 |
| Durable Objects | 1M requests | $0 |
| GitHub Storage | 1GB repo size | $0 |
| **Total** | | **$0** |

All within free tier limits. Production-ready at zero cost.

---

**Built by:** Kenji (dev) + Aisha (infrastructure) + Neo (orchestration)  
**For:** Ruben + 12-agent team  
**Status:** Ready to build (architecture complete)
