import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(2),
  company: z.string().min(2),
  email: z.string().email(),
});

export const listClients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });
    return sendSuccess(res, clients);
  } catch (error) {
    next(error);
  }
};

export const createClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, company, email } = req.body;
    const existing = await prisma.client.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return sendError(res, 'A client with this email already exists', 409, 'DUPLICATE_CLIENT');
    }

    const client = await prisma.client.create({
      data: {
        name,
        company,
        email: email.toLowerCase(),
      },
    });
    return sendSuccess(res, client, 'Client created', 201);
  } catch (error) {
    next(error);
  }
};
