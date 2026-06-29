/**
 * @file src/features/patient/api/patientApi.ts
 * @description API functions for the patient feature.
 */

import api from '../../../shared/lib/axiosInstance';
import type {
  PaginatedResponse,
  ConsultationSummary,
  CreateConsultationPayload,
  Doctor,
} from '../../../shared/types';

// ── Patient profile ────────────────────────────────────────────────────────

export async function getMyProfile() {
  const { data } = await api.get('/patients/me');
  return data;
}

export async function getMyStats(): Promise<{ total: number; pending: number; completed: number }> {
  const { data } = await api.get('/patients/me/stats');
  return data;
}

export async function getUpcomingConsultations(): Promise<ConsultationSummary[]> {
  const { data } = await api.get('/patients/me/upcoming');
  return data;
}

// ── Consultation history ───────────────────────────────────────────────────

export async function getConsultationHistory(
  page: number
): Promise<PaginatedResponse<ConsultationSummary>> {
  const { data } = await api.get('/consultations/history', { params: { page, limit: 20 } });
  return data;
}

// ── Create consultation ────────────────────────────────────────────────────

export async function createConsultation(
  payload: CreateConsultationPayload
): Promise<ConsultationSummary> {
  const { data } = await api.post('/consultations', payload);
  return data;
}

// ── Doctor search (used in SymptomForm) ───────────────────────────────────

export async function searchDoctors(search: string): Promise<Doctor[]> {
  const { data } = await api.get('/doctors', { params: { search } });
  return data;
}
