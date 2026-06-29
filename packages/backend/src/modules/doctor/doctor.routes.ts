/**
 * @file src/modules/doctor/doctor.routes.ts
 */

import { Router } from 'express';
import * as doctorController from './doctor.controller';
import { verifyToken, requireRole } from '../auth/auth.middleware';

export const doctorRouter = Router();

// Search is accessible to authenticated patients (for SymptomForm)
doctorRouter.get('/', verifyToken, requireRole('PATIENT', 'DOCTOR'), doctorController.searchDoctors);

// Doctor's own profile
doctorRouter.get('/me', verifyToken, requireRole('DOCTOR'), doctorController.getMyProfile);
