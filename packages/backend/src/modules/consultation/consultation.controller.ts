/**
 * @file src/modules/consultation/consultation.controller.ts
 * @description HTTP layer for consultation endpoints.
 * Passes the Socket.io instance (attached to req.app by server.ts) to services.
 */

import type { Request, Response } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import * as consultationService from './consultation.service';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import type { CreateConsultationInput, AddNotesInput } from './consultation.schema';

// Helper to get the io instance from the Express app
function getIo(req: Request): SocketIOServer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req.app as any).io as SocketIOServer;
}

/** POST /api/v1/consultations — create (PATIENT) */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const consultation = await consultationService.createConsultation(
    req.user!.userId,
    req.body as CreateConsultationInput,
    getIo(req)
  );
  res.status(201).json(consultation);
});

/** GET /api/v1/consultations — doctor queue (DOCTOR) */
export const getQueue = asyncHandler(async (req: Request, res: Response) => {
  const result = await consultationService.getDoctorQueue(req.user!.userId, req.query);
  res.json(result);
});

/** GET /api/v1/consultations/history — patient history (PATIENT) */
export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const result = await consultationService.getPatientHistory(req.user!.userId, req.query);
  res.json(result);
});

/** GET /api/v1/consultations/:id — details (PATIENT or DOCTOR) */
export const getDetails = asyncHandler(async (req: Request, res: Response) => {
  const consultation = await consultationService.getConsultationDetails(
    req.user!.userId,
    req.user!.role,
    req.params.id
  );
  res.json(consultation);
});

/** PATCH /api/v1/consultations/:id/accept — accept (DOCTOR) */
export const accept = asyncHandler(async (req: Request, res: Response) => {
  const consultation = await consultationService.acceptConsultation(
    req.user!.userId,
    req.params.id,
    getIo(req)
  );
  res.json(consultation);
});

/** PATCH /api/v1/consultations/:id/notes — add notes (DOCTOR) */
export const addNotes = asyncHandler(async (req: Request, res: Response) => {
  const consultation = await consultationService.addNotes(
    req.user!.userId,
    req.params.id,
    req.body as AddNotesInput,
    getIo(req)
  );
  res.json(consultation);
});
