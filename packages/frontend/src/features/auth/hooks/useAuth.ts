/**
 * @file src/features/auth/hooks/useAuth.ts
 * @description Custom hook that wraps auth operations with TanStack Query mutations.
 * Provides typed, loading-aware login, register, and logout functions
 * that update the Zustand store and show toasts on success/error.
 */

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { loginUser, registerUser, logoutUser } from '../api/authApi';
import type { RegisterPayload } from '../../../shared/types';

// ── Login ──────────────────────────────────────────────────────────────────

export function useLogin() {
  const { setAuth } = useAuthStore();
  const navigate    = useNavigate();

  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      loginUser(credentials),

    onSuccess: (data) => {
      setAuth(
        { ...data.user, profileId: null, fullName: null },
        data.accessToken
      );
      toast.success('Welcome back!');

      // Redirect based on role
      if (data.user.role === 'PATIENT') {
        navigate('/patient/dashboard', { replace: true });
      } else if (data.user.role === 'DOCTOR') {
        navigate('/doctor/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    },

    onError: (error: unknown) => {
      // Error toast is handled globally by queryClient mutation onError,
      // but we also handle 423 (account locked) with a specific message here.
      const status = (error as { response?: { status?: number; data?: { error?: string } } })
        ?.response?.status;
      if (status === 423) {
        const msg =
          (error as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? 'Account locked. Please try again later.';
        toast.error(msg, { duration: 6000 });
      }
      // Other errors are handled by the global mutation onError in queryClient.ts
    },
  });
}

// ── Register ───────────────────────────────────────────────────────────────

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerUser(payload),

    onSuccess: (data) => {
      toast.success(data.message ?? 'Account created! Please log in.');
      navigate('/login', { replace: true });
    },
  });
}

// ── Logout ─────────────────────────────────────────────────────────────────

export function useLogout() {
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      logout(); // Clears store + redirects to /login
    },
    onError: () => {
      // Force local logout even if the server request fails
      logout();
    },
  });
}
