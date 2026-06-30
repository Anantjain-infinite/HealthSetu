/**
 * @file src/modules/emergency/emergency.routes.ts
 * sosLimiter: 1 req / 60 sec per userId (spec 4.6)
 */

import { Router } from 'express';
import * as emergencyController from './emergency.controller';
import { verifyToken, requireRole } from '../auth/auth.middleware';
import { sosLimiter } from '../../config/rateLimit';

export const emergencyRouter = Router();

emergencyRouter.use(verifyToken, requireRole('PATIENT'));

emergencyRouter.post('/sos',  sosLimiter, emergencyController.sos);
emergencyRouter.get('/logs',              emergencyController.getLogs);
