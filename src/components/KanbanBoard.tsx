import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import StatusColumn from './StatusColumn';
import TaskCard from './TaskCard';
import { useTasksStore } from '../stores/tasksStore';
import { useWebSocket } from '../lib/websocket';

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
  const { tasks, loadTasks, updateTask, moveTask } = useTasksStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // WebSocket for real-time updates
  useWebSocket((message) => {
    if (message.type === 'task_updated' || message.type === 'task_created') {
      loadTasks(); // Refresh tasks on updates
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadTasks().then(() => setLoading(false));
  }, []);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dragging over a different column
    const activeTask = tasks.find(t => t.id === activeId);
    const overColumn = STATUSES.find(s => s.id === overId);

    if (activeTask && overColumn && activeTask.status !== overColumn.id) {
      // Update task status optimistically
      updateTask(activeId, { status: overColumn.id as any });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    const overTask = tasks.find(t => t.id === overId);

    if (activeTask && overTask && activeTask.status === overTask.status) {
      // Reorder within same column
      const statusTasks = tasks.filter(t => t.status === activeTask.status);
      const oldIndex = statusTasks.findIndex(t => t.id === activeId);
      const newIndex = statusTasks.findIndex(t => t.id === overId);

      const reordered = arrayMove(statusTasks, oldIndex, newIndex);
      
      // Update positions
      reordered.forEach((task, index) => {
        moveTask(task.id, index);
      });
    }
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  if (loading) {
    return (
      <div class Name="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATUSES.map((status) => (
          <StatusColumn
            key={status.id}
            status={status}
            tasks={tasks.filter(t => t.status === status.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
