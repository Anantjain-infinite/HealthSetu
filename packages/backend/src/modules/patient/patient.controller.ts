/**
 * @file src/modules/patient/patient.controller.ts
 */

import type { Request, Response } from 'express';
import * as patientService from './patient.service';
import { asyncHandler } from '../../shared/utils/asyncHandler';

/** GET /api/v1/patients/me — returns patient profile for logged-in patient */
export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await patientService.getPatientProfile(req.user!.userId);
  res.json(profile);
});

/** GET /api/v1/patients/me/stats — dashboard quick stats */
export const getMyStats = asyncHandler(async (req: Request, res: Response) => {
  // First get patientId from userId
  const profile = await patientService.getPatientProfile(req.user!.userId);
  const stats = await patientService.getPatientStats(profile.id);
  res.json(stats);
});

/** GET /api/v1/patients/me/upcoming — upcoming consultations for dashboard */
export const getUpcoming = asyncHandler(async (req: Request, res: Response) => {
  const profile = await patientService.getPatientProfile(req.user!.userId);
  const consultations = await patientService.getUpcomingConsultations(profile.id);
  res.json(consultations);
});
