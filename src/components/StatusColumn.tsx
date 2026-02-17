import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import TaskCard from './TaskCard';

interface StatusColumnProps {
  status: {
    id: string;
    label: string;
    color: string;
  };
  tasks: any[];
}

export default function StatusColumn({ status, tasks }: StatusColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status.id,
  });

  return (
    <div className="flex flex-col">
      <div className={`${status.color} rounded-t-xl px-4 py-3 flex items-center justify-between`}>
        <h2 className="font-bold text-lg">{status.label}</h2>
        <span className="bg-white/20 px-2 py-1 rounded-full text-sm">{tasks.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 bg-gray-800/50 backdrop-blur-sm rounded-b-xl p-4 min-h-[500px] space-y-3"
      >
        <SortableContext
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <p className="text-4xl mb-2">📋</p>
            <p>No tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
}
