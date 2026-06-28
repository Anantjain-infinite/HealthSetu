/**
 * @file src/shared/errors/errorHandler.ts
 * @description Global Express error-handling middleware.
 *
 * Handles:
 *   - AppError (our custom typed errors)
 *   - Prisma known request errors (P2002 unique, P2025 not found)
 *   - JWT errors (invalid / expired token)
 *   - Zod validation errors (schema parse failures)
 *   - All other unhandled errors → 500
 *
 * Never exposes stack traces in production responses.
 * Always responds with: { error: string, code?: string, details?: object }
 */

import type { Request, Response, NextFunction } from 'express';
// Use require so this works even before prisma generate is run
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Prisma } = require('@prisma/client');
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ZodError } from 'zod';
import { AppError } from './AppError';
import { logger } from '../../config/logger';
import { env } from '../../config/env';

/** Shape of every error response from this API */
interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
  /** Only included in non-production for debugging */
  stack?: string;
}

// ── Prisma error code → HTTP status map ───────────────────────────────────
const PRISMA_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: 'A record with this value already exists' },
  P2025: { status: 404, message: 'Record not found' },
  P2003: { status: 400, message: 'Related record not found (foreign key constraint)' },
  P2014: { status: 400, message: 'Invalid ID provided' },
};

/**
 * Express error-handling middleware.
 * Must be the LAST middleware registered in app.ts.
 *
 * @param err  Any thrown error
 * @param req  Express request
 * @param res  Express response
 * @param _next Next function (required for Express to recognise this as error handler)
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // ── 1. Our custom AppError ───────────────────────────────────────────
  if (err instanceof AppError) {
    if (err.isServerError) {
      logger.error('AppError (server)', {
        message: err.message,
        statusCode: err.statusCode,
        stack: err.stack,
        path: req.path,
      });
    }

    const body: ErrorResponse = { error: err.message };
    if (err.code)    body.code    = err.code;
    if (err.details) body.details = err.details;
    if (!env.isProduction && err.stack) body.stack = err.stack;

    res.status(err.statusCode).json(body);
    return;
  }

  // ── 2. Zod validation error ──────────────────────────────────────────
  if (err instanceof ZodError) {
    res.status(422).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // ── 3. Prisma known request errors ──────────────────────────────────
  if (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    err instanceof Prisma.PrismaClientKnownRequestError
  ) {
    const prismaErr = err as { code: string; meta?: unknown };
    const mapped = PRISMA_ERROR_MAP[prismaErr.code];
    if (mapped) {
      res.status(mapped.status).json({
        error: mapped.message,
        code: prismaErr.code,
      });
      return;
    }

    // Unknown Prisma error — log and return 500
    logger.error('Unhandled Prisma error', {
      code: prismaErr.code,
      path: req.path,
    });
    res.status(500).json({ error: 'Database error', code: prismaErr.code });
    return;
  }

  // ── 4. Prisma validation errors ──────────────────────────────────────
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error('Prisma validation error', { path: req.path });
    res.status(400).json({
      error: 'Invalid data sent to the database',
      code: 'PRISMA_VALIDATION',
    });
    return;
  }

  // ── 5. JWT errors ────────────────────────────────────────────────────
  if (err instanceof TokenExpiredError) {
    res.status(401).json({ error: 'Token has expired', code: 'TOKEN_EXPIRED' });
    return;
  }
  if (err instanceof JsonWebTokenError) {
    res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
    return;
  }

  // ── 6. All other errors → 500 ────────────────────────────────────────
  const unknownError = err instanceof Error ? err : new Error(String(err));

  logger.error('Unhandled error', {
    message: unknownError.message,
    stack: unknownError.stack,
    path: req.path,
    method: req.method,
  });

  const body: ErrorResponse = { error: 'Internal server error' };
  if (!env.isProduction) body.stack = unknownError.stack;

  res.status(500).json(body);
}
