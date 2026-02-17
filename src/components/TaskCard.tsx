import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, User } from 'lucide-react';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string;
    priority: 'p1-high' | 'p2-medium' | 'p3-low';
    assigned_to?: string;
    category?: string;
    due_date?: string;
  };
  isDragging?: boolean;
}

const PRIORITY_COLORS = {
  'p1-high': 'bg-red-500',
  'p2-medium': 'bg-yellow-500',
  'p3-low': 'bg-gray-500',
};

const AGENT_COLORS: Record<string, string> = {
  neo: 'bg-red-500',
  marcus: 'bg-cyan-500',
  sofia: 'bg-blue-500',
  kenji: 'bg-green-500',
  aisha: 'bg-yellow-500',
  'dr-elena': 'bg-gray-400',
  priya: 'bg-blue-400',
  jackson: 'bg-pink-500',
  maya: 'bg-purple-500',
  david: 'bg-orange-500',
  zara: 'bg-pink-400',
  sarah: 'bg-gray-600',
};

export default function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gray-900 border border-gray-700 rounded-lg p-4 cursor-move hover:border-blue-500 transition-colors group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-white flex-1 group-hover:text-blue-400 transition-colors">
          {task.title}
        </h3>
        <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]} ml-2 mt-1.5`} />
      </div>

      {task.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-500">
        {task.assigned_to && (
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full ${AGENT_COLORS[task.assigned_to] || 'bg-gray-600'} flex items-center justify-center text-xs font-bold text-white`}>
              {task.assigned_to.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {task.due_date && (
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            <span>{new Date(task.due_date).toLocaleDateString()}</span>
          </div>
        )}

        {task.category && (
          <span className="px-2 py-0.5 bg-gray-800 rounded text-xs">{task.category}</span>
        )}
      </div>
    </div>
  );
}
