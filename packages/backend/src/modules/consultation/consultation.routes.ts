/**
 * @file src/modules/consultation/consultation.routes.ts
 */

import { Router } from 'express';
import * as consultationController from './consultation.controller';
import { verifyToken, requireRole } from '../auth/auth.middleware';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { createConsultationSchema, addNotesSchema } from './consultation.schema';

export const consultationRouter = Router();

consultationRouter.use(verifyToken);

// IMPORTANT: /history must be defined BEFORE /:id to avoid being matched as an id
consultationRouter.get('/history', requireRole('PATIENT'), consultationController.getHistory);

// Doctor views a specific patient's consultation history with them
consultationRouter.get('/patient/:patientId', requireRole('DOCTOR'), consultationController.getPatientHistoryForDoctor);

consultationRouter.post(
  '/',
  requireRole('PATIENT'),
  validateRequest(createConsultationSchema),
  consultationController.create
);

consultationRouter.get('/', requireRole('DOCTOR'), consultationController.getQueue);

consultationRouter.get('/:id', requireRole('PATIENT', 'DOCTOR'), consultationController.getDetails);

consultationRouter.patch(
  '/:id/accept',
  requireRole('DOCTOR'),
  consultationController.accept
);

consultationRouter.patch(
  '/:id/notes',
  requireRole('DOCTOR'),
  validateRequest(addNotesSchema),
  consultationController.addNotes
);
