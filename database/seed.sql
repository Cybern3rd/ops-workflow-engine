-- Seed data for ops-workflow-engine.org
-- 12 Agents + initial sprints

-- Insert agents (tokens will be generated and updated via API)
INSERT OR IGNORE INTO agents (id, name, emoji, color, role, api_token, created_at) VALUES
  ('neo', 'Neo', '🦞', '#FF6B6B', 'Orchestrator / Program Manager', 'neo_temp_token_' || hex(randomblob(16)), strftime('%s', 'now')),
  ('marcus', 'Marcus', '💰', '#4ECDC4', 'Revenue & Growth', 'marcus_temp_token_' || hex(randomblob(16)), strftime('%s', 'now')),
  ('sofia', 'Sofia', '📝', '#45B7D1', 'Content Creator', 'sofia_temp_token_' || hex(randomblob(16)), strftime('%s', 'now')),
  ('kenji', 'Kenji', '💻', '#96CEB4', 'Software Engineer', 'kenji_temp_token_' || hex(randomblob(16)), strftime('%s', 'now')),
  ('aisha', 'Aisha', '🛠️', '#FFEAA7', 'Infrastructure Engineer', 'aisha_temp_token_' || hex(randomblob(16)), strftime('%s', 'now')),
  ('dr-elena', 'Dr. Elena', '🏥', '#DFE6E9', 'Medical AI Specialist', 'elena_temp_token_' || hex(randomblob(16)), strftime('%s', 'now')),
  ('priya', 'Priya', '🔬', '#74B9FF', 'Research Scientist', 'priya_temp_token_' || hex(randomblob(16)), strftime('%s', 'now')),
  ('jackson', 'Jackson', '🚨', '#FD79A8', 'Security Researcher', 'jackson_temp_token_' || hex(randomblob(16)), strftime('%s', 'now')),
  ('maya', 'Maya', '🎥', '#A29BFE', 'Media Production', 'maya_temp_token_' || hex(randomblob(16)), strftime('%s', 'now')),
  ('david', 'David', '🤝', '#FD9644', 'Sales & Clients', 'david_temp_token_' || hex(randomblob(16)), strftime('%s', 'now')),
  ('zara', 'Zara', '💡', '#FD79A8', 'Creative Strategist', 'zara_temp_token_' || hex(randomblob(16)), strftime('%s', 'now')),
  ('sarah', 'Sarah', '📚', '#636E72', 'Archivist', 'sarah_temp_token_' || hex(randomblob(16)), strftime('%s', 'now'));

-- Insert initial sprints
INSERT OR IGNORE INTO sprints (id, name, start_date, end_date, status, created_at) VALUES
  ('week-7-2026', 'Week 7 (Feb 10-16, 2026)', '2026-02-10', '2026-02-16', 'completed', strftime('%s', 'now')),
  ('week-8-2026', 'Week 8 (Feb 17-23, 2026)', '2026-02-17', '2026-02-23', 'active', strftime('%s', 'now')),
  ('week-9-2026', 'Week 9 (Feb 24-Mar 2, 2026)', '2026-02-24', '2026-03-02', 'planning', strftime('%s', 'now'));

-- Insert sample task
INSERT OR IGNORE INTO tasks (id, title, description, status, priority, category, assigned_to, sprint, created_at, updated_at, created_by, position) VALUES
  ('welcome-task', 'Welcome to ops.workflow-engine.org! 🚀', 'This is your new task management dashboard. Drag tasks between columns, assign to agents, and track progress in real-time.', 'to-do', 'p2-medium', 'Development', 'neo', 'week-8-2026', strftime('%s', 'now'), strftime('%s', 'now'), 'system', 0);

-- Insert activity for welcome task
INSERT OR IGNORE INTO activity (id, task_id, agent_id, action, details, timestamp) VALUES
  ('welcome-activity', 'welcome-task', 'neo', 'created', '{"message": "Dashboard initialized"}', strftime('%s', 'now'));
