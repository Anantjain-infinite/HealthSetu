/**
 * @file src/modules/auth/auth.controller.ts
 * @description HTTP layer for the auth module. Thin controller — all business
 * logic lives in auth.service.ts. Responsible for:
 *   - Reading HTTP request data
 *   - Calling service methods
 *   - Setting / clearing the HTTP-only refresh token cookie
 *   - Sending HTTP responses
 *
 * Cookie settings:
 *   httpOnly:  true  — JS cannot read the refresh token (XSS protection)
 *   secure:    true in production — only sent over HTTPS
 *   sameSite: 'strict' — CSRF protection
 *   maxAge:    7 days (milliseconds)
 */

import type { Request, Response } from 'express';
import * as authService from './auth.service';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { env } from '../../config/env';
import type { RegisterInput, LoginInput } from './auth.schema';

// Cookie configuration
const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly:  true,
    secure:    env.isProduction,  // Only HTTPS in production
    sameSite:  'none',
    maxAge:    REFRESH_COOKIE_MAX_AGE_MS,
    path:      '/api/v1/auth',    // Cookie only sent to auth endpoints
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly:  true,
    secure:    env.isProduction,
    sameSite:  'none',
    path:      '/api/v1/auth',
  });
}

/**
 * POST /api/v1/auth/register
 * Body validated by registerSchema before this runs.
 * Returns: 201 { message, userId }
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as RegisterInput;
  const result = await authService.register(input);
  res.status(201).json(result);
});

/**
 * POST /api/v1/auth/login
 * Body validated by loginSchema before this runs.
 * Returns: 200 { accessToken, user: { id, email, role } }
 * Side effect: sets HTTP-only refreshToken cookie
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as LoginInput;
  const { accessToken, refreshToken, user } = await authService.login(input);

  setRefreshCookie(res, refreshToken);

  res.status(200).json({ accessToken, user });
});

/**
 * POST /api/v1/auth/refresh
 * Reads refreshToken from HTTP-only cookie.
 * Returns: 200 { accessToken }
 * Side effect: rotates the refresh token (old revoked, new cookie set)
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawToken: string | undefined = req.cookies[REFRESH_COOKIE_NAME];

  if (!rawToken) {
    res.status(401).json({ error: 'No refresh token provided', code: 'NO_TOKEN' });
    return;
  }

  const { accessToken, refreshToken } = await authService.refresh(rawToken);

  setRefreshCookie(res, refreshToken);
  res.status(200).json({ accessToken });
});

/**
 * POST /api/v1/auth/logout
 * Requires: valid access token (verifyToken middleware)
 * Returns: 204 No Content
 * Side effect: revokes refresh token in DB, clears cookie
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawToken: string | undefined = req.cookies[REFRESH_COOKIE_NAME];
  await authService.logout(rawToken);
  clearRefreshCookie(res);
  res.status(204).send();
});

/**
 * GET /api/v1/auth/me
 * Requires: valid access token (verifyToken middleware)
 * Returns: 200 { id, email, role, profileId, fullName }
 * Used by the frontend on app mount to restore session state.
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId; // verifyToken guarantees req.user exists
  const profile = await authService.getMe(userId);
  res.status(200).json(profile);
});
