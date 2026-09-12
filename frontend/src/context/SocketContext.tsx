import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../services/api';
import { ActivityLog, NotificationItem, Task } from '../types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineCount: number;
  recentActivities: ActivityLog[];
  unreadNotificationCount: number;
  latestNotification: NotificationItem | null;
  latestUpdatedTask: Task | null;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  clearLatestNotification: () => void;
  setUnreadNotificationCount: React.Dispatch<React.SetStateAction<number>>;
  setRecentActivities: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [latestNotification, setLatestNotification] = useState<NotificationItem | null>(null);
  const [latestUpdatedTask, setLatestUpdatedTask] = useState<Task | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const token = getAccessToken();
    const wsUrl =
      import.meta.env.VITE_WS_URL ||
      import.meta.env.VITE_API_URL ||
      window.location.origin;

    // Connect to WebSocket server with JWT authentication handshake
    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to server as:', user.name);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      setIsConnected(false);
    });

    // Real-time presence updates
    socket.on('presence_update', (data: { count: number; userIds: string[] }) => {
      setOnlineCount(data.count);
    });

    // Real-time Activity Feed events
    socket.on('activity_feed_update', (activity: ActivityLog) => {
      console.log('[Socket] Activity received:', activity.message);
      setRecentActivities((prev) => {
        // Avoid duplicate by id
        if (prev.some((a) => a.id === activity.id)) return prev;
        return [activity, ...prev].slice(0, 50); // Keep latest 50
      });
    });

    // Real-time Notification event
    socket.on('new_notification', (notification: NotificationItem) => {
      console.log('[Socket] New notification received:', notification.title);
      setLatestNotification(notification);
      setUnreadNotificationCount((prev) => prev + 1);
    });

    // Real-time Task updates
    socket.on('task_updated', (task: Task) => {
      console.log('[Socket] Task update received:', task.title, task.status);
      setLatestUpdatedTask(task);
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  const joinProject = useCallback((projectId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_project', projectId);
    }
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_project', projectId);
    }
  }, []);

  const clearLatestNotification = () => {
    setLatestNotification(null);
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        onlineCount,
        recentActivities,
        unreadNotificationCount,
        latestNotification,
        latestUpdatedTask,
        joinProject,
        leaveProject,
        clearLatestNotification,
        setUnreadNotificationCount,
        setRecentActivities,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
