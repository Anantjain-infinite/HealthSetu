/**
 * @file src/features/auth/api/authApi.ts
 * @description API call functions for the auth module.
 * All functions use the shared Axios instance (with JWT interceptor).
 */

import api from '../../../shared/lib/axiosInstance';
import type {
  LoginResponse,
  RegisterPayload,
  AuthUser,
} from '../../../shared/types';

/**
 * Registers a new patient or doctor account.
 * @returns { message, userId }
 */
export async function registerUser(
  payload: RegisterPayload
): Promise<{ message: string; userId: string }> {
  const { data } = await api.post('/auth/register', payload);
  return data;
}

/**
 * Logs in with email + password.
 * The server sets the HTTP-only refresh token cookie automatically.
 * @returns { accessToken, user }
 */
export async function loginUser(payload: {
  email:    string;
  password: string;
}): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data;
}

/**
 * Logs out — revokes the refresh token and clears the server-side cookie.
 * The Axios interceptor sends the current access token as Authorization header.
 */
export async function logoutUser(): Promise<void> {
  await api.post('/auth/logout');
}

/**
 * Fetches the current user's profile using the access token.
 * Used to restore session state on app mount.
 */
export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}
