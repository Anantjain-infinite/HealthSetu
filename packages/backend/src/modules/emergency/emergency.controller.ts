/**
 * @file src/modules/emergency/emergency.controller.ts
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import * as emergencyService from './emergency.service';
import { asyncHandler } from '../../shared/utils/asyncHandler';

const sosBodySchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

/** POST /api/v1/emergency/sos */
export const sos = asyncHandler(async (req: Request, res: Response) => {
  const parsed = sosBodySchema.safeParse(req.body);
  const lat = parsed.success ? parsed.data.lat : undefined;
  const lng = parsed.success ? parsed.data.lng : undefined;

  const result = await emergencyService.triggerSOS(req.user!.userId, lat, lng);
  // Always 200 — spec says return 200 even when SMS fails
  res.status(200).json(result);
});

/** GET /api/v1/emergency/logs */
export const getLogs = asyncHandler(async (req: Request, res: Response) => {
  const result = await emergencyService.getEmergencyLogs(req.user!.userId, req.query);
  res.json(result);
});
