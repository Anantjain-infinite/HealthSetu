/**
 * @file src/modules/healthRecord/healthRecord.controller.ts
 * Multer is used for multipart/form-data file parsing.
 * Max 5 MB, PDF only.
 */

import type { Request, Response } from 'express';
import multer from 'multer';
import * as healthRecordService from './healthRecord.service';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { AppError } from '../../shared/errors/AppError';

// ── Multer setup: memory storage (buffer passed to S3) ───────────────────

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE'));
    }
  },
}).single('prescription');

/** POST /api/v1/prescriptions/:consultationId — upload (DOCTOR) */
export const upload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400, 'NO_FILE');
  }

  const result = await healthRecordService.uploadPrescription(
    req.user!.userId,
    req.params.consultationId,
    req.file.buffer,
    req.file.mimetype
  );

  res.status(201).json(result);
});

/** GET /api/v1/prescriptions/:id/download — download URL (PATIENT) */
export const download = asyncHandler(async (req: Request, res: Response) => {
  const result = await healthRecordService.downloadPrescription(
    req.user!.userId,
    req.params.id
  );
  res.json(result);
});

/** GET /api/v1/prescriptions — list (PATIENT) */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await healthRecordService.listPrescriptions(req.user!.userId, req.query);
  res.json(result);
});
