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
import PlannerTaskCard from './PlannerTaskCard';
import { useTasksStore } from '../stores/tasksStore';
import { KanbanSkeleton } from './Skeleton';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'to-do' | 'in-progress' | 'done' | 'blocked';
  priority: 'p1-high' | 'p2-medium' | 'p3-low';
  assigned_to?: string;
  category?: string;
  due_date?: string;
  tags?: string;
  position: number;
  checklist_count?: number;
  checklist_completed?: number;
}

const COLUMNS = [
  { id: 'to-do', title: 'To Do', color: 'bg-gray-100 dark:bg-gray-800', headerColor: 'bg-gray-200 dark:bg-gray-700' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/20', headerColor: 'bg-blue-100 dark:bg-blue-800' },
  { id: 'done', title: 'Done', color: 'bg-green-50 dark:bg-green-900/20', headerColor: 'bg-green-100 dark:bg-green-800' },
  { id: 'blocked', title: 'Blocked', color: 'bg-red-50 dark:bg-red-900/20', headerColor: 'bg-red-100 dark:bg-red-800' },
];

export default function PlannerKanbanBoard() {
  const { tasks, loading, loadTasks, updateTask } = useTasksStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

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

  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = {
      'to-do': [],
      'in-progress': [],
      'done': [],
      'blocked': [],
    };
    
    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    
    // Sort by position
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => (a.position || 0) - (b.position || 0));
    });
    
    return grouped;
  }, [tasks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the containers
    const activeTask = tasks.find(t => t.id === activeId);
    const overTask = tasks.find(t => t.id === overId);
    
    if (!activeTask || !overTask) return;

    const activeContainer = activeTask.status;
    const overContainer = overTask.status;

    if (activeContainer !== overContainer) {
      updateTask(activeId, { status: overContainer as Task['status'] });
    }
  }, [tasks, updateTask]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId !== overId) {
      const activeTask = tasks.find(t => t.id === activeId);
      const overTask = tasks.find(t => t.id === overId);
      
      if (activeTask && overTask && activeTask.status === overTask.status) {
        // Reorder within same column
        const columnTasks = tasksByColumn[activeTask.status];
        const oldIndex = columnTasks.findIndex(t => t.id === activeId);
        const newIndex = columnTasks.findIndex(t => t.id === overId);
        
        const newColumnTasks = arrayMove(columnTasks, oldIndex, newIndex);
        
        // Update positions
        newColumnTasks.forEach((task, index) => {
          if (task.position !== index) {
            updateTask(task.id, { position: index });
          }
        });
      }
    }

    setActiveId(null);
  }, [tasks, tasksByColumn, updateTask]);

  const activeTask = useMemo(() => 
    tasks.find(t => t.id === activeId),
    [tasks, activeId]
  );

  if (loading && tasks.length === 0) {
    return <KanbanSkeleton />;
  }

  return (
    <div className="h-full">
      {/* Board header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Board View</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{tasks.length} tasks</span>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(column => {
            const columnTasks = tasksByColumn[column.id];
            
            return (
              <div 
                key={column.id} 
                className={`flex-shrink-0 w-72 ${column.color} rounded-lg`}
              >
                {/* Column header */}
                <div className={`${column.headerColor} rounded-t-lg px-3 py-2 flex items-center justify-between`}>
                  <h3 className="font-semibold text-sm text-gray-800 dark:text-white">
                    {column.title}
                  </h3>
                  <span className="text-xs text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Tasks container */}
                <div className="p-2 min-h-[200px]">
                  <SortableContext 
                    items={columnTasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {columnTasks.map(task => (
                        <PlannerTaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  </SortableContext>
                  
                  {/* Add task button at bottom of column */}
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { status: column.id } }))}
                    className="w-full mt-2 py-2 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-sm hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    + Add task
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <PlannerTaskCard task={activeTask} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
