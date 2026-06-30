/**
 * @file src/features/emergency/api/emergencyApi.ts
 */

import api from '../../../shared/lib/axiosInstance';
import type { PaginatedResponse, EmergencyLog } from '../../../shared/types';

export async function triggerSOS(payload: { lat?: number; lng?: number }) {
  const { data } = await api.post<{ success: boolean; message: string }>(
    '/emergency/sos',
    payload
  );
  return data;
}

export async function getEmergencyLogs(page = 1): Promise<PaginatedResponse<EmergencyLog>> {
  const { data } = await api.get('/emergency/logs', { params: { page, limit: 10 } });
  return data;
}
