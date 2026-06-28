/**
 * @file src/shared/middleware/requestLogger.ts
 * @description Express middleware that logs every HTTP request with structured
 * JSON fields: method, url, statusCode, responseTimeMs, ip, userId.
 *
 * Attaches to the response 'finish' event so the status code is available
 * after the handler runs.
 *
 * IMPORTANT: Do NOT log req.body or res.body — they may contain passwords,
 * medical data, or prescription content (HIPAA concern).
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger';

/** Extended request type that includes user from JWT middleware */
interface AuthenticatedRequest extends Request {
  user?: { userId: string; role: string };
}

/**
 * Logs each request after the response finishes.
 * Log level is 'http' normally; escalates to 'error' for 5xx responses.
 */
export function requestLogger(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const startAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1_000_000;

    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTimeMs: Math.round(durationMs),
      ip: req.ip,
      // userId from JWT — undefined for unauthenticated requests
      userId: req.user?.userId,
      userAgent: req.get('user-agent'),
    };

    if (res.statusCode >= 500) {
      logger.error('HTTP request completed with server error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP request completed with client error', logData);
    } else {
      logger.http('HTTP request completed', logData);
    }
  });

  next();
}
