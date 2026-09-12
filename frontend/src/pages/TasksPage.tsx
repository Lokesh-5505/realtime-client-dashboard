import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { taskApi, projectApi } from '../services/api';
import { Task, Project } from '../types';
import { TaskFilterBar } from '../components/TaskFilterBar';
import { TaskCard } from '../components/TaskCard';
import { Plus, CheckSquare, Layers } from 'lucide-react';

interface TasksPageProps {
  onOpenCreateTask: () => void;
  initialProjectId?: string;
}

export const TasksPage: React.FC<TasksPageProps> = ({
  onOpenCreateTask,
  initialProjectId,
}) => {
  const { user } = useAuth();
  const { latestUpdatedTask, joinProject } = useSocket();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Read initial filters from URL search params for shareable URLs
  const getFiltersFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      status: params.get('status') || undefined,
      priority: params.get('priority') || undefined,
      dueFrom: params.get('dueFrom') || undefined,
      dueTo: params.get('dueTo') || undefined,
      search: params.get('search') || undefined,
      projectId: params.get('projectId') || initialProjectId || undefined,
    };
  }, [initialProjectId]);

  const [filters, setFilters] = useState(getFiltersFromUrl());

  // Synchronize filter changes with URL
  const handleFilterChange = (newFilters: Record<string, string | undefined>) => {
    setFilters(newFilters as any);
    const searchParams = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) searchParams.set(k, v);
    });
    const newRelativePathQuery =
      window.location.pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    window.history.pushState(null, '', newRelativePathQuery);
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await taskApi.list(filters);
      setTasks(data);

      // Join WebSocket project room for real-time task sync
      if (filters.projectId) {
        joinProject(filters.projectId);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [filters, user?.id]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const list = await projectApi.list();
        setProjects(list);
      } catch (e) {
        console.error('Failed to load projects', e);
      }
    };
    fetchProjects();
  }, []);

  // Real-time task update listener via WebSocket
  useEffect(() => {
    if (latestUpdatedTask) {
      setTasks((prev) => {
        const index = prev.findIndex((t) => t.id === latestUpdatedTask.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = latestUpdatedTask;
          return updated;
        }
        // If newly created task matches current filter, prepend it
        return [latestUpdatedTask, ...prev];
      });
    }
  }, [latestUpdatedTask]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-400" />
            Task Management & Workflow
          </h2>
          <p className="text-xs text-slate-400">
            Track and manage task progress across your team.
          </p>
        </div>

        {(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') && (
          <button
            onClick={onOpenCreateTask}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-lg shadow-indigo-500/25 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        )}
      </div>

      {/* URL-Synchronized Filter Bar */}
      <TaskFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        projects={projects}
      />

      {/* Task Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm animate-pulse">
          Loading tasks with real-time sync...
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-16 text-center glass-panel rounded-3xl border border-slate-800/80">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-50" />
          <h3 className="text-sm font-semibold text-slate-300">No tasks found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No tasks match the selected filters. Try clearing filters or creating a new task.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusUpdated={(updated) => {
                setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
