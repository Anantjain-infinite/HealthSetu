/**
 * @file src/config/database.ts
 * @description Prisma client singleton.
 *
 * Stores a single PrismaClient instance on globalThis so hot-reloads in
 * development reuse it rather than opening a new connection pool each time.
 * In production a single instance is always used.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createLogger } from './logger';

const log = createLogger('database');

// Dynamically require so this file compiles before `prisma generate` is run
// (Prisma generates its types at runtime, not at install time)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
type PrismaClientType = InstanceType<typeof PrismaClient>;

// ── Singleton via globalThis ───────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClientType | undefined;
}

function createPrismaClient(): PrismaClientType {
  const client: PrismaClientType = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn',  emit: 'event' },
    ],
  });

  // Log slow queries (>2 s) without logging params (may contain PHI)
  client.$on('query', (e: any) => {
    if (e.duration > 2000) {
      log.warn('Slow database query detected', { duration: `${e.duration}ms` });
    }
  });

  client.$on('error', (e: any) => {
    log.error('Prisma client error', { message: e.message });
  });

  client.$on('warn', (e: any) => {
    log.warn('Prisma client warning', { message: e.message });
  });

  return client;
}

/**
 * Application-wide Prisma client.
 * Import this in all services — never create a new PrismaClient() directly.
 */
export const prisma: PrismaClientType =
  globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

/**
 * Gracefully disconnect Prisma on process shutdown.
 * Called from the SIGTERM / SIGINT handlers in server.ts.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  log.info('Database connection closed');
}
