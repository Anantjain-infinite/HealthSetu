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
  // Fetch all active consultations — PENDING + ACCEPTED + IN_PROGRESS
  // The backend accepts a single status param; we make three parallel requests
  // and merge them so the doctor sees the full picture in one list.
  const [pending, accepted, inProgress] = await Promise.all([
    api.get('/consultations', { params: { status: 'PENDING',     cursor, limit } }),
    api.get('/consultations', { params: { status: 'ACCEPTED',    cursor, limit } }),
    api.get('/consultations', { params: { status: 'IN_PROGRESS', cursor, limit } }),
  ]);

  // Merge and sort: IN_PROGRESS first, then ACCEPTED, then PENDING
  const statusOrder: Record<string, number> = {
    IN_PROGRESS: 0,
    ACCEPTED:    1,
    PENDING:     2,
  };

  const allRows = [
    ...inProgress.data.data,
    ...accepted.data.data,
    ...pending.data.data,
  ].sort((a: ConsultationSummary, b: ConsultationSummary) =>
    (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
  );

  const totalCount =
    (inProgress.data.meta.total ?? 0) +
    (accepted.data.meta.total ?? 0) +
    (pending.data.meta.total ?? 0);

  return {
    data: allRows,
    meta: {
      total:       totalCount,
      limit,
      hasNextPage: pending.data.meta.hasNextPage ||
                   accepted.data.meta.hasNextPage ||
                   inProgress.data.meta.hasNextPage,
    },
  };
}

export async function acceptConsultation(
  consultationId: string
): Promise<ConsultationSummary> {
  const { data } = await api.patch(`/consultations/${consultationId}/accept`);
  return data;
}

export async function startConsultation(
  consultationId: string
): Promise<ConsultationSummary> {
  const { data } = await api.patch(`/consultations/${consultationId}/start`);
  return data;
}

export async function addConsultationNotes(
  consultationId: string,
  notes: string
): Promise<ConsultationSummary> {
  const { data } = await api.patch(`/consultations/${consultationId}/notes`, { notes });
  return data;
}