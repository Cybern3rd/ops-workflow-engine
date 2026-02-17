-- ops-workflow-engine.org Database Schema
-- Cloudflare D1 (SQLite)

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK(status IN ('to-do', 'in-progress', 'done', 'blocked')) DEFAULT 'to-do',
  priority TEXT NOT NULL CHECK(priority IN ('p1-high', 'p2-medium', 'p3-low')) DEFAULT 'p2-medium',
  category TEXT,
  assigned_to TEXT,
  sprint TEXT,
  due_date TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  tags TEXT, -- JSON array stored as text
  attachments TEXT, -- JSON array of GitHub URLs
  position INTEGER DEFAULT 0
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
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
CREATE TABLE IF NOT EXISTS activity (
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
CREATE TABLE IF NOT EXISTS sprints (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  status TEXT CHECK(status IN ('planning', 'active', 'completed')) DEFAULT 'planning',
  created_at INTEGER NOT NULL
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(id),
  FOREIGN KEY(agent_id) REFERENCES agents(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(status, position);
CREATE INDEX IF NOT EXISTS idx_activity_task ON activity(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
