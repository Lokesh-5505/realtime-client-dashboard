import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectApi } from '../services/api';
import { Project } from '../types';
import {
  FolderKanban,
  Plus,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';

interface ProjectsPageProps {
  onOpenCreateProject: () => void;
  onSelectProject: (projectId: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  onOpenCreateProject,
  onSelectProject,
}) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await projectApi.list();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-400" />
            Client Projects
          </h2>
          <p className="text-xs text-slate-400">
            View and manage client project deliverables and team progress.
          </p>
        </div>

        {(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') && (
          <button
            onClick={onOpenCreateProject}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-lg shadow-indigo-500/25 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm animate-pulse">
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="p-16 text-center glass-panel rounded-3xl border border-slate-800/80">
          <FolderKanban className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-50" />
          <h3 className="text-sm font-semibold text-slate-300">No projects accessible</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {user?.role === 'PROJECT_MANAGER'
              ? 'You have not created any projects yet. Click "+ Create Project" to start one.'
              : 'No projects available for your role.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="glass-panel glass-panel-hover rounded-2xl p-6 border border-slate-800/80 hover:border-indigo-500/40 cursor-pointer flex flex-col justify-between transition-all group"
            >
              <div>
                {/* Client Company Tag */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                    <Building2 className="w-3 h-3" />
                    {project.client?.company || project.client?.name}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {project.status}
                  </span>
                </div>

                {/* Name & Description */}
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors mb-2 line-clamp-1">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Footer Meta */}
              <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-semibold text-slate-200">
                    {project._count?.tasks ?? 0} Tasks
                  </span>
                </div>

                <div className="flex items-center gap-1 text-indigo-400 group-hover:translate-x-0.5 transition-transform font-semibold text-xs">
                  <span>View Tasks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
