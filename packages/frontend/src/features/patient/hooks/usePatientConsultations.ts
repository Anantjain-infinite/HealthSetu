/**
 * @file src/features/patient/hooks/usePatientConsultations.ts
 * @description TanStack Query hooks for patient consultation data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getConsultationHistory,
  getUpcomingConsultations,
  getMyStats,
  createConsultation,
} from '../api/patientApi';
import type { CreateConsultationPayload } from '../../../shared/types';

// ── Query key factory ──────────────────────────────────────────────────────

export const consultationKeys = {
  history:  (page: number) => ['consultations', 'history', { page }] as const,
  upcoming: ()             => ['consultations', 'upcoming']          as const,
  stats:    ()             => ['patient', 'stats']                   as const,
};

// ── Hooks ──────────────────────────────────────────────────────────────────

/** Paginated consultation history — cache-first, no refetch on focus */
export function useConsultationHistory(page: number) {
  return useQuery({
    queryKey: consultationKeys.history(page),
    queryFn:  () => getConsultationHistory(page),
    placeholderData: (prev) => prev, // keep previous page data while loading next
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/** Upcoming consultations for the dashboard card */
export function useUpcomingConsultations() {
  return useQuery({
    queryKey: consultationKeys.upcoming(),
    queryFn:  getUpcomingConsultations,
    staleTime: 2 * 60 * 1000,
  });
}

/** Quick stats for the dashboard header */
export function usePatientStats() {
  return useQuery({
    queryKey: consultationKeys.stats(),
    queryFn:  getMyStats,
    staleTime: 2 * 60 * 1000,
  });
}

/** Mutation to book a new consultation */
export function useCreateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateConsultationPayload) => createConsultation(payload),
    onSuccess: () => {
      toast.success('Consultation booked successfully!');
      // Invalidate both lists so they refetch
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: consultationKeys.stats() });
    },
  });
}
