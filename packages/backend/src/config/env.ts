/**
 * @file src/config/env.ts
 * @description Validates all required environment variables at application startup
 * using Zod. If any variable is missing or malformed, the process exits immediately
 * with a descriptive error — prevents silent misconfiguration in production.
 */

import dotenv from 'dotenv';
dotenv.config();   // <-- THIS loads your .env file into process.env

import { z } from 'zod';

const envSchema = z.object({
  // ── Server ──────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').default('5000'),

  // ── Database ─────────────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid PostgreSQL connection string')
    .startsWith('postgresql://', 'DATABASE_URL must start with postgresql://'),

  // ── JWT ──────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  // ── Twilio ───────────────────────────────────────────────────────────
  TWILIO_ACCOUNT_SID: z
    .string()
    .startsWith('AC', 'TWILIO_ACCOUNT_SID must start with AC'),
  TWILIO_AUTH_TOKEN: z.string().min(32, 'TWILIO_AUTH_TOKEN appears too short'),
  TWILIO_FROM_NUMBER: z
    .string()
    .startsWith('+', 'TWILIO_FROM_NUMBER must be in E.164 format (+XXXXXXXXXXX)'),

  // ── AWS S3 ───────────────────────────────────────────────────────────
  AWS_ACCESS_KEY_ID: z
    .string()
    .startsWith('AKIA', 'AWS_ACCESS_KEY_ID must start with AKIA'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_BUCKET_NAME: z.string().min(1, 'AWS_BUCKET_NAME is required'),
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),

  // ── CORS ─────────────────────────────────────────────────────────────
  FRONTEND_URL: z
    .string()
    .url('FRONTEND_URL must be a valid URL (e.g. http://localhost:5173)'),

  // ── TURN Server (optional — required for production WebRTC) ──────────
  TURN_URL: z.string().optional(),
  TURN_USERNAME: z.string().optional(),
  TURN_CREDENTIAL: z.string().optional(),
});

// Parse process.env and exit on failure
const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('\n❌  Invalid environment variables:\n');
  _parsed.error.issues.forEach((issue) => {
    console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
  });
  console.error(
    '\nFix the above variables in your .env file then restart.\n'
  );
  process.exit(1);
}

/**
 * Fully type-safe, validated environment variables.
 * Import this object everywhere instead of using process.env directly.
 */
export const env = {
  ..._parsed.data,
  PORT: parseInt(_parsed.data.PORT, 10),
  isProduction: _parsed.data.NODE_ENV === 'production',
  isDevelopment: _parsed.data.NODE_ENV === 'development',
} as const;

export type Env = typeof env;