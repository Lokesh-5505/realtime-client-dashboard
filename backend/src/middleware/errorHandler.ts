import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  console.error(`[Error] [${req.method}] ${req.originalUrl}:`, err);

  // Prisma known errors
  if (err.code === 'P2002') {
    return sendError(res, 'A unique constraint violation occurred on the submitted field.', 409, 'DUPLICATE_ENTRY');
  }
  if (err.code === 'P2025') {
    return sendError(res, 'Requested resource was not found in the database.', 404, 'NOT_FOUND');
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred. Please try again later.'
    : err.message || 'An unexpected error occurred';

  return sendError(
    res,
    message,
    statusCode,
    err.code || 'INTERNAL_SERVER_ERROR',
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined
  );
};
