/**
 * @file src/features/auth/store/authStore.ts
 * @description Zustand store for authentication state.
 *
 * State:
 *   user        — authenticated user profile (id, email, role, profileId, fullName)
 *   accessToken — current JWT access token (NOT persisted to storage)
 *   isHydrated  — true once GET /auth/me has resolved on app mount
 *
 * Security rules:
 *   - accessToken is NEVER written to localStorage or sessionStorage.
 *     It lives only in memory. The HTTP-only cookie holds the refresh token.
 *   - Only { user } is persisted to sessionStorage so the UI can restore
 *     the user's name/role without a network round-trip on page reload.
 *     The access token is always re-fetched via /auth/refresh on reload.
 *
 * Actions:
 *   setAuth(user, token)  — called after successful login / refresh
 *   setAccessToken(token) — called after token rotation (interceptor)
 *   logout()              — clears state + redirects to /login
 *   hydrate()             — called on app mount; calls GET /auth/me
 */
let hydrateCalledOnce = false;
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthUser } from '../../../shared/types';

// ── Store shape ────────────────────────────────────────────────────────────

interface AuthState {
  user:        AuthUser | null;
  accessToken: string | null;
  isHydrated:  boolean;
}

interface AuthActions {
  setAuth:         (user: AuthUser, accessToken: string) => void;
  setAccessToken:  (accessToken: string) => void;
  logout:          () => void;
  hydrate:         () => Promise<void>;
  _setHydrated:    (value: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

// ── Store ──────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // ── Initial state ──────────────────────────────────────────────
      user:        null,
      accessToken: null,
      isHydrated:  false,

      // ── Actions ────────────────────────────────────────────────────

      /** Called after successful login — stores user + in-memory token */
      setAuth: (user, accessToken) => {
        set({ user, accessToken, isHydrated: true });
      },

      /** Called by the Axios interceptor after a token rotation */
      setAccessToken: (accessToken) => {
        set({ accessToken });
      },

      /** Clears all auth state and redirects to /login */
     logout: () => {
  hydrateCalledOnce = false;
  set({ user: null, accessToken: null, isHydrated: true });
},

      /**
       * Called once on app mount (in App.tsx via useEffect).
       * Attempts to restore the session:
       *   1. If we already have a user from sessionStorage, call POST /auth/refresh
       *      to get a fresh access token (the refresh token is in the HTTP-only cookie).
       *   2. If refresh succeeds, call GET /auth/me to get the full profile.
       *   3. If either fails, clear state (user must log in again).
       */
      hydrate: async () => {
        // Avoid circular import by importing api lazily
          if (hydrateCalledOnce) return;  // add this line
  hydrateCalledOnce = true;        // add this line
        const { api } = await import('../../../shared/lib/axiosInstance');

        try {
          // Always try to get a fresh access token first
          const refreshResponse = await api.post<{ accessToken: string }>(
            '/auth/refresh'
          );
          const accessToken = refreshResponse.data.accessToken;

          // Now fetch the full profile with the new token
          const meResponse = await api.get<AuthUser>('/auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          set({
            user:        meResponse.data,
            accessToken,
            isHydrated:  true,
          });
        } catch {
          // No valid session — clear any stale persisted user and mark hydrated
          // so the app stops showing the loading spinner
          set({ user: null, accessToken: null, isHydrated: true });
        }
      },

      _setHydrated: (value) => set({ isHydrated: value }),
    }),

    {
      name: 'health-setu-auth',
      // Use sessionStorage — cleared when the browser tab is closed
      // accessToken is explicitly excluded for security
      storage: createJSONStorage(() => sessionStorage),
      // Only persist the user object — NOT the access token
      partialize: (state) => ({ user: state.user }),
      // After rehydration from sessionStorage, isHydrated stays false
      // until hydrate() resolves (prevents flash of dashboard before session check)
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated  = false; // Will be set true by hydrate()
          state.accessToken = null;  // Never restored from storage
        }
      },
    }
  )
);
