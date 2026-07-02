/**
 * @file src/modules/consultation/consultation.service.ts
 * @description All consultation business logic:
 *   - create (patient)
 *   - getQueue with cursor pagination (doctor)
 *   - accept (doctor)
 *   - getDetails (patient or doctor)
 *   - addNotes + complete (doctor)
 *   - getHistory with offset pagination (patient)
 *
 * Socket.io instance is passed in where needed so the service
 * can emit real-time events without importing `io` at module level
 * (avoids circular dependency with server.ts).
 */

import type { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { createLogger } from '../../config/logger';
import {
  parseCursorParams,
  buildCursorResult,
  parseOffsetParams,
  getSkip,
  buildOffsetResult,
} from '../../shared/utils/paginate';
import type { CreateConsultationInput, AddNotesInput } from './consultation.schema';

const log = createLogger('consultation.service');

// ── Shared select shape for list views ────────────────────────────────────

const listSelect = {
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
  patient: {
    select: {
      id:       true,
      fullName: true,
    },
  },
} as const;

// ── Create ─────────────────────────────────────────────────────────────────

export async function createConsultation(
  patientUserId: string,
  input: CreateConsultationInput,
  io: SocketIOServer
) {
  // Verify doctor exists and is available
  const doctor = await prisma.doctor.findUnique({
    where: { id: input.doctorId },
    select: { id: true, isAvailable: true, userId: true },
  });

  if (!doctor) {
    throw new AppError('Doctor not found', 404, 'DOCTOR_NOT_FOUND');
  }
  if (!doctor.isAvailable) {
    throw new AppError('This doctor is currently unavailable', 409, 'DOCTOR_UNAVAILABLE');
  }

  // Get patient profile
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
    select: { id: true, fullName: true },
  });
  if (!patient) {
    throw new AppError('Patient profile not found', 404, 'PATIENT_NOT_FOUND');
  }

  const consultation = await prisma.consultation.create({
    data: {
      patientId:   patient.id,
      doctorId:    input.doctorId,
      symptoms:    input.symptoms,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      status:      'PENDING',
    },
    select: listSelect,
  });

  // Notify doctor in real-time
  io.to(`user:${doctor.userId}`).emit('notification:new_consultation', {
    consultationId: consultation.id,
    patientName:    patient.fullName,
    symptoms:       input.symptoms,
  });

  log.info('Consultation created', { consultationId: consultation.id });
  return consultation;
}

// ── Get queue (doctor, cursor-paginated) ──────────────────────────────────

export async function getDoctorQueue(
  doctorUserId: string,
  query: { cursor?: unknown; limit?: unknown; status?: unknown }
) {
  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUserId },
    select: { id: true },
  });
  if (!doctor) throw new AppError('Doctor profile not found', 404, 'DOCTOR_NOT_FOUND');

  const { cursor, limit } = parseCursorParams(query);

  const status =
    typeof query.status === 'string' &&
    ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(query.status)
      ? (query.status as 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED')
      : 'PENDING';

  const rows = await prisma.consultation.findMany({
    where: {
      doctorId: doctor.id,
      status,
    },
    orderBy: { createdAt: 'asc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: listSelect,
  });

  return buildCursorResult(rows, limit);
}

// ── Accept (doctor) ────────────────────────────────────────────────────────

export async function acceptConsultation(
  doctorUserId: string,
  consultationId: string,
  io: SocketIOServer
) {
  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUserId },
    select: { id: true },
  });
  if (!doctor) throw new AppError('Doctor profile not found', 404, 'DOCTOR_NOT_FOUND');

  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: { id: true, doctorId: true, status: true, patient: { select: { userId: true } } },
  });

  if (!consultation) throw new AppError('Consultation not found', 404, 'NOT_FOUND');
  if (consultation.doctorId !== doctor.id) throw new AppError('Forbidden', 403, 'FORBIDDEN');
  if (consultation.status !== 'PENDING') {
    throw new AppError(`Cannot accept a consultation with status ${consultation.status}`, 409, 'INVALID_STATUS');
  }

  const updated = await prisma.consultation.update({
    where: { id: consultationId },
    data:  { status: 'ACCEPTED' },
    select: listSelect,
  });

  // Notify patient
  io.to(`user:${consultation.patient.userId}`).emit('consultation:accepted', {
    consultationId,
  });

  return updated;
}

// ── Get details (patient or doctor) ───────────────────────────────────────

