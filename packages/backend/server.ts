/**
 * @file server.ts
 * @description HTTP server entry point for the HealthSetu backend.
 *
 * Responsibilities:
 *   - Import env first (validates env vars, exits on misconfiguration)
 *   - Create the Express app
 *   - Wrap it in a Node.js http.Server
 *   - Attach Socket.io to the server
 *   - Start listening on the configured PORT
 *   - Handle graceful shutdown on SIGTERM / SIGINT
 */

// Import env FIRST — crashes process if any variable is missing
import './src/config/env';

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './src/app';
import { env } from './src/config/env';
import { logger } from './src/config/logger';
import { disconnectDatabase } from './src/config/database';
import { registerSignallingHandlers } from './src/modules/video/signalling';

// ── Create Express app ────────────────────────────────────────────────────
const app = createApp();

// ── Wrap in HTTP server ───────────────────────────────────────────────────
const httpServer = http.createServer(app);

// ── Attach Socket.io ──────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  // Use WebSocket transport first; fall back to long-polling for restricted networks
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Register WebRTC signalling and in-call chat Socket.io handlers
registerSignallingHandlers(io);

// ── Start listening ───────────────────────────────────────────────────────
httpServer.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT}`, {
    env: env.NODE_ENV,
    port: env.PORT,
  });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(async () => {
    logger.info('HTTP server closed');

    // Disconnect all Socket.io clients cleanly
    io.close(() => {
      logger.info('Socket.io server closed');
    });

    // Disconnect Prisma from the database
    await disconnectDatabase();

    logger.info('Graceful shutdown complete');
    process.exit(0);
  });

  // Force exit after 30 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 30_000);
}

process.on('SIGTERM', () => { shutdown('SIGTERM').catch(console.error); });
process.on('SIGINT',  () => { shutdown('SIGINT').catch(console.error); });

// Log unhandled promise rejections — do NOT exit (pm2 will restart)
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack:  reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

export { io };
