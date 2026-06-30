/**
 * @file src/modules/video/signalling.ts
 * @description Socket.io WebRTC signalling server + in-call chat.
 *
 * Spec 4.8 — two namespaces:
 *   /signal  — WebRTC offer/answer/ICE forwarding
 *   /chat    — in-call text messages
 *
 * Auth: JWT passed as socket.handshake.auth.token on connection.
 * Room name convention: `consultation:{consultationId}`
 *
 * Events handled on /signal:
 *   join-room      → socket.join, verify participant
 *   offer          → forward SDP offer to room (excluding sender)
 *   answer         → forward SDP answer
 *   ice-candidate  → forward ICE candidate
 *   leave-room     → leave + notify other participant
 *
 * Events on /chat:
 *   join-room      → join consultation room
 *   chat:message   → broadcast to room with { senderId, senderName, text, timestamp }
 */

import type { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { createLogger } from '../../config/logger';

const log = createLogger('signalling');

interface JwtPayload { userId: string; role: string; }

// ── JWT verification for socket connections ────────────────────────────────

function verifySocketToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer:   'health-setu',
      audience: 'health-setu-client',
    }) as JwtPayload;
  } catch {
    return null;
  }
}

// ── Verify the socket user is a participant in the consultation ────────────

async function verifyParticipant(
  consultationId: string,
  userId: string
): Promise<boolean> {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: {
      patient: { select: { userId: true } },
      doctor:  { select: { userId: true } },
    },
  });
  if (!consultation) return false;
  return (
    consultation.patient.userId === userId ||
    consultation.doctor.userId  === userId
  );
}

// ── Register all Socket.io handlers ───────────────────────────────────────

export function registerSignallingHandlers(io: SocketIOServer): void {
  // ── /signal namespace — WebRTC ─────────────────────────────────────────
  const signalNs = io.of('/signal');

  signalNs.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('Authentication token required'));
      return;
    }
    const payload = verifySocketToken(token);
    if (!payload) {
      next(new Error('Invalid or expired token'));
      return;
    }
    // Attach payload to socket data for use in event handlers
    socket.data.userId = payload.userId;
    socket.data.role   = payload.role;
    next();
  });

  signalNs.on('connection', (socket) => {
    const { userId } = socket.data as { userId: string; role: string };

    // Join user-specific room for direct notifications
    socket.join(`user:${userId}`);
    log.info('Signal socket connected', { userId, socketId: socket.id });

    // ── join-room ────────────────────────────────────────────────────────
    socket.on(
      'join-room',
      async ({ consultationId }: { consultationId: string }) => {
        const allowed = await verifyParticipant(consultationId, userId);
        if (!allowed) {
          socket.emit('error', { message: 'Not a participant in this consultation' });
          return;
        }
        const room = `consultation:${consultationId}`;
        await socket.join(room);
        socket.to(room).emit('peer-joined', { userId });
        log.info('User joined signal room', { userId, consultationId });
      }
    );

    // ── offer ────────────────────────────────────────────────────────────
    socket.on(
      'offer',
      ({ consultationId, sdp }: { consultationId: string; sdp: Record<string, unknown> }) => {
        socket.to(`consultation:${consultationId}`).emit('offer', { sdp, fromUserId: userId });
      }
    );

    // ── answer ───────────────────────────────────────────────────────────
    socket.on(
      'answer',
      ({ consultationId, sdp }: { consultationId: string; sdp: Record<string, unknown> }) => {
        socket.to(`consultation:${consultationId}`).emit('answer', { sdp, fromUserId: userId });
      }
    );

    // ── ice-candidate ────────────────────────────────────────────────────
    socket.on(
      'ice-candidate',
      ({ consultationId, candidate }: { consultationId: string; candidate: Record<string, unknown> }) => {
        socket
          .to(`consultation:${consultationId}`)
          .emit('ice-candidate', { candidate, fromUserId: userId });
      }
    );

    // ── leave-room ───────────────────────────────────────────────────────
    socket.on('leave-room', ({ consultationId }: { consultationId: string }) => {
      const room = `consultation:${consultationId}`;
      socket.to(room).emit('peer-left', { userId });
      socket.leave(room);
      log.info('User left signal room', { userId, consultationId });
    });

    socket.on('disconnect', (reason) => {
      log.info('Signal socket disconnected', { userId, reason });
    });
  });

  // ── /chat namespace — in-call messages ────────────────────────────────
  const chatNs = io.of('/chat');

  chatNs.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) { next(new Error('Authentication token required')); return; }
    const payload = verifySocketToken(token);
    if (!payload) { next(new Error('Invalid or expired token')); return; }
    socket.data.userId = payload.userId;
    next();
  });

  chatNs.on('connection', (socket) => {
    const { userId } = socket.data as { userId: string };

    socket.on('join-room', async ({ consultationId }: { consultationId: string }) => {
      const allowed = await verifyParticipant(consultationId, userId);
      if (!allowed) { socket.emit('error', { message: 'Not a participant' }); return; }
      await socket.join(`consultation:${consultationId}`);
    });

    socket.on(
      'chat:message',
      ({
        consultationId,
        text,
        senderName,
      }: {
        consultationId: string;
        text:           string;
        senderName:     string;
      }) => {
        // Sanitise: max 1000 chars, no HTML
        const safeText = String(text).slice(0, 1000).replace(/</g, '&lt;');
        const message = {
          senderId:   userId,
          senderName: String(senderName).slice(0, 100),
          text:       safeText,
          timestamp:  new Date().toISOString(),
        };
        // Broadcast to all in room INCLUDING sender (for confirmation)
        chatNs
          .to(`consultation:${consultationId}`)
          .emit('chat:message', message);
      }
    );
  });
}
