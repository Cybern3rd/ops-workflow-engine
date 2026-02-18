import { useState, useEffect, useCallback } from 'react';
import { useAgentsStore } from '../stores/agentsStore';

interface FilterOptions {
  search: string;
  status: string;
  priority: string;
  assigned_to: string;
  category: string;
  sprint: string;
}

interface SearchFilterProps {
  onFilterChange: (filters: FilterOptions) => void;
  initialFilters?: Partial<FilterOptions>;
}

export default function SearchFilter({ onFilterChange, initialFilters }: SearchFilterProps) {
  const { agents, loadAgents } = useAgentsStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    search: initialFilters?.search || '',
    status: initialFilters?.status || '',
    priority: initialFilters?.priority || '',
    assigned_to: initialFilters?.assigned_to || '',
    category: initialFilters?.category || '',
    sprint: initialFilters?.sprint || '',
  });

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onFilterChange(filters);
    }, 300); // Debounce
    return () => clearTimeout(timeout);
  }, [filters, onFilterChange]);

  const updateFilter = useCallback((key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      assigned_to: '',
      category: '',
      sprint: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search tasks... (Ctrl+K)"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Quick Filters */}
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="to-do">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
          <option value="blocked">Blocked</option>
        </select>

        <select
          value={filters.priority}
          onChange={(e) => updateFilter('priority', e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Priorities</option>
          <option value="p1-high">🔴 High</option>
          <option value="p2-medium">🟡 Medium</option>
          <option value="p3-low">🟢 Low</option>
        </select>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`px-3 py-2 rounded-lg border transition-colors ${isExpanded ? 'bg-blue-600 border-blue-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
        >
          {isExpanded ? '▼' : '▶'} Filters
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Assigned To</label>
            <select
              value={filters.assigned_to}
              onChange={(e) => updateFilter('assigned_to', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.emoji} {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="Development">Development</option>
              <option value="Content">Content</option>
              <option value="Revenue">Revenue</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Research">Research</option>
              <option value="Security">Security</option>
              <option value="Media">Media</option>
              <option value="Sales">Sales</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Sprint</label>
            <input
              type="text"
              placeholder="e.g., week-8-2026"
              value={filters.sprint}
              onChange={(e) => updateFilter('sprint', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
