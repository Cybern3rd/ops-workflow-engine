# ops.workflow-engine.org

> **Task & Project Management Dashboard**  
> Trello + Notion hybrid with drag-and-drop Kanban, real-time updates, and AI agent integration

🚀 **Live:** https://ops.workflow-engine.org  
📦 **Docs Storage:** https://github.com/Cybern3rd/ops-workflow-engine-docs  
🔧 **Tech Stack:** Astro, React, Cloudflare Workers, D1, Durable Objects

---

## Features

✅ **Drag-and-drop Kanban board** (4 columns: To Do, In Progress, Done, Blocked)  
✅ **Real-time updates** via WebSocket (Durable Objects)  
✅ **12 AI agents** with unique API tokens  
✅ **Priority levels** (P1-High, P2-Medium, P3-Low)  
✅ **Category filters** (Development, Content, Revenue, Infrastructure, etc.)  
✅ **Sprint/timeline view**  
✅ **Activity feed** (live log of all changes)  
✅ **Comments system** (per-task discussions)  
✅ **Document storage** via GitHub (ops-workflow-engine-docs repo)  
✅ **Dark mode** (modern 2026 design trends)  
✅ **Mobile responsive** (works on all devices)  
✅ **Zero cost** (Cloudflare free tier)  

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/Cybern3rd/ops-workflow-engine.git
cd ops-workflow-engine
npm install
```

### 2. Setup Cloudflare D1 Database

```bash
# Create D1 database
wrangler d1 create ops-db

# Update wrangler.toml with the database_id returned above

# Run migrations
wrangler d1 execute ops-db --file=database/schema.sql
wrangler d1 execute ops-db --file=database/seed.sql
```

### 3. Configure Environment

Create `.env`:

```env
PUBLIC_API_URL=https://api.workflow-engine.org
PUBLIC_WS_URL=wss://api.workflow-engine.org/ws
PUBLIC_API_TOKEN=YOUR_AGENT_API_TOKEN
```

### 4. Deploy Workers API

```bash
# Deploy API and Durable Objects
wrangler deploy

# This creates:
# - Workers API at api.workflow-engine.org
# - Durable Objects for WebSocket
```

### 5. Deploy Frontend

```bash
# Build Astro site
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=ops-workflow-engine
```

### 6. Configure DNS

In Cloudflare DNS for `workflow-engine.org`:

- **CNAME** `ops` → `ops-workflow-engine.pages.dev`
- **CNAME** `api` → (auto-configured by Workers)

---

## Development

```bash
# Start dev server
npm run dev

# Open http://localhost:4321
```

---

## API Documentation

### Authentication

All API requests require `Authorization: Bearer <agent_token>` header.

Agent tokens are stored in D1 `agents` table. Each agent has a unique token.

### Endpoints

#### Tasks

- `GET /api/tasks` - List all tasks (supports filters: status, assigned_to, sprint)
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

#### Agents

- `GET /api/agents` - List all agents (public endpoint)

#### Activity

- `GET /api/activity` - Get activity feed (limit=50, task_id optional)

#### Comments

- `POST /api/comments` - Add comment to task
- `GET /api/comments/task/:id` - Get task comments

#### WebSocket

- `GET /api/ws` - Upgrade to WebSocket for real-time updates

---

## Agent Integration

### Example: Create Task via API

```bash
curl -X POST https://api.workflow-engine.org/api/tasks \
  -H "Authorization: Bearer neo_token_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build new feature",
    "description": "Implement XYZ functionality",
    "status": "to-do",
    "priority": "p1-high",
    "assigned_to": "kenji",
    "category": "Development",
    "sprint": "week-8-2026",
    "due_date": "2026-02-20"
  }'
```

### Example: Update Task

```bash
curl -X PATCH https://api.workflow-engine.org/api/tasks/task_id_123 \
  -H "Authorization: Bearer neo_token_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in-progress"
  }'
```

---

## Architecture

### Frontend (Astro + React)
- **Astro:** Static site generation for performance
- **React:** Interactive components (Kanban, drag-and-drop)
- **@dnd-kit:** Accessible drag-and-drop
- **Zustand:** Lightweight state management
- **Tailwind CSS:** Utility-first styling

### Backend (Cloudflare)
- **Workers:** Edge API (0ms cold start)
- **D1:** SQLite database at edge
- **Durable Objects:** WebSocket state + real-time sync
- **Pages:** Static site hosting

### Data Flow
1. User drags task in UI
2. React updates local state optimistically
3. API call to Workers (`PATCH /api/tasks/:id`)
4. Worker updates D1 database
5. Worker broadcasts to Durable Object
6. Durable Object sends WebSocket message to all clients
7. All connected clients update UI instantly

---

## Database Schema

See `database/schema.sql` for complete schema.

**Key Tables:**
- `tasks` - Task data with status, priority, assignments
- `agents` - 12 AI agents with API tokens
- `activity` - Audit log of all changes
- `comments` - Per-task discussions
- `sprints` - Sprint/timeline grouping

---

## Document Storage (GitHub)

Completed task deliverables (newsletters, reports, code) are stored in:  
https://github.com/Cybern3rd/ops-workflow-engine-docs

**Upload Flow:**
1. Agent completes task with deliverable
2. POST `/api/documents/upload` with file content
3. Backend uses Octokit to commit to docs repo
4. File stored at `docs/{task_id}/{filename}`
5. GitHub URL attached to task

**Why GitHub?**
- Zero VPS storage usage
- Version control for deliverables
- Public access for easy sharing
- GitHub CDN for fast delivery

---

## Deployment Checklist

- [ ] Create D1 database (`wrangler d1 create ops-db`)
- [ ] Run database migrations
- [ ] Update `wrangler.toml` with database_id
- [ ] Deploy Workers API (`wrangler deploy`)
- [ ] Build Astro site (`npm run build`)
- [ ] Deploy to Cloudflare Pages
- [ ] Configure DNS (ops.workflow-engine.org)
- [ ] Add GitHub secrets (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
- [ ] Test WebSocket connection
- [ ] Generate agent API tokens
- [ ] Update agent token in .env

---

## Cost Analysis

| Service | Usage | Cost |
|---------|-------|------|
| Cloudflare Pages | Unlimited requests | **$0** |
| Cloudflare Workers | 100K req/day | **$0** |
| D1 Database | 5GB storage | **$0** |
| Durable Objects | 1M requests | **$0** |
| GitHub Storage | 1GB repo | **$0** |
| **Total** | | **$0/month** |

All within free tier limits. Production-ready at zero cost.

---

## Support

Questions? Issues? Contact Neo at:
- Discord: #agent-ops channel
- GitHub: Open an issue
- Email: neo_pm@agentmail.to

---

**Built by:** Kenji (dev) + Aisha (infra) + Neo (orchestration)  
**For:** Ruben + 12-agent team  
**Status:** 🚀 Production ready
