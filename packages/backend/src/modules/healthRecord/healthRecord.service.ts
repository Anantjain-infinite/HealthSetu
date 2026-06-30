/**
 * @file src/modules/healthRecord/healthRecord.service.ts
 * @description Prescription PDF management via AWS S3.
 *
 * Spec 4.7:
 *   - upload: multipart PDF → S3 key prescriptions/{patientId}/{consultationId}.pdf
 *   - download: generate fresh 15-min pre-signed GET URL
 *   - list: paginated prescriptions for patient, newest first
 *
 * S3 keys (not full URLs) are stored in the DB.
 * Pre-signed URLs are generated on demand and never stored.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';
import { createLogger } from '../../config/logger';
import {
  parseOffsetParams,
  getSkip,
  buildOffsetResult,
} from '../../shared/utils/paginate';

const log = createLogger('healthRecord.service');

// ── S3 client singleton ────────────────────────────────────────────────────

const s3 = new S3Client({
  region:      env.AWS_REGION,
  credentials: {
    accessKeyId:     env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const PRESIGNED_URL_EXPIRY_SECONDS = 15 * 60; // 15 minutes

// ── Helpers ────────────────────────────────────────────────────────────────

function buildS3Key(patientId: string, consultationId: string): string {
  return `prescriptions/${patientId}/${consultationId}.pdf`;
}

async function generateDownloadUrl(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key:    fileKey,
  });
  return getSignedUrl(s3, command, { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS });
}

// ── Upload ─────────────────────────────────────────────────────────────────

export async function uploadPrescription(
  doctorUserId: string,
  consultationId: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ prescriptionId: string; downloadUrl: string }> {
  // Verify file is a PDF
  if (mimeType !== 'application/pdf') {
    throw new AppError('Only PDF files are accepted', 400, 'INVALID_FILE_TYPE');
  }

  // Verify the consultation belongs to this doctor and is COMPLETED
  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUserId },
    select: { id: true },
  });
  if (!doctor) throw new AppError('Doctor profile not found', 404, 'DOCTOR_NOT_FOUND');

  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: { id: true, doctorId: true, patientId: true, status: true },
  });
  if (!consultation) throw new AppError('Consultation not found', 404, 'NOT_FOUND');
  if (consultation.doctorId !== doctor.id) throw new AppError('Forbidden', 403, 'FORBIDDEN');
  if (consultation.status !== 'COMPLETED') {
    throw new AppError(
      'Prescriptions can only be uploaded for completed consultations',
      409,
      'INVALID_STATUS'
    );
  }

  const fileKey = buildS3Key(consultation.patientId, consultationId);

  // Upload to S3
  await s3.send(
    new PutObjectCommand({
      Bucket:      env.AWS_BUCKET_NAME,
      Key:         fileKey,
      Body:        fileBuffer,
      ContentType: 'application/pdf',
      // Server-side encryption
      ServerSideEncryption: 'AES256',
    })
  );

  log.info('Prescription uploaded to S3', { consultationId });

  // Store S3 key in DB (not the URL)
  const prescription = await prisma.prescription.create({
    data: {
      consultationId,
      patientId: consultation.patientId,
      doctorId:  doctor.id,
      fileKey,
    },
    select: { id: true, fileKey: true },
  });

  const downloadUrl = await generateDownloadUrl(prescription.fileKey);

  return { prescriptionId: prescription.id, downloadUrl };
}

// ── Download ───────────────────────────────────────────────────────────────

export async function downloadPrescription(
  patientUserId: string,
  prescriptionId: string
): Promise<{ downloadUrl: string }> {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
    select: { id: true },
  });
  if (!patient) throw new AppError('Patient profile not found', 404, 'PATIENT_NOT_FOUND');

  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    select: { id: true, patientId: true, fileKey: true },
  });
  if (!prescription) throw new AppError('Prescription not found', 404, 'NOT_FOUND');
  if (prescription.patientId !== patient.id) throw new AppError('Forbidden', 403, 'FORBIDDEN');

  const downloadUrl = await generateDownloadUrl(prescription.fileKey);
  return { downloadUrl };
}

// ── List ───────────────────────────────────────────────────────────────────

export async function listPrescriptions(
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
    prisma.prescription.findMany({
      where:   { patientId: patient.id },
      orderBy: { issuedAt: 'desc' },
      skip,
      take: params.limit,
      select: {
        id:             true,
        consultationId: true,
        issuedAt:       true,
        doctor: { select: { fullName: true } },
      },
    }),
    prisma.prescription.count({ where: { patientId: patient.id } }),
  ]);

  return buildOffsetResult(rows, total, params);
}
