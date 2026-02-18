export function TaskCardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 w-4 bg-gray-700 rounded-full"></div>
      </div>
      <div className="h-3 bg-gray-700 rounded w-full mb-2"></div>
      <div className="h-3 bg-gray-700 rounded w-2/3 mb-4"></div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-gray-700 rounded"></div>
          <div className="h-5 w-12 bg-gray-700 rounded"></div>
        </div>
        <div className="h-3 w-16 bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}

export function StatusColumnSkeleton() {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-20 bg-gray-700 rounded"></div>
        <div className="h-5 w-8 bg-gray-700 rounded-full"></div>
      </div>
      <div className="space-y-3">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatusColumnSkeleton />
      <StatusColumnSkeleton />
      <StatusColumnSkeleton />
      <StatusColumnSkeleton />
    </div>
  );
}
