/**
 * @file src/shared/lib/axiosInstance.ts
 * @description Centralised Axios instance for all API calls.
 *
 * Features:
 *   - baseURL from VITE_API_URL environment variable
 *   - withCredentials: true (sends HTTP-only refresh token cookie)
 *   - Request interceptor: attaches Authorization: Bearer <accessToken>
 *   - Response interceptor:
 *       On 401 → calls POST /auth/refresh once to rotate the token
 *       On refresh success → retries original request with new token
 *       On refresh failure → calls logout() and redirects to /login
 *
 * IMPORTANT: Never log req/res bodies — they may contain PHI.
 */

import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../../features/auth/store/authStore';

// ── Create the base instance ───────────────────────────────────────────────

export const api = axios.create({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseURL:         (import.meta as any).env?.VITE_API_URL ?? '/api/v1',
  withCredentials: true, // Required to send the HTTP-only refresh token cookie
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout (important on slow 2G rural connections)
});

// ── Request interceptor — attach access token ─────────────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ── Response interceptor — auto-refresh on 401 ───────────────────────────

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
// Queue of requests that arrived while a refresh was in progress
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject:  (error: unknown) => void;
}> = [];

/** Process all queued requests after a successful token refresh */
function processQueue(error: unknown, token: string | null = null): void {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  refreshQueue = [];
}

api.interceptors.response.use(
  // Pass through successful responses unchanged
  (response) => response,

  // Handle errors
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };

    // Only attempt refresh on 401 errors, and only once per original request
    if (error.response?.status !== 401 || originalRequest._retried) {
      return Promise.reject(error);
    }

    // Don't try to refresh if the failing request IS the refresh endpoint
    // (prevents infinite loop)
    if (originalRequest.url?.includes('/auth/refresh')) {
  return Promise.reject(error);
}

    // Mark this request so we don't retry it again
    originalRequest._retried = true;

    if (isRefreshing) {
      // Another refresh is already in flight — queue this request
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    // Start the refresh flow
    isRefreshing = true;

    try {
      const { data } = await api.post<{ accessToken: string }>('/auth/refresh');
      const newToken = data.accessToken;

      // Update the Zustand store with the new token
      useAuthStore.getState().setAccessToken(newToken);

      // Attach new token to the original failed request
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }

      // Release all queued requests
      processQueue(null, newToken);

      // Retry the original request
      return api(originalRequest);
    } catch (refreshError) {
  processQueue(refreshError, null);
  const { user } = useAuthStore.getState();
  if (user) {
    useAuthStore.getState().logout();
  }
  return Promise.reject(refreshError);
} finally {
      isRefreshing = false;
    }
  }
);

export default api;
