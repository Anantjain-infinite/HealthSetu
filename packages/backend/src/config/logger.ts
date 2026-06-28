/**
 * @file src/config/logger.ts
 * @description Winston structured JSON logger with two transports:
 *   1. Console (colorised in dev, plain JSON in production)
 *   2. Daily rotating file — logs/app.log (max 10 MB, keep 14 days)
 *
 * IMPORTANT: Never log request/response bodies, JWT values, GPS coordinates,
 * or patient medical notes (HIPAA / data privacy).
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { env } from './env';

// ── Log levels ─────────────────────────────────────────────────────────────
// error > warn > info > http > debug
const LOG_LEVEL = env.isProduction ? 'info' : 'debug';

// ── Custom format ──────────────────────────────────────────────────────────
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
  })
);

// ── Transports ─────────────────────────────────────────────────────────────

/** Console transport — colorised in dev, JSON in production */
const consoleTransport = new winston.transports.Console({
  format: env.isProduction ? jsonFormat : devFormat,
});

/** Rotating file transport — 10 MB max per file, 14 days retention */
const fileTransport = new DailyRotateFile({
  dirname: path.join(process.cwd(), 'logs'),
  filename: 'app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '10m',
  maxFiles: '14d',
  format: jsonFormat,
  zippedArchive: true,
});

fileTransport.on('error', (error) => {
  console.error('Winston file transport error:', error);
});

// ── Logger instance ────────────────────────────────────────────────────────
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'telemedicine-api' },
  transports: [consoleTransport, fileTransport],
  // Do not exit on uncaught exceptions — let the process manager handle it
  exitOnError: false,
});

/**
 * Convenience child loggers scoped to each module.
 * Usage: const log = logger.child({ module: 'auth' });
 */
export const createLogger = (module: string) =>
  logger.child({ module });
