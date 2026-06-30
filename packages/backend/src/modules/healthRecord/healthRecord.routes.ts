/**
 * @file src/modules/healthRecord/healthRecord.routes.ts
 */

import { Router } from 'express';
import * as healthRecordController from './healthRecord.controller';
import { verifyToken, requireRole } from '../auth/auth.middleware';

export const healthRecordRouter = Router();

healthRecordRouter.use(verifyToken);

// IMPORTANT: /download must be before /:id to avoid route collision
healthRecordRouter.get(
  '/:id/download',
  requireRole('PATIENT'),
  healthRecordController.download
);

healthRecordRouter.get(
  '/',
  requireRole('PATIENT'),
  healthRecordController.list
);

healthRecordRouter.post(
  '/:consultationId',
  requireRole('DOCTOR'),
  healthRecordController.uploadMiddleware,
  healthRecordController.upload
);
