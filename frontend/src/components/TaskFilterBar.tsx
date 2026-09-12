import React from 'react';
import { TaskStatus, Priority, Project } from '../types';
import { Search, X, Filter } from 'lucide-react';

interface TaskFilterBarProps {
  filters: {
    status?: string;
    priority?: string;
    dueFrom?: string;
    dueTo?: string;
    search?: string;
    projectId?: string;
  };
  onFilterChange: (newFilters: Record<string, string | undefined>) => void;
  projects?: Project[];
}

export const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  filters,
  onFilterChange,
  projects = [],
}) => {
  const handleSelect = (key: string, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value === 'ALL' || !value ? undefined : value,
    });
  };

  const handleClearAll = () => {
    onFilterChange({
      status: undefined,
      priority: undefined,
      dueFrom: undefined,
      dueTo: undefined,
      search: undefined,
      projectId: undefined,
    });
  };

  const hasActiveFilters = Boolean(
    filters.status || filters.priority || filters.dueFrom || filters.dueTo || filters.search || filters.projectId
  );

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Filter className="w-4 h-4 text-indigo-400" />
          <span>Filter Tasks</span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Reset all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search || ''}
            onChange={(e) => handleSelect('search', e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900/90 border border-slate-700/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={filters.status || 'ALL'}
            onChange={(e) => handleSelect('status', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900/90 border border-slate-700/60 text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            <option value="ALL">Status: All</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <select
            value={filters.priority || 'ALL'}
            onChange={(e) => handleSelect('priority', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900/90 border border-slate-700/60 text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            <option value="ALL">Priority: All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Due Date Range: From */}
        <div>
          <input
            type="date"
            placeholder="Due from"
            value={filters.dueFrom || ''}
            onChange={(e) => handleSelect('dueFrom', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900/90 border border-slate-700/60 text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
          />
        </div>

        {/* Due Date Range: To */}
        <div>
          <input
            type="date"
            placeholder="Due to"
            value={filters.dueTo || ''}
            onChange={(e) => handleSelect('dueTo', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900/90 border border-slate-700/60 text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
