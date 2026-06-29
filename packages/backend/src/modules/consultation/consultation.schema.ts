/**
 * @file src/modules/consultation/consultation.schema.ts
 */

import { z } from 'zod';

export const createConsultationSchema = z.object({
  doctorId:    z.string().uuid('doctorId must be a valid UUID'),
  symptoms:    z.string().min(20, 'Please describe your symptoms in at least 20 characters').max(2000),
  scheduledAt: z.string().datetime({ message: 'scheduledAt must be an ISO 8601 datetime' }).optional(),
});

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;

export const addNotesSchema = z.object({
  notes: z.string().min(50, 'Notes must be at least 50 characters').max(10000),
});

export type AddNotesInput = z.infer<typeof addNotesSchema>;
