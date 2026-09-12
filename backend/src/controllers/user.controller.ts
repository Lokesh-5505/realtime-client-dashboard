import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess } from '../utils/response';
import { Role } from '@prisma/client';

export const listDevelopers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const developers = await prisma.user.findMany({
      where: { role: Role.DEVELOPER },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { name: 'asc' },
    });
    return sendSuccess(res, developers);
  } catch (error) {
    next(error);
  }
};

export const listAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            assignedTasks: true,
            projectsManaged: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
    return sendSuccess(res, users);
  } catch (error) {
    next(error);
  }
};
