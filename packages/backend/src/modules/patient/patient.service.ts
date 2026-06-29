/**
 * @file src/modules/patient/patient.service.ts
 * @description Business logic for patient profile and stats.
 */

import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';

/**
 * Fetch the patient profile for a given userId.
 * Used to get profileId and fullName after login.
 */
export async function getPatientProfile(userId: string) {
  const patient = await prisma.patient.findUnique({
    where: { userId },
    select: {
      id:               true,
      fullName:         true,
      dateOfBirth:      true,
      emergencyContact: true,
      address:          true,
      createdAt:        true,
    },
  });

  if (!patient) {
    throw new AppError('Patient profile not found', 404, 'PATIENT_NOT_FOUND');
  }

  return patient;
}

/**
 * Returns counts for the patient dashboard quick-stats card.
 * Uses the composite index (patientId, status) for each count.
 */
export async function getPatientStats(patientId: string) {
  const [total, pending, completed] = await Promise.all([
    prisma.consultation.count({ where: { patientId } }),
    prisma.consultation.count({ where: { patientId, status: 'PENDING' } }),
    prisma.consultation.count({ where: { patientId, status: 'COMPLETED' } }),
  ]);

  return { total, pending, completed };
}

/**
 * Returns upcoming consultations (PENDING or ACCEPTED, scheduledAt in the future).
 * Limited to 5 — shown in the dashboard "upcoming" card.
 */
export async function getUpcomingConsultations(patientId: string) {
  return prisma.consultation.findMany({
    where: {
      patientId,
      status: { in: ['PENDING', 'ACCEPTED'] },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 5,
    select: {
      id:          true,
      status:      true,
      symptoms:    true,
      scheduledAt: true,
      createdAt:   true,
      doctor: {
        select: {
          id:             true,
          fullName:       true,
          specialisation: true,
        },
      },
    },
  });
}
