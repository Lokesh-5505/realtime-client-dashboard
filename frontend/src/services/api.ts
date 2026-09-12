import {
  User,
  Project,
  Task,
  ActivityLog,
  NotificationItem,
  DashboardStats,
  Client,
  TaskStatus,
  Priority,
  ProjectStatus,
} from '../types';

export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

let currentAccessToken: string | null = localStorage.getItem('agency_access_token');

export const setAccessToken = (token: string | null) => {
  currentAccessToken = token;
  if (token) {
    localStorage.setItem('agency_access_token', token);
  } else {
    localStorage.removeItem('agency_access_token');
  }
};

export const getAccessToken = () => currentAccessToken;

interface RequestOptions extends RequestInit {
  retry?: boolean;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (currentAccessToken) {
    headers.set('Authorization', `Bearer ${currentAccessToken}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensure HttpOnly refresh token cookie is sent
  });

  // Handle 401 Unauthorized - attempt silent token refresh once
  if (response.status === 401 && !options.retry && !endpoint.includes('/api/auth/login') && !endpoint.includes('/api/auth/refresh')) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const refreshData = await refreshRes.json();
      if (refreshData.success && refreshData.data?.accessToken) {
        setAccessToken(refreshData.data.accessToken);
        // Retry the original request
        return apiRequest<T>(endpoint, { ...options, retry: true });
      } else {
        setAccessToken(null);
      }
    } catch {
      setAccessToken(null);
    }
  }

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMsg = data.error?.message || data.message || 'An unexpected API error occurred';
    throw new Error(errorMsg);
  }

  return data.data;
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ accessToken: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  refresh: () =>
    apiRequest<{ accessToken: string; user: User }>('/api/auth/refresh', {
      method: 'POST',
    }),
  logout: () =>
    apiRequest<null>('/api/auth/logout', {
      method: 'POST',
    }),
  getMe: () => apiRequest<User>('/api/auth/me'),
  getDemoUsers: () => apiRequest<User[]>('/api/auth/demo-users'),
};

// Project API
export const projectApi = {
  list: () => apiRequest<Project[]>('/api/projects'),
  getById: (id: string) => apiRequest<Project>(`/api/projects/${id}`),
  create: (data: { name: string; description?: string; clientId: string; status?: ProjectStatus }) =>
    apiRequest<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Project>) =>
    apiRequest<Project>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// Task API
export const taskApi = {
  list: (params: Record<string, string | undefined> = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val) searchParams.set(key, val);
    });
    const queryStr = searchParams.toString();
    return apiRequest<Task[]>(`/api/tasks${queryStr ? `?${queryStr}` : ''}`);
  },
  getById: (id: string) => apiRequest<Task>(`/api/tasks/${id}`),
  create: (data: {
    title: string;
    description?: string;
    projectId: string;
    assignedToId?: string;
    priority?: Priority;
    dueDate?: string;
  }) =>
    apiRequest<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, status: TaskStatus) =>
    apiRequest<Task>(`/api/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  updateDetails: (id: string, data: Partial<Task>) =>
    apiRequest<Task>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    }),
};

// Activity API
export const activityApi = {
  getFeed: (limit = 20, since?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (since) params.set('since', since);
    return apiRequest<ActivityLog[]>(`/api/activity/feed?${params.toString()}`);
  },
};

// Notification API
export const notificationApi = {
  list: (limit = 20) =>
    apiRequest<{ notifications: NotificationItem[]; unreadCount: number }>(`/api/notifications?limit=${limit}`),
  markAsRead: (id: string) =>
    apiRequest<{ success: boolean; unreadCount: number }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    }),
  markAllAsRead: () =>
    apiRequest<{ success: boolean; unreadCount: number }>('/api/notifications/mark-all-read', {
      method: 'POST',
    }),
};

// Stats API
export const statsApi = {
  getDashboard: () => apiRequest<DashboardStats>('/api/stats/dashboard'),
};

// Client API
export const clientApi = {
  list: () => apiRequest<Client[]>('/api/clients'),
  create: (data: { name: string; company: string; email: string }) =>
    apiRequest<Client>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Users API
export const userApi = {
  listDevelopers: () => apiRequest<User[]>('/api/users/developers'),
  listAll: () => apiRequest<User[]>('/api/users/all'),
};
