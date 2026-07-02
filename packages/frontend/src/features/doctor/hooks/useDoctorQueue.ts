/**
 * @file src/features/doctor/hooks/useDoctorQueue.ts
 * @description TanStack Query hooks for the doctor feature.
 * Spec 5.7: 30-second polling, only when tab is visible.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getDoctorQueue, acceptConsultation, startConsultation, addConsultationNotes } from '../api/doctorApi';

export const doctorKeys = {
  queue: (cursor?: string) => ['doctor', 'queue', cursor] as const,
};

/** Doctor consultation queue — polls every 30s, only when tab is focused */
export function useDoctorQueue(cursor?: string) {
  return useQuery({
    queryKey: doctorKeys.queue(cursor),
    queryFn:  () => getDoctorQueue(cursor),
    refetchInterval:      30_000,
    refetchIntervalInBackground: false, // pause polling when tab is hidden
    staleTime: 10_000,
  });
}

/** Accept a pending consultation */
export function useAcceptConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (consultationId: string) => acceptConsultation(consultationId),
    onSuccess: () => {
      toast.success('Consultation accepted!');
      queryClient.invalidateQueries({ queryKey: ['doctor', 'queue'] });
    },
  });
}

/** Start an accepted consultation — moves it to IN_PROGRESS */
export function useStartConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (consultationId: string) => startConsultation(consultationId),
    onSuccess: () => {
      toast.success('Consultation started!');
      queryClient.invalidateQueries({ queryKey: ['doctor', 'queue'] });
    },
  });
}

/** Add notes and complete a consultation */
export function useAddNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ consultationId, notes }: { consultationId: string; notes: string }) =>
      addConsultationNotes(consultationId, notes),
    onSuccess: () => {
      toast.success('Notes saved and consultation completed!');
      queryClient.invalidateQueries({ queryKey: ['doctor', 'queue'] });
    },
  });
}
