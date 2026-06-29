/**
 * @file src/modules/doctor/doctor.controller.ts
 */

import type { Request, Response } from 'express';
import * as doctorService from './doctor.service';
import { asyncHandler } from '../../shared/utils/asyncHandler';

/** GET /api/v1/doctors?search=<query> — available doctor search (public-ish, used by patients) */
export const searchDoctors = asyncHandler(async (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
  const doctors = await doctorService.searchDoctors(search);
  res.json(doctors);
});

/** GET /api/v1/doctors/me — doctor's own profile */
export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await doctorService.getDoctorProfileByUserId(req.user!.userId);
  res.json(profile);
});
