/**
 * @file src/app.ts
 * @description Express application factory. Configures all middleware, security
 * headers, CORS, routes, and the global error handler.
 *
 * The HTTP server and Socket.io are created in server.ts — this file only
 * exports the Express `app` object so it can be shared with Socket.io.
 */

import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { generalLimiter } from './config/rateLimit';
import { requestLogger } from './shared/middleware/requestLogger';
import { errorHandler } from './shared/errors/errorHandler';

// ── Route imports ─────────────────────────────────────────────────────────
import { authRouter }         from './modules/auth/auth.routes';
import { patientRouter }      from './modules/patient/patient.routes';
import { doctorRouter }       from './modules/doctor/doctor.routes';
import { consultationRouter } from './modules/consultation/consultation.routes';
import { emergencyRouter }    from './modules/emergency/emergency.routes';
import { healthRecordRouter } from './modules/healthRecord/healthRecord.routes';

/**
 * Creates and configures the Express application.
 * @returns Configured Express Application instance
 */
export function createApp(): Application {
  const app = express();

  // ── 1. Security headers (Helmet + custom CSP) ───────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc:    ["'self'"],
          scriptSrc:     ["'self'"],
          styleSrc:      ["'self'", "'unsafe-inline'"], // Required for Tailwind inline styles
          mediaSrc:      ["'self'", 'blob:'],           // Required for WebRTC video streams
          connectSrc:    ["'self'", env.FRONTEND_URL],
          frameAncestors:["'none'"],
          imgSrc:        ["'self'", 'data:', 'blob:'],
        },
      },
      // HSTS — tells browsers to only connect over HTTPS for 1 year
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
    })
  );

  // ── 2. CORS — only allow requests from the configured frontend origin ─
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true, // Allow cookies (refresh token HTTP-only cookie)
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ── 3. Body parsing — reject oversized bodies early ──────────────────
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ── 4. Cookie parser (for reading HTTP-only refresh token cookie) ─────
  app.use(cookieParser());

  // ── 5. Per-request structured logging ────────────────────────────────
  app.use(requestLogger);

  // ── 6. Global rate limiter (baseline — 500 req / 15 min per IP) ──────
  app.use('/api', generalLimiter);

  // ── 7. Health check (no auth, no rate limit — used by Docker healthcheck)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── 8. API routes ─────────────────────────────────────────────────────
  app.use('/api/v1/auth',          authRouter);
  app.use('/api/v1/patients',      patientRouter);
  app.use('/api/v1/doctors',       doctorRouter);
  app.use('/api/v1/consultations', consultationRouter);
  app.use('/api/v1/emergency',     emergencyRouter);
  app.use('/api/v1/prescriptions', healthRecordRouter);

  // ── 9. 404 handler for unknown routes ────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // ── 10. Global error handler (must be LAST) ───────────────────────────
  app.use(errorHandler);

  return app;
}
