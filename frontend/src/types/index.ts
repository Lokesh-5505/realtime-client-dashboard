export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
  createdAt?: string;
  _count?: {
    assignedTasks?: number;
    projectsManaged?: number;
  };
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  createdAt: string;
  _count?: {
    projects: number;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  clientId: string;
  client?: Client;
  managerId: string;
  manager?: User;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  };
}

export interface Task {
  id: string;
  taskNumber: number;
  title: string;
  description?: string | null;
  projectId: string;
  project?: Project;
  assignedToId?: string | null;
  assignedTo?: User | null;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  project?: { id: string; name: string };
  taskId?: string | null;
  task?: { id: string; taskNumber: number; title: string; status: TaskStatus } | null;
  userId: string;
  user?: { id: string; name: string; email: string; role: Role; avatarUrl?: string | null };
  action: string;
  previousState?: string | null;
  newState?: string | null;
  message: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  role: Role;
  onlineUsersCount: number;
  overdueCount: number;
  // Admin fields
  totalProjects?: number;
  totalClients?: number;
  totalTasks?: number;
  tasksByStatus?: Record<TaskStatus, number>;
  // PM fields
  managedProjects?: Project[];
  totalManagedProjects?: number;
  tasksByPriority?: Record<Priority, number>;
  upcomingTasksThisWeek?: Task[];
  // Dev fields
  assignedTasksCount?: number;
  priorityTasks?: Task[];
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  dueFrom?: string;
  dueTo?: string;
  search?: string;
  projectId?: string;
}
