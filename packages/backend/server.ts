/**
 * @file server.ts
 * @description HTTP server entry point.
 * CHANGE from Step 1: attaches the Socket.io instance to app.io
 * so controllers can emit events without circular imports.
 */

import './src/config/env';

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './src/app';
import { env } from './src/config/env';
import { logger } from './src/config/logger';
import { disconnectDatabase } from './src/config/database';
import { registerSignallingHandlers } from './src/modules/video/signalling';

const app        = createApp();
const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin:      env.FRONTEND_URL,
    credentials: true,
    methods:     ['GET', 'POST'],
  },
  transports:   ['websocket', 'polling'],
  pingTimeout:  60000,
  pingInterval: 25000,
});

// ── ATTACH io to Express app so controllers can reach it ──────────────────
// Access in controllers via: (req.app as any).io
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(app as any).io = io;

registerSignallingHandlers(io);

httpServer.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT}`, {
    env:  env.NODE_ENV,
    port: env.PORT,
  });
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  httpServer.close(async () => {
    logger.info('HTTP server closed');
    io.close(() => logger.info('Socket.io server closed'));
    await disconnectDatabase();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 30_000);
}

process.on('SIGTERM', () => { shutdown('SIGTERM').catch(console.error); });
process.on('SIGINT',  () => { shutdown('SIGINT').catch(console.error); });

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

export { io };
