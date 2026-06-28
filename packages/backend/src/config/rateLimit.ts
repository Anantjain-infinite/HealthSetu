/**
 * @file src/config/rateLimit.ts
 * @description Three separate express-rate-limit configurations:
 *   - authLimiter    : 10 req / 15 min per IP  (login / register)
 *   - sosLimiter     : 1 req / 60 sec per userId (SOS emergency endpoint)
 *   - generalLimiter : 500 req / 15 min per IP (all other routes)
 *
 * On limit hit, returns HTTP 429 with:
 *   { error: "Too many requests", retryAfter: <seconds> }
 */

import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';

/** Shared handler that produces a consistent 429 JSON body */
const limitReachedHandler = (req: Request, res: Response): void => {
  const resetTime = res.getHeader('X-RateLimit-Reset');
  const retryAfter =
    resetTime
      ? Math.ceil((Number(resetTime) * 1000 - Date.now()) / 1000)
      : 60;

  res.status(429).json({
    error: 'Too many requests',
    retryAfter: retryAfter > 0 ? retryAfter : 60,
  });
};

/** Shared options applied to all limiters */
const sharedOptions: Partial<Options> = {
  standardHeaders: true,   // Sets X-RateLimit-Limit / Remaining / Reset headers
  legacyHeaders: false,    // Disable deprecated X-RateLimit-* headers
  handler: limitReachedHandler,
};

/**
 * Auth limiter — 10 requests per 15 minutes per IP.
 * Applied to: POST /auth/login, POST /auth/register, POST /auth/refresh
 */
export const authLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: undefined, // Handled by `handler`
  keyGenerator: (req) => req.ip ?? 'unknown',
});

/**
 * SOS limiter — 1 request per 60 seconds per authenticated userId.
 * Keyed by userId (not IP) so patients cannot be blocked by another user
 * sharing the same IP (e.g., rural internet café).
 * Falls back to IP if userId is not yet available (should never happen on
 * this authenticated endpoint, but is safer).
 */
export const sosLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 1000, // 60 seconds
  max: 1,
  keyGenerator: (req) => {
    // req.user is attached by verifyToken middleware before this runs
    const user = (req as Request & { user?: { userId: string } }).user;
    return user?.userId ?? req.ip ?? 'unknown';
  },
});

/**
 * General limiter — 500 requests per 15 minutes per IP.
 * Applied globally in app.ts as a catch-all baseline.
 */
export const generalLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  keyGenerator: (req) => req.ip ?? 'unknown',
});
