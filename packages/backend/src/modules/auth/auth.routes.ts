/**
 * @file src/modules/auth/auth.routes.ts
 * @description Express router for all authentication endpoints.
 *
 * Routes:
 *   POST   /api/v1/auth/register   — create account
 *   POST   /api/v1/auth/login      — login, get tokens
 *   POST   /api/v1/auth/refresh    — rotate refresh token
 *   POST   /api/v1/auth/logout     — revoke token, clear cookie
 *   GET    /api/v1/auth/me         — get current user (session restore)
 *
 * Middleware applied per-route:
 *   authLimiter    — on register + login (10 req / 15 min per IP)
 *   validateRequest— Zod schema validation before controller
 *   verifyToken    — JWT verification on protected routes
 */

import { Router } from 'express';
import * as authController from './auth.controller';
import { verifyToken } from './auth.middleware';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { registerSchema, loginSchema } from './auth.schema';
import { authLimiter } from '../../config/rateLimit';

export const authRouter = Router();

// ── Public routes (rate-limited) ──────────────────────────────────────────
authRouter.post(
  '/register',
  authLimiter,
  validateRequest(registerSchema),
  authController.register
);

authRouter.post(
  '/login',
  authLimiter,
  validateRequest(loginSchema),
  authController.login
);

// Refresh does not need authLimiter — the refresh token itself is the credential
authRouter.post('/refresh', authController.refresh);

// ── Protected routes ──────────────────────────────────────────────────────
authRouter.post('/logout', verifyToken, authController.logout);
authRouter.get('/me',      verifyToken, authController.getMe);
