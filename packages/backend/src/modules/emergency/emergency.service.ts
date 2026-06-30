/**
 * @file src/modules/emergency/emergency.service.ts
 * @description Emergency SOS business logic.
 *
 * Spec 4.6:
 *   - Fetch patient profile (fullName, address, emergencyContact)
 *   - Send Twilio SMS
 *   - Insert emergency_log regardless of SMS success/failure
 *   - If Twilio throws → smsStatus=FAILED, still return 200 with success:false
 *   - NEVER log GPS coordinates (privacy)
 */

import { prisma } from '../../config/database';
import { twilioClient, TWILIO_FROM } from '../../shared/utils/twilioClient';
import { createLogger } from '../../config/logger';
import { AppError } from '../../shared/errors/AppError';
import {
  parseOffsetParams,
  getSkip,
  buildOffsetResult,
} from '../../shared/utils/paginate';

const log = createLogger('emergency.service');

// ── SOS ────────────────────────────────────────────────────────────────────

export async function triggerSOS(
  patientUserId: string,
  lat?: number,
  lng?: number
): Promise<{ success: boolean; message: string }> {
  // Fetch patient profile
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
    select: {
      id:               true,
      fullName:         true,
      address:          true,
      emergencyContact: true,
    },
  });

  if (!patient) {
    throw new AppError('Patient profile not found', 404, 'PATIENT_NOT_FOUND');
  }

  // Build SMS body — include GPS only if provided
  const gpsText = lat != null && lng != null ? `GPS: ${lat},${lng}` : 'GPS: unavailable';
  const smsBody =
    `EMERGENCY ALERT: ${patient.fullName} may need immediate help ` +
    `at ${patient.address}. ${gpsText}. Please call immediately.`;

  // Attempt SMS
  let smsStatus: 'SENT' | 'FAILED' = 'FAILED';
  let smsError: string | undefined;

  try {
    await twilioClient.messages.create({
      body: smsBody,
      from: TWILIO_FROM,
      to:   patient.emergencyContact,
    });
    smsStatus = 'SENT';
    log.info('Emergency SOS SMS sent', { patientId: patient.id, smsStatus });
  } catch (err) {
    smsError = err instanceof Error ? err.message : String(err);
    log.error('Emergency SOS SMS failed', { patientId: patient.id, error: smsError });
  }

  // Always insert the log regardless of SMS outcome
  await prisma.emergencyLog.create({
    data: {
      patientId:   patient.id,
      smsStatus,
      locationLat: lat  != null ? lat  : null,
      locationLng: lng != null ? lng : null,
    },
  });

  if (smsStatus === 'SENT') {
    return { success: true, message: 'Emergency alert sent.' };
  }
  return { success: false, message: 'Alert logged but SMS delivery failed.' };
}

// ── History ────────────────────────────────────────────────────────────────

export async function getEmergencyLogs(
  patientUserId: string,
  query: { page?: unknown; limit?: unknown }
) {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
    select: { id: true },
  });
  if (!patient) throw new AppError('Patient profile not found', 404, 'PATIENT_NOT_FOUND');

  const params = parseOffsetParams({ page: query.page, limit: query.limit ?? 10 });
  const skip   = getSkip(params);

  const [rows, total] = await Promise.all([
    prisma.emergencyLog.findMany({
      where:   { patientId: patient.id },
      orderBy: { triggeredAt: 'desc' },
      skip,
      take: params.limit,
      select: {
        id:          true,
        triggeredAt: true,
        smsStatus:   true,
        // Return null for coordinates — we don't expose GPS in responses
        locationLat: false,
        locationLng: false,
      },
    }),
    prisma.emergencyLog.count({ where: { patientId: patient.id } }),
  ]);

  return buildOffsetResult(rows, total, params);
}
