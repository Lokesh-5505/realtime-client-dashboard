import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { activityApi } from '../services/api';
import { ActivityLog } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Activity, RefreshCw, Zap, Clock, ShieldAlert } from 'lucide-react';

interface ActivityFeedProps {
  maxItems?: number;
  compact?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ maxItems = 20, compact = false }) => {
  const { user } = useAuth();
  const { recentActivities, setRecentActivities, isConnected } = useSocket();
  const [loading, setLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Offline / Initial Catchup: Fetch last 20 events from Database
  const fetchMissedEvents = async () => {
    setLoading(true);
    try {
      const feed = await activityApi.getFeed(maxItems);
      setRecentActivities(feed);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to catch up missed activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissedEvents();

    // Fallback polling for serverless environments (like Vercel) where persistent WebSockets are unavailable
    let interval: ReturnType<typeof setInterval> | null = null;
    if (!isConnected) {
      interval = setInterval(() => {
        fetchMissedEvents();
      }, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user?.id, isConnected]);

  const getScopeLabel = () => {
    switch (user?.role) {
      case 'ADMIN':
        return 'Global Agency Feed (All Projects)';
      case 'PROJECT_MANAGER':
        return 'Your Managed Projects Feed';
      case 'DEVELOPER':
        return 'Your Assigned Tasks Feed';
      default:
        return 'Activity Stream';
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
              Live Activity Feed
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                Live
              </span>
            </h3>
            <p className="text-xs text-slate-400">{getScopeLabel()}</p>
          </div>
        </div>

        <button
          onClick={fetchMissedEvents}
          disabled={loading}
          title="Refresh activity feed"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Activity Item List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] max-h-[500px]">
        {loading && recentActivities.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Connecting & retrieving feed...</div>
        ) : recentActivities.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="text-sm text-slate-400">No activity yet</p>
            <p className="text-xs text-slate-500 mt-1">Actions on tasks will appear here in real time.</p>
          </div>
        ) : (
          recentActivities.slice(0, maxItems).map((act) => {
            const isOverdueAlert = act.action === 'TASK_OVERDUE';
            const isStatusChange = act.action === 'TASK_STATUS_CHANGED';

            return (
              <div
                key={act.id}
                className="group relative flex items-start gap-3 p-3 rounded-xl bg-slate-900/50 hover:bg-slate-850/80 border border-slate-800/50 hover:border-indigo-500/20 transition-all"
              >
                {/* Avatar / Icon */}
                {isOverdueAlert ? (
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                ) : act.user?.avatarUrl ? (
                  <img
                    src={act.user.avatarUrl}
                    alt={act.user.name}
                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-700/80 shrink-0 mt-0.5"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0 mt-0.5">
                    {act.user?.name?.charAt(0) || 'U'}
                  </div>
                )}

                {/* Message & Meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {act.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                    </span>
                    {act.project?.name && (
                      <>
                        <span>•</span>
                        <span className="text-slate-400 truncate">{act.project.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/40 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Live activity stream</span>
        <span>Last updated: {lastRefreshedAt.toLocaleTimeString()}</span>
      </div>
    </div>
  );
};
