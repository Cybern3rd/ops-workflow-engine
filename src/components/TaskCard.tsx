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
  };
  isDragging?: boolean;
}

const PRIORITY_CONFIG = {
  'p1-high': { emoji: '🔴', label: 'High', color: 'text-red-400' },
  'p2-medium': { emoji: '🟡', label: 'Medium', color: 'text-yellow-400' },
  'p3-low': { emoji: '🟢', label: 'Low', color: 'text-green-400' },
};

export default function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const { getAgent } = useAgentsStore();
  const agent = task.assigned_to ? getAgent(task.assigned_to) : null;
  const priority = PRIORITY_CONFIG[task.priority];
  
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

  const handleClick = (e: React.MouseEvent) => {
    // Only navigate if not dragging and not clicking interactive elements
    if (!e.defaultPrevented) {
      window.location.href = `/tasks/${task.id}`;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-blue-500/50 transition-all group relative"
    >
      {/* Drag handle - top section */}
      <div {...listeners} className="cursor-move mb-3">
        <div className="flex items-start justify-between mb-2">
          <h3 
            onClick={handleClick}
            className="font-semibold text-white flex-1 group-hover:text-blue-400 transition-colors cursor-pointer line-clamp-2"
          >
            {task.title}
          </h3>
          <span className="text-lg ml-2 flex-shrink-0" title={priority.label}>
            {priority.emoji}
          </span>
        </div>

        {task.description && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-2">{task.description}</p>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 2).map((tag: string) => (
            <span key={tag} className="px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded text-xs">
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs">
              +{tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {agent && (
            <div 
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-800/50"
              title={agent.name}
            >
              <span className="text-base">{agent.emoji}</span>
              <span className="text-gray-400 font-medium">{agent.name.split(' ')[0]}</span>
            </div>
          )}

          {task.category && (
            <span className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded">
              {task.category}
            </span>
          )}
        </div>

        {task.due_date && (
          <div className="flex items-center gap-1 text-gray-400">
            <span>📅</span>
            <span>{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
