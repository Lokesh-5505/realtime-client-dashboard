import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { statsApi, taskApi } from '../services/api';
import { DashboardStats, Task } from '../types';
import { ActivityFeed } from '../components/ActivityFeed';
import { TaskCard } from '../components/TaskCard';
import { RoleBadge } from '../components/RoleBadge';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Calendar,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Briefcase,
  Layers,
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardPageProps {
  onNavigateToTasks: (projectId?: string) => void;
  onNavigateToProjects: () => void;
  onOpenCreateTask: () => void;
  onOpenCreateProject: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToTasks,
  onNavigateToProjects,
  onOpenCreateTask,
  onOpenCreateProject,
}) => {
  const { user } = useAuth();
  const { onlineCount, latestUpdatedTask } = useSocket();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [devTasks, setDevTasks] = useState<Task[]>([]);

  const fetchDashboardData = async () => {
    try {
      const data = await statsApi.getDashboard();
      setStats(data);

      if (user?.role === 'DEVELOPER') {
        const tasks = await taskApi.list();
        setDevTasks(tasks);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  // When a task is updated via WebSocket, refresh stats and local task list
  useEffect(() => {
    if (latestUpdatedTask) {
      fetchDashboardData();
    }
  }, [latestUpdatedTask]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm animate-pulse">
        Loading dashboard metrics...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800/80">
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/30 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xl font-bold text-white shrink-0">
              {user?.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Welcome back, {user?.name.split(' ')[0]}
              </h1>
              <RoleBadge role={user!.role} />
            </div>
            <p className="text-xs text-slate-400">
              {user?.role === 'ADMIN' && 'Agency oversight, team activity, and client project management.'}
              {user?.role === 'PROJECT_MANAGER' && 'Manage your projects, assign tasks, and monitor progress.'}
              {user?.role === 'DEVELOPER' && 'Your assigned tasks and daily deliverables.'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          {(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') && (
            <>
              <button
                onClick={onOpenCreateProject}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                + New Project
              </button>
              <button
                onClick={onOpenCreateTask}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-lg shadow-indigo-500/25 cursor-pointer"
              >
                + New Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* ADMIN DASHBOARD VIEW */}
      {user?.role === 'ADMIN' && (
        <>
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Projects */}
            <div
              onClick={onNavigateToProjects}
              className="glass-panel glass-panel-hover p-5 rounded-2xl border border-slate-800/80 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400">Total Projects</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <FolderKanban className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white mb-1">{stats?.totalProjects ?? 0}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>Across {stats?.totalClients ?? 0} active clients</span>
              </div>
            </div>

            {/* Total Tasks by Status */}
            <div
              onClick={() => onNavigateToTasks()}
              className="glass-panel glass-panel-hover p-5 rounded-2xl border border-slate-800/80 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400">Total Tasks</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white mb-1">{stats?.totalTasks ?? 0}</div>
              <div className="flex items-center gap-2 text-[10px] font-semibold">
                <span className="text-slate-400">TD: {stats?.tasksByStatus?.TODO ?? 0}</span>
                <span className="text-blue-400">IP: {stats?.tasksByStatus?.IN_PROGRESS ?? 0}</span>
                <span className="text-amber-400">IR: {stats?.tasksByStatus?.IN_REVIEW ?? 0}</span>
                <span className="text-emerald-400">DN: {stats?.tasksByStatus?.DONE ?? 0}</span>
              </div>
            </div>

            {/* Overdue Task Count */}
            <div
              onClick={() => onNavigateToTasks()}
              className="glass-panel glass-panel-hover p-5 rounded-2xl border border-slate-800/80 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400">Overdue Tasks</span>
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-rose-400 mb-1">{stats?.overdueCount ?? 0}</div>
              <div className="text-[11px] text-slate-500">Requires attention</div>
            </div>

            {/* Active Users Online Right Now */}
            <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-emerald-300">Active Online Now</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center relative">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-400 mb-1">{onlineCount}</div>
              <div className="text-[11px] text-emerald-500/80 font-medium">
                Online right now
              </div>
            </div>
          </div>

          {/* Status Breakdown Bar & Global Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
              {/* Task Breakdown Panel */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  Agency Task Pipeline Distribution
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'To Do', count: stats?.tasksByStatus?.TODO ?? 0, color: 'bg-slate-500' },
                    { label: 'In Progress', count: stats?.tasksByStatus?.IN_PROGRESS ?? 0, color: 'bg-blue-500' },
                    { label: 'In Review', count: stats?.tasksByStatus?.IN_REVIEW ?? 0, color: 'bg-amber-500' },
                    { label: 'Done', count: stats?.tasksByStatus?.DONE ?? 0, color: 'bg-emerald-500' },
                  ].map((s) => {
                    const total = stats?.totalTasks || 1;
                    const percent = Math.round((s.count / total) * 100);
                    return (
                      <div key={s.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300 font-medium">{s.label}</span>
                          <span className="text-slate-400 font-semibold">{s.count} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${s.color} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Global Activity Feed */}
            <div className="lg:col-span-7">
              <ActivityFeed maxItems={15} />
            </div>
          </div>
        </>
      )}

      {/* PROJECT MANAGER DASHBOARD VIEW */}
      {user?.role === 'PROJECT_MANAGER' && (
        <div className="space-y-8">
          {/* Top PM Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400">My Managed Projects</span>
              <div className="text-3xl font-extrabold text-white mt-2 mb-1">
                {stats?.totalManagedProjects ?? 0}
              </div>
              <p className="text-[11px] text-slate-500">Active projects</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400">Overdue in My Projects</span>
              <div className="text-3xl font-extrabold text-rose-400 mt-2 mb-1">
                {stats?.overdueCount ?? 0}
              </div>
              <p className="text-[11px] text-slate-500">Needs immediate attention</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400">Critical Priority Tasks</span>
              <div className="text-3xl font-extrabold text-amber-400 mt-2 mb-1">
                {stats?.tasksByPriority?.CRITICAL ?? 0}
              </div>
              <p className="text-[11px] text-slate-500">High impact items</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Managed Projects & Upcoming Due Dates */}
            <div className="lg:col-span-6 space-y-6">
              {/* Projects Summary */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                    My Projects Summary
                  </h3>
                  <button
                    onClick={onNavigateToProjects}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-3">
                  {stats?.managedProjects?.map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => onNavigateToTasks(proj.id)}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/40 transition cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-white">{proj.name}</h4>
                        <p className="text-[10px] text-slate-400">{proj.client?.name}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {proj._count?.tasks ?? 0} tasks
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Due Dates This Week */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  Upcoming Due Dates This Week
                </h3>
                {stats?.upcomingTasksThisWeek?.length === 0 ? (
                  <p className="text-xs text-slate-500">No tasks due this week.</p>
                ) : (
                  <div className="space-y-2">
                    {stats?.upcomingTasksThisWeek?.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-xl bg-slate-900/60 flex items-center justify-between text-xs"
                      >
                        <div className="truncate mr-2">
                          <span className="font-semibold text-slate-200 truncate">#{t.taskNumber} {t.title}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{t.project?.name}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-cyan-400 shrink-0">
                          {t.dueDate ? format(new Date(t.dueDate), 'MMM d') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* PM Activity Stream */}
            <div className="lg:col-span-6">
              <ActivityFeed maxItems={15} />
            </div>
          </div>
        </div>
      )}

      {/* DEVELOPER DASHBOARD VIEW */}
      {user?.role === 'DEVELOPER' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400">Assigned To Me</span>
              <div className="text-3xl font-extrabold text-white mt-2 mb-1">
                {stats?.assignedTasksCount ?? 0}
              </div>
              <p className="text-[11px] text-slate-500">Active assigned tasks</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400">Overdue Tasks</span>
              <div className="text-3xl font-extrabold text-rose-400 mt-2 mb-1">
                {stats?.overdueCount ?? 0}
              </div>
              <p className="text-[11px] text-slate-500">Requires attention</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400">Online Team Members</span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-2 mb-1">
                {onlineCount}
              </div>
              <p className="text-[11px] text-slate-500">Online right now</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Developer's Assigned Tasks */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  My Assigned Tasks
                </h3>
                <span className="text-xs text-slate-400">Sorted by Priority</span>
              </div>

              {devTasks.length === 0 ? (
                <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800/80">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-slate-300">You're all set!</p>
                  <p className="text-xs text-slate-500 mt-1">No pending tasks currently assigned to you.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {devTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onStatusUpdated={() => fetchDashboardData()}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Developer Activity Feed */}
            <div className="lg:col-span-5">
              <ActivityFeed maxItems={15} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
