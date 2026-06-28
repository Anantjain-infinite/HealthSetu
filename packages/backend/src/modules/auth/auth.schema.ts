/**
 * @file src/modules/auth/auth.schema.ts
 * @description Zod validation schemas for all auth endpoints.
 *
 * Schemas are exported individually and used by validateRequest() middleware
 * before any controller logic runs. Invalid input never reaches the database.
 */

import { z } from 'zod';

// ── Reusable field validators ──────────────────────────────────────────────

const emailField = z
  .string({ required_error: 'Email is required' })
  .email('Must be a valid email address')
  .toLowerCase()
  .trim();

const passwordField = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters') // bcrypt max input length
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

const fullNameField = z
  .string({ required_error: 'Full name is required' })
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters')
  .trim();

const phoneField = z
  .string({ required_error: 'Phone number is required' })
  .regex(/^\+?[1-9]\d{7,14}$/, 'Must be a valid phone number (e.g. +919876543210)');

// ── Patient profile fields ─────────────────────────────────────────────────

const patientProfileSchema = z.object({
  fullName: fullNameField,
  dateOfBirth: z
    .string({ required_error: 'Date of birth is required' })
    .date('Must be a valid date in YYYY-MM-DD format')
    .refine((d) => new Date(d) < new Date(), 'Date of birth must be in the past'),
  emergencyContact: phoneField,
  address: z
    .string({ required_error: 'Address is required' })
    .min(10, 'Address must be at least 10 characters')
    .max(300, 'Address must be at most 300 characters')
    .trim(),
});

// ── Doctor profile fields ──────────────────────────────────────────────────

const doctorProfileSchema = z.object({
  fullName: fullNameField,
  specialisation: z
    .string({ required_error: 'Specialisation is required' })
    .min(2, 'Specialisation must be at least 2 characters')
    .max(100, 'Specialisation must be at most 100 characters')
    .trim(),
  licenceNo: z
    .string({ required_error: 'Licence number is required' })
    .min(5, 'Licence number must be at least 5 characters')
    .max(50, 'Licence number must be at most 50 characters')
    .trim()
    .toUpperCase(),
});

// ── Register schema (discriminated union on role) ──────────────────────────

export const registerSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('PATIENT'),
    email: emailField,
    password: passwordField,
  }).merge(patientProfileSchema),
  z.object({
    role: z.literal('DOCTOR'),
    email: emailField,
    password: passwordField,
  }).merge(doctorProfileSchema),
]);

export type RegisterInput = z.infer<typeof registerSchema>;

// ── Login schema ───────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
