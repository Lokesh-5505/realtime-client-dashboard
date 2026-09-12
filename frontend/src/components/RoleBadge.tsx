import React from 'react';
import { Role } from '../types';
import { Shield, Briefcase, Code } from 'lucide-react';

interface RoleBadgeProps {
  role: Role;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md' }) => {
  const isSm = size === 'sm';

  switch (role) {
    case 'ADMIN':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <Shield className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Admin
        </span>
      );
    case 'PROJECT_MANAGER':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <Briefcase className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Project Manager
        </span>
      );
    case 'DEVELOPER':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <Code className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Developer
        </span>
      );
    default:
      return null;
  }
};
