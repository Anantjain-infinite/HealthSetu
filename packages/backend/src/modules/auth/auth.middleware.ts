/**
 * @file src/modules/auth/auth.middleware.ts
 * @description Express middleware for JWT authentication and role-based authorisation.
 *
 * verifyToken:
 *   Extracts Bearer token from the Authorization header, verifies the JWT
 *   signature and expiry, then attaches the decoded payload to req.user.
 *   Returns 401 on any failure.
 *
 * requireRole(...roles):
 *   Factory that returns middleware which checks req.user.role is in the
 *   allowed roles array. MUST be used after verifyToken. Returns 403 on mismatch.
 *
 * Usage:
 *   router.get('/patients', verifyToken, requireRole('DOCTOR', 'ADMIN'), handler)
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';
import type { TokenPayload } from './auth.service';

// ── Extend Express Request type globally ──────────────────────────────────
// This augmentation makes req.user available throughout the codebase.
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Verifies the JWT Bearer token from the Authorization header.
 * On success: attaches { userId, role } to req.user and calls next().
 * On failure: passes AppError(401) to next(err).
 */
export function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('Authorization header missing or malformed', 401, 'NO_TOKEN'));
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer:   'health-setu',
      audience: 'health-setu-client',
    }) as TokenPayload;

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError('Access token has expired', 401, 'TOKEN_EXPIRED'));
    } else {
      next(new AppError('Invalid access token', 401, 'INVALID_TOKEN'));
    }
  }
}

/**
 * Factory middleware — checks that req.user.role is one of the allowed roles.
 * MUST be called after verifyToken (relies on req.user being set).
 *
 * @param roles  One or more Role enum values: 'PATIENT' | 'DOCTOR' | 'ADMIN'
 *
 * @example
 *   router.post('/sos', verifyToken, requireRole('PATIENT'), sosHandler);
 *   router.get('/queue', verifyToken, requireRole('DOCTOR'), queueHandler);
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // Safeguard — should never happen if verifyToken ran first
      next(new AppError('Authentication required', 401, 'NO_TOKEN'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(
        new AppError(
          `Access denied. Required role: ${roles.join(' or ')}`,
          403,
          'FORBIDDEN'
        )
      );
      return;
    }

    next();
  };
}
