/**
 * @file src/modules/patient/patient.routes.ts
 * All routes require Role.PATIENT.
 */

import { Router } from 'express';
import * as patientController from './patient.controller';
import { verifyToken } from '../auth/auth.middleware';
import { requireRole } from '../auth/auth.middleware';

export const patientRouter = Router();

patientRouter.use(verifyToken, requireRole('PATIENT'));

patientRouter.get('/me',          patientController.getMyProfile);
patientRouter.get('/me/stats',    patientController.getMyStats);
patientRouter.get('/me/upcoming', patientController.getUpcoming);
