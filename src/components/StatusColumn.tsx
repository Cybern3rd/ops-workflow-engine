import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard';
import EmptyState from './EmptyState';

interface StatusColumnProps {
  status: {
    id: string;
    label: string;
    color: string;
  };
  tasks: any[];
  isEmpty?: boolean;
  onCreateTask?: () => void;
}

export default function StatusColumn({ status, tasks, isEmpty, onCreateTask }: StatusColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status.id,
  });

  // Task count by priority
  const highPriorityCount = tasks.filter(t => t.priority === 'p1-high').length;
  const mediumPriorityCount = tasks.filter(t => t.priority === 'p2-medium').length;
  const lowPriorityCount = tasks.filter(t => t.priority === 'p3-low').length;

  return (
    <div
      ref={setNodeRef}
      className="bg-gray-800/50 rounded-lg flex flex-col max-h-[calc(100vh-200px)]"
    >
      {/* Header */}
      <div className={`p-4 rounded-t-lg ${status.color} bg-opacity-20 border-b border-gray-700`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-white">{status.label}</h2>
            <span className="bg-gray-900/50 px-2 py-0.5 rounded-full text-sm text-gray-400">
              {tasks.length}
            </span>
          </div>
          <button
            onClick={onCreateTask}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
            title="Add task to this column"
          >
            +
          </button>
        </div>
        
        {/* Priority breakdown */}
        {tasks.length > 0 && (
          <div className="flex gap-3 mt-2 text-xs">
            {highPriorityCount > 0 && (
              <span className="text-red-400">🔴 {highPriorityCount}</span>
            )}
            {mediumPriorityCount > 0 && (
              <span className="text-yellow-400">🟡 {mediumPriorityCount}</span>
            )}
            {lowPriorityCount > 0 && (
              <span className="text-green-400">🟢 {lowPriorityCount}</span>
            )}
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="p-3 flex-1 overflow-y-auto min-h-[200px]">
        {isEmpty ? (
          <EmptyState 
            type="column-empty" 
            columnName={status.label}
            onCreateTask={onCreateTask}
          />
        ) : (
          <SortableContext
            items={tasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