export async function getConsultationDetails(userId: string, role: string, consultationId: string) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: {
      id:          true,
      status:      true,
      symptoms:    true,
      notes:       true,
      scheduledAt: true,
      startedAt:   true,
      endedAt:     true,
      createdAt:   true,
      patient: {
        select: {
          id:       true,
          fullName: true,
          userId:   true,
        },
      },
      doctor: {
        select: {
          id:             true,
          fullName:       true,
          specialisation: true,
          userId:         true,
        },
      },
      prescriptions: {
        select: {
          id:       true,
          fileKey:  true,
          issuedAt: true,
        },
      },
      transcript: {
        select: {
          id:          true,
          contentJson: true,
        },
      },
    },
  });

  if (!consultation) throw new AppError('Consultation not found', 404, 'NOT_FOUND');

  // Verify ownership
  const isPatient = role === 'PATIENT' && consultation.patient.userId === userId;
  const isDoctor  = role === 'DOCTOR'  && consultation.doctor.userId  === userId;
  if (!isPatient && !isDoctor) throw new AppError('Forbidden', 403, 'FORBIDDEN');

  return consultation;
}

// ── Add notes + complete (doctor) ─────────────────────────────────────────

export async function addNotes(
  doctorUserId: string,
  consultationId: string,
  input: AddNotesInput,
  io: SocketIOServer
) {
  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUserId },
    select: { id: true },
  });
  if (!doctor) throw new AppError('Doctor profile not found', 404, 'DOCTOR_NOT_FOUND');

  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: {
      id:       true,
      doctorId: true,
      status:   true,
      patient:  { select: { userId: true } },
    },
  });

  if (!consultation) throw new AppError('Consultation not found', 404, 'NOT_FOUND');
  if (consultation.doctorId !== doctor.id) throw new AppError('Forbidden', 403, 'FORBIDDEN');

  const newStatus =
    consultation.status === 'IN_PROGRESS' ? 'COMPLETED' : consultation.status;

  const updated = await prisma.consultation.update({
    where: { id: consultationId },
    data: {
      notes:   input.notes,
      status:  newStatus,
      endedAt: newStatus === 'COMPLETED' ? new Date() : undefined,
    },
    select: listSelect,
  });

  if (newStatus === 'COMPLETED') {
    io.to(`user:${consultation.patient.userId}`).emit('consultation:completed', {
      consultationId,
    });
  }

  return updated;
}

// ── History (patient, offset-paginated) ──────────────────────────────────

export async function getPatientHistory(
  patientUserId: string,
  query: { page?: unknown; limit?: unknown }
) {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
    select: { id: true },
  });
  if (!patient) throw new AppError('Patient profile not found', 404, 'PATIENT_NOT_FOUND');

  const params = parseOffsetParams(query);
  const skip   = getSkip(params);

  const [rows, total] = await Promise.all([
    prisma.consultation.findMany({
      where:   { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: params.limit,
      select: {
        ...listSelect,
        notes:     true,
        startedAt: true,
        endedAt:   true,
        prescriptions: {
          select: { id: true, fileKey: true, issuedAt: true },
          orderBy: { issuedAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.consultation.count({ where: { patientId: patient.id } }),
  ]);

  return buildOffsetResult(rows, total, params);
}

// ── Doctor's view of a specific patient's history ─────────────────────────
// Used by PatientHistory.tsx — shows only consultations between THIS doctor
// and THIS patient (doctors must not see a patient's history with other
// doctors — that would be a privacy violation).

export async function getPatientHistoryForDoctor(
  doctorUserId: string,
  patientId: string,
  query: { page?: unknown; limit?: unknown }
) {
  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUserId },
    select: { id: true },
  });
  if (!doctor) throw new AppError('Doctor profile not found', 404, 'DOCTOR_NOT_FOUND');

  // Confirm the patient exists (404 if not, rather than silently returning empty)
  const patientExists = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, fullName: true },
  });
  if (!patientExists) throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');

  const params = parseOffsetParams(query);
  const skip   = getSkip(params);

  const [rows, total] = await Promise.all([
    prisma.consultation.findMany({
      where:   { doctorId: doctor.id, patientId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: params.limit,
      select: {
        id:          true,
        status:      true,
        symptoms:    true,
        notes:       true,
        scheduledAt: true,
        startedAt:   true,
        endedAt:     true,
        createdAt:   true,
        prescriptions: {
          select: { id: true, fileKey: true, issuedAt: true },
          orderBy: { issuedAt: 'desc' },
        },
      },
    }),
    prisma.consultation.count({ where: { doctorId: doctor.id, patientId } }),
  ]);

  return {
    patient: { id: patientExists.id, fullName: patientExists.fullName },
    ...buildOffsetResult(rows, total, params),
  };
}
