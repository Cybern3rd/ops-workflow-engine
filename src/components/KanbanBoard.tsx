import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import StatusColumn from './StatusColumn';
import TaskCard from './TaskCard';
import SearchFilter from './SearchFilter';
import EmptyState from './EmptyState';
import ToastContainer, { toast } from './Toast';
import { KanbanSkeleton } from './Skeleton';
import { useTasksStore } from '../stores/tasksStore';
import { useWebSocket } from '../lib/websocket';
import ErrorBoundary from './ErrorBoundary';
import KeyboardShortcutsHelp, { useKeyboardShortcuts } from './KeyboardShortcuts';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'to-do' | 'in-progress' | 'done' | 'blocked';
  priority: 'p1-high' | 'p2-medium' | 'p3-low';
  assigned_to?: string;
  category?: string;
  due_date?: string;
  position: number;
}

const STATUSES = [
  { id: 'to-do', label: 'To Do', color: 'bg-gray-700' },
  { id: 'in-progress', label: 'In Progress', color: 'bg-blue-700' },
  { id: 'done', label: 'Done', color: 'bg-green-700' },
  { id: 'blocked', label: 'Blocked', color: 'bg-red-700' },
];

export default function KanbanBoard() {
  const { tasks, loadTasks, updateTask, moveTask, error: storeError } = useTasksStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    assigned_to: '',
    category: '',
    sprint: '',
  });
  const [showShortcuts, setShowShortcuts] = useState(false);

  // WebSocket for real-time updates
  const wsError = useWebSocket((message) => {
    if (message.type === 'task_updated' || message.type === 'task_created') {
      loadTasks();
      if (message.type === 'task_created') {
        toast.info('New task created');
      }
    }
  });

  // Handle WebSocket errors
  useEffect(() => {
    if (wsError) {
      toast.error('Real-time sync disconnected. Refresh to reconnect.');
    }
  }, [wsError]);

  // Handle store errors
  useEffect(() => {
    if (storeError) {
      toast.error(storeError);
    }
  }, [storeError]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadTasks()
      .then(() => {
        setLoading(false);
        toast.success('Tasks loaded successfully');
      })
      .catch(() => {
        setLoading(false);
        toast.error('Failed to load tasks');
      });
  }, [loadTasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task: Task) => {
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase()) &&
          !task.description?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.assigned_to && task.assigned_to !== filters.assigned_to) return false;
      if (filters.category && task.category !== filters.category) return false;
      if (filters.sprint && !task.sprint?.includes(filters.sprint)) return false;
      return true;
    });
  }, [tasks, filters]);

  // Keyboard shortcuts
  const focusSearch = useCallback(() => {
    const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
    if (searchInput) searchInput.focus();
  }, []);

  const openNewTask = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-task-modal'));
  }, []);

  const { showHelp } = useKeyboardShortcuts({
    onNewTask: openNewTask,
    onFocusSearch: focusSearch,
  });

  useEffect(() => {
    setShowShortcuts(showHelp);
  }, [showHelp]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    const overColumn = STATUSES.find(s => s.id === overId);

    if (activeTask && overColumn && activeTask.status !== overColumn.id) {
      try {
        await updateTask(activeId, { status: overColumn.id as any });
        toast.success(`Moved to ${overColumn.label}`);
      } catch (err) {
        toast.error('Failed to move task');
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    const overTask = tasks.find(t => t.id === overId);

    if (activeTask && overTask && activeTask.status === overTask.status) {
      try {
        const statusTasks = tasks.filter(t => t.status === activeTask.status);
        const oldIndex = statusTasks.findIndex(t => t.id === activeId);
        const newIndex = statusTasks.findIndex(t => t.id === overId);

        const reordered = arrayMove(statusTasks, oldIndex, newIndex);
        
        for (let i = 0; i < reordered.length; i++) {
          await moveTask(reordered[i].id, i);
        }
        toast.success('Task reordered');
      } catch (err) {
        toast.error('Failed to reorder');
      }
    }
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="space-y-4">
          <div className="h-10 bg-gray-800 rounded-lg w-full animate-pulse"></div>
          <KanbanSkeleton />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Search and Filters */}
        <SearchFilter onFilterChange={setFilters} initialFilters={filters} />

        {/* Kanban Board */}
        {filteredTasks.length === 0 && tasks.length > 0 ? (
          <EmptyState 
            type="no-results" 
            onCreateTask={openNewTask}
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {STATUSES.map((status) => {
                const columnTasks = filteredTasks.filter(t => t.status === status.id);
                return (
                  <StatusColumn
                    key={status.id}
                    status={status}
                    tasks={columnTasks}
                    isEmpty={columnTasks.length === 0}
                    onCreateTask={openNewTask}
                  />
                );
              })}
            </div>

            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Stats */}
        <div className="mt-8 flex items-center justify-between text-sm text-gray-500 border-t border-gray-700 pt-4">
          <div>
            Showing {filteredTasks.length} of {tasks.length} tasks
            {filters.search && ` matching "${filters.search}"`}
          </div>
          <div className="flex gap-4">
            {STATUSES.map(s => {
              const count = tasks.filter(t => t.status === s.id).length;
              return (
                <span key={s.id} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${s.color}`}></span>
                  {s.label}: {count}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Keyboard Shortcuts Help */}
      {showShortcuts && (
        <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />
      )}
    </ErrorBoundary>
  );
}
