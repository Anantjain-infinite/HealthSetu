/**
 * @file src/features/patient/hooks/useHealthRecords.ts
 * @description TanStack Query hook for patient dashboard profile + stats + upcoming.
 */

import { useQuery } from '@tanstack/react-query';
import { getMyProfile, getMyStats } from '../api/patientApi';

export const patientKeys = {
  profile: ['patient', 'profile'] as const,
  stats:   ['patient', 'stats']   as const,
};

export function usePatientProfile() {
  return useQuery({
    queryKey: patientKeys.profile,
    queryFn:  getMyProfile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function usePatientStats() {
  return useQuery({
    queryKey: patientKeys.stats,
    queryFn:  getMyStats,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}