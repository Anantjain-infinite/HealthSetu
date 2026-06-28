/**
 * @file src/shared/lib/queryClient.ts
 * @description TanStack Query (React Query) client configuration.
 *
 * Defaults:
 *   - staleTime:             5 minutes (reduce unnecessary refetches on slow networks)
 *   - gcTime:                10 minutes (keep unused cache longer for offline use)
 *   - retry:                 2 attempts, skipping 401/403/404 (non-retriable)
 *   - refetchOnWindowFocus:  true by default (doctor queue needs fresh data)
 *   - mutation onError:      show react-hot-toast with the error message
 */

import { QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { ApiError } from '../types';
import type { AxiosError } from 'axios';

// Errors that should never be retried automatically
const NON_RETRIABLE_STATUSES = new Set([401, 403, 404, 422]);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 minutes — health records and consultation history change infrequently
      staleTime: 5 * 60 * 1000,
      // 10 minutes garbage collection time — keeps cache alive for offline scenarios
      gcTime: 10 * 60 * 1000,
      // Retry logic — skip non-retriable HTTP errors
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        const status = (error as AxiosError)?.response?.status;
        if (status && NON_RETRIABLE_STATUSES.has(status)) return false;
        return true;
      },
      // Retry delay — exponential back-off: 1s, 2s
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      // Refetch on window focus is true by default;
      // individual queries that should NOT refetch (e.g. patient history)
      // override this with refetchOnWindowFocus: false
      refetchOnWindowFocus: true,
      // Do not refetch when the network reconnects — we handle this manually
      refetchOnReconnect: 'always',
    },

    mutations: {
      // Show a toast notification on every mutation error
      onError: (error: unknown) => {
        const axiosError = error as AxiosError<ApiError>;
        const message =
          axiosError?.response?.data?.error ??
          (error instanceof Error ? error.message : 'Something went wrong');

        toast.error(message, {
          id:       'mutation-error',
          duration: 4000,
        });
      },
    },
  },
});
