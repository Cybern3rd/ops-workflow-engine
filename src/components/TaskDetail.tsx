import { useEffect, useState } from 'react';
import { useTasksStore } from '../stores/tasksStore';
import { useAgentsStore } from '../stores/agentsStore';

interface TaskDetailProps {
  taskId: string;
}

const PRIORITY_OPTIONS = [
  { value: 'p1-high', label: '🔴 High Priority' },
  { value: 'p2-medium', label: '🟡 Medium Priority' },
  { value: 'p3-low', label: '🟢 Low Priority' },
];

const STATUS_OPTIONS = [
  { value: 'to-do', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
];

const CATEGORY_OPTIONS = [
  'Development',
  'Content',
  'Revenue',
  'Infrastructure',
  'Research',
  'Security',
  'Media',
  'Sales',
];

export default function TaskDetail({ taskId }: TaskDetailProps) {
  const { tasks, updateTask, deleteTask, loadTasks } = useTasksStore();
  const { agents, loadAgents } = useAgentsStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editedTask, setEditedTask] = useState<any>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const task = tasks.find(t => t.id === taskId);

  useEffect(() => {
    loadTasks();
    loadAgents();
  }, []);

  useEffect(() => {
    if (task && !editedTask) {
      setEditedTask({ ...task });
    }
  }, [task]);

  if (!task && tasks.length > 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Task not found</p>
          <a href="/" className="text-blue-400 hover:text-blue-300">
            ← Back to Kanban Board
          </a>
        </div>
      </div>
    );
  }

  if (!task || !editedTask) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateTask(taskId, {
        title: editedTask.title,
        description: editedTask.description,
        status: editedTask.status,
        priority: editedTask.priority,
        assigned_to: editedTask.assigned_to,
        category: editedTask.category,
        sprint: editedTask.sprint,
        due_date: editedTask.due_date,
      });
      setIsEditing(false);
    } catch (error) {
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask(taskId);
      window.location.href = '/';
    } catch (error) {
      setSaveError('Failed to delete task. Please try again.');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const assignedAgent = agents.find(a => a.id === task.assigned_to);
  const priority = PRIORITY_OPTIONS.find(p => p.value === task.priority);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{priority?.label.split(' ')[0]}</span>
          <span className="px-3 py-1 rounded-full bg-gray-800 text-sm capitalize">
            {task.status.replace('-', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors font-medium"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors font-medium"
              >
                🗑️ Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedTask({ ...task });
                }}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors font-medium"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : '💾 Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {saveError && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300">
          {saveError}
        </div>
      )}

      {/* Task Form */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Title
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedTask.title || ''}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none"
              placeholder="Task title..."
            />
          ) : (
            <h1 className="text-2xl font-bold">{task.title}</h1>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Description
          </label>
          {isEditing ? (
            <textarea
              value={editedTask.description || ''}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Add details, context, or requirements..."
            />
          ) : (
            <p className="text-gray-300 whitespace-pre-wrap">
              {task.description || 'No description provided.'}
            </p>
          )}
        </div>

        {/* Grid for Status, Priority, Assignee */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Status
            </label>
            {isEditing ? (
              <select
                value={editedTask.status || 'to-do'}
                onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-gray-800 capitalize">
                {task.status.replace('-', ' ')}
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Priority
            </label>
            {isEditing ? (
              <select
                value={editedTask.priority || 'p2-medium'}
                onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none"
              >
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-gray-800">
                {priority?.label}
              </div>
            )}
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Assigned To
            </label>
            {isEditing ? (
              <select
                value={editedTask.assigned_to || ''}
                onChange={(e) => setEditedTask({ ...editedTask, assigned_to: e.target.value || null })}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.emoji} {agent.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-gray-800 flex items-center gap-2">
                {assignedAgent ? (
                  <>
                    <span>{assignedAgent.emoji}</span>
                    <span>{assignedAgent.name}</span>
                  </>
                ) : (
                  <span className="text-gray-500">Unassigned</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Category & Sprint */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Category
            </label>
            {isEditing ? (
              <select
                value={editedTask.category || ''}
                onChange={(e) => setEditedTask({ ...editedTask, category: e.target.value || null })}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">No Category</option>
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-gray-800">
                {task.category || <span className="text-gray-500">No Category</span>}
              </div>
            )}
          </div>

          {/* Sprint */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Sprint
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedTask.sprint || ''}
                onChange={(e) => setEditedTask({ ...editedTask, sprint: e.target.value || null })}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none"
                placeholder="e.g., week-8-2026"
              />
            ) : (
              <div className="px-3 py-2 rounded-lg bg-gray-800">
                {task.sprint || <span className="text-gray-500">No Sprint</span>}
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="pt-6 border-t border-gray-700 space-y-2 text-sm text-gray-400">
          <div className="flex justify-between">
            <span>Task ID:</span>
            <code className="bg-gray-800 px-2 py-1 rounded text-gray-300">{task.id}</code>
          </div>
          <div className="flex justify-between">
            <span>Created:</span>
            <span>{formatDate(task.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>Updated:</span>
            <span>{formatDate(task.updated_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>Created By:</span>
            <span className="text-gray-300">{task.created_by || 'Unknown'}</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">Delete Task?</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
