import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { sendError } from '../utils/response';

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required before checking permissions.', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. You do not have permission to perform this action. Required: [${allowedRoles.join(', ')}], Current: ${req.user.role}`,
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
};

export const requireAdmin = authorize(Role.ADMIN);
export const requireAdminOrPM = authorize(Role.ADMIN, Role.PROJECT_MANAGER);
