/**
 * @file src/features/doctor/api/doctorApi.ts
 * @description API functions for the doctor feature.
 */

import api from '../../../shared/lib/axiosInstance';
import type { PaginatedResponse, ConsultationSummary } from '../../../shared/types';

export async function getDoctorQueue(
  cursor?: string,
  limit = 20
): Promise<PaginatedResponse<ConsultationSummary>> {
  const { data } = await api.get('/consultations', {
    params: { status: 'PENDING', cursor, limit },
  });
  return data;
}

export async function acceptConsultation(
  consultationId: string
): Promise<ConsultationSummary> {
  const { data } = await api.patch(`/consultations/${consultationId}/accept`);
  return data;
}

export async function addConsultationNotes(
  consultationId: string,
  notes: string
): Promise<ConsultationSummary> {
  const { data } = await api.patch(`/consultations/${consultationId}/notes`, { notes });
  return data;
}
