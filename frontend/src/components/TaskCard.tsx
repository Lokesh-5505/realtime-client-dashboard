import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { taskApi } from '../services/api';
import {
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Play,
  Eye,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import { format, isPast } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onStatusUpdated?: (updatedTask: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusUpdated }) => {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  // Can the current user update this task's status?
  // - Admin: yes
  // - PM: yes, if task belongs to their project
  // - Dev: yes, IF assigned to this dev
  const canUpdateStatus =
    user?.role === 'ADMIN' ||
    (user?.role === 'PROJECT_MANAGER' && task.project?.managerId === user.id) ||
    (user?.role === 'DEVELOPER' && task.assignedToId === user.id);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === task.status || isUpdating) return;
    setIsUpdating(true);
    try {
      const updated = await taskApi.updateStatus(task.id, newStatus);
      if (onStatusUpdated) {
        onStatusUpdated(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityBadge = () => {
    switch (task.priority) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'LOW':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusBadge = () => {
    switch (task.status) {
      case 'TODO':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'IN_PROGRESS':
        return 'bg-blue-950/60 text-blue-400 border-blue-800/60';
      case 'IN_REVIEW':
        return 'bg-amber-950/60 text-amber-400 border-amber-800/60';
      case 'DONE':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const isOverdue = task.isOverdue || (task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'DONE');

  return (
    <div className="group relative rounded-2xl glass-panel p-5 border border-slate-800/70 hover:border-slate-700/80 transition-all hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between">
      {/* Top row: Badges */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-slate-400">
              #{task.taskNumber}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${getPriorityBadge()}`}
            >
              {task.priority}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge()}`}
            >
              {task.status.replace('_', ' ')}
            </span>
          </div>

          {isOverdue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              Overdue
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h4 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1.5">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
            {task.description}
          </p>
        )}
      </div>

      {/* Meta: Project, Assignee, Due Date */}
      <div>
        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {task.assignedTo ? (
              <div className="flex items-center gap-1.5 truncate">
                {task.assignedTo.avatarUrl ? (
                  <img
                    src={task.assignedTo.avatarUrl}
                    alt={task.assignedTo.name}
                    className="w-5 h-5 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300 shrink-0">
                    {task.assignedTo.name.charAt(0)}
                  </div>
                )}
                <span className="text-xs text-slate-300 truncate">{task.assignedTo.name}</span>
              </div>
            ) : (
              <span className="text-slate-500 italic">Unassigned</span>
            )}
          </div>

          {task.dueDate && (
            <div
              className={`flex items-center gap-1 text-[11px] shrink-0 ${
                isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(task.dueDate), 'MMM d')}</span>
            </div>
          )}
        </div>

        {/* Interactive Quick Status Transition Bar */}
        {canUpdateStatus && (
          <div className="pt-2 border-t border-slate-800/40">
            <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
              <span>Status</span>
              {isUpdating && <span className="text-indigo-400 animate-pulse">Syncing...</span>}
            </div>
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => handleStatusChange('TODO')}
                disabled={task.status === 'TODO' || isUpdating}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                  task.status === 'TODO'
                    ? 'bg-slate-700 text-white font-bold cursor-default'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                To Do
              </button>
              <button
                onClick={() => handleStatusChange('IN_PROGRESS')}
                disabled={task.status === 'IN_PROGRESS' || isUpdating}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                  task.status === 'IN_PROGRESS'
                    ? 'bg-blue-600 text-white font-bold cursor-default'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                In Prog
              </button>
              <button
                onClick={() => handleStatusChange('IN_REVIEW')}
                disabled={task.status === 'IN_REVIEW' || isUpdating}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                  task.status === 'IN_REVIEW'
                    ? 'bg-amber-600 text-white font-bold cursor-default'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Review
              </button>
              <button
                onClick={() => handleStatusChange('DONE')}
                disabled={task.status === 'DONE' || isUpdating}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                  task.status === 'DONE'
                    ? 'bg-emerald-600 text-white font-bold cursor-default'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
