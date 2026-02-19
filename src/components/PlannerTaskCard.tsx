import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAgentsStore } from '../stores/agentsStore';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string;
    priority: 'p1-high' | 'p2-medium' | 'p3-low';
    assigned_to?: string;
    category?: string;
    due_date?: string;
    tags?: string;
    checklist_count?: number;
    checklist_completed?: number;
  };
  isDragging?: boolean;
}

const PRIORITY_COLORS = {
  'p1-high': 'bg-red-500',
  'p2-medium': 'bg-yellow-500',
  'p3-low': 'bg-green-500',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Development': 'bg-blue-500',
  'Content': 'bg-purple-500',
  'Revenue': 'bg-green-500',
  'Infrastructure': 'bg-orange-500',
  'Research': 'bg-pink-500',
  'Security': 'bg-red-500',
  'Media': 'bg-indigo-500',
  'Sales': 'bg-teal-500',
};

export default function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const { getAgent } = useAgentsStore();
  const agent = task.assigned_to ? getAgent(task.assigned_to) : null;
  
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

  const tags = task.tags ? JSON.parse(task.tags) : [];
  const hasChecklist = task.checklist_count && task.checklist_count > 0;
  const checklistProgress = hasChecklist 
    ? Math.round((task.checklist_completed || 0) / task.checklist_count * 100)
    : 0;

  // Cover color based on category or priority
  const coverColor = task.category && CATEGORY_COLORS[task.category] 
    ? CATEGORY_COLORS[task.category] 
    : PRIORITY_COLORS[task.priority];

  const handleClick = (e: React.MouseEvent) => {
    if (!e.defaultPrevented) {
      window.location.href = `/tasks/${task.id}`;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group cursor-pointer border border-gray-200 dark:border-gray-700"
    >
      {/* Color banner/cover */}
      <div {...listeners} className="h-1.5 w-full cursor-move">
        <div className={`h-full w-full ${coverColor}`}></div>
      </div>

      <div className="p-3" onClick={handleClick}>
        {/* Labels/Tags row */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.slice(0, 3).map((tag: string) => (
              <span 
                key={tag} 
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[10px] font-medium uppercase tracking-wide"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded text-[10px]">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-tight mb-2 line-clamp-2">
          {task.title}
        </h3>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
            {task.description}
          </p>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {/* Checklist indicator */}
            {hasChecklist && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className={checklistProgress === 100 ? 'text-green-500' : ''}>
                  {task.checklist_completed}/{task.checklist_count}
                </span>
              </div>
            )}

            {/* Due date */}
            {task.due_date && (
              <div className={`flex items-center gap-1 text-xs ${
                new Date(task.due_date) < new Date() ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
              }`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            )}
          </div>

          {/* Assignee avatar */}
          {agent ? (
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
              style={{ backgroundColor: agent.color || '#6366f1', color: '#fff' }}
              title={agent.name}
            >
              {agent.emoji}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Progress bar for checklist */}
        {hasChecklist && (
          <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${checklistProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
