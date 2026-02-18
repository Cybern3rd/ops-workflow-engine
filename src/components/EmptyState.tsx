interface EmptyStateProps {
  type: 'no-tasks' | 'no-results' | 'column-empty';
  columnName?: string;
  onCreateTask?: () => void;
}

export default function EmptyState({ type, columnName, onCreateTask }: EmptyStateProps) {
  const configs = {
    'no-tasks': {
      icon: '📋',
      title: 'No tasks yet',
      description: 'Get started by creating your first task!',
      action: 'Create Task',
    },
    'no-results': {
      icon: '🔍',
      title: 'No results found',
      description: 'Try adjusting your search or filters.',
      action: null,
    },
    'column-empty': {
      icon: '📭',
      title: `${columnName} is empty`,
      description: 'Drop tasks here or create a new one.',
      action: 'Add Task',
    },
  };

  const config = configs[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-5xl mb-4 opacity-50">{config.icon}</div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{config.title}</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-xs">{config.description}</p>
      {config.action && onCreateTask && (
        <button
          onClick={onCreateTask}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
        >
          + {config.action}
        </button>
      )}
    </div>
  );
}
