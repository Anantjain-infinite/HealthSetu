/**
 * @file src/features/consultation/hooks/useSignalling.ts
 * @description Socket.io signalling hook — extracted from useWebRTC per spec structure.
 *
 * Manages the /signal namespace Socket.io connection lifecycle:
 *   - Connects with JWT auth
 *   - Emits join-room on connect
 *   - Fires callbacks for: peer-joined, offer, answer, ice-candidate, peer-left
 *   - Cleans up on unmount
 *
 * useWebRTC delegates all Socket.io work here and only handles
 * RTCPeerConnection logic itself.
 */

import { useEffect, useRef, useCallback } from 'react';
import { io as socketIOClient, type Socket } from 'socket.io-client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSocketUrl = (): string =>
  (import.meta as any).env?.VITE_SOCKET_URL ?? 'http://localhost:5000';

export interface SignallingCallbacks {
  onPeerJoined:    () => void;
  onOffer:         (sdp: RTCSessionDescriptionInit) => void;
  onAnswer:        (sdp: RTCSessionDescriptionInit) => void;
  onIceCandidate:  (candidate: RTCIceCandidateInit) => void;
  onPeerLeft:      () => void;
  onError:         (message: string) => void;
}

export interface UseSignallingReturn {
  sendOffer:        (sdp: RTCSessionDescriptionInit) => void;
  sendAnswer:       (sdp: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (candidate: RTCIceCandidateInit) => void;
  sendLeave:        () => void;
  isConnected:      () => boolean;
}

export function useSignalling(
  consultationId: string,
  accessToken: string | null,
  callbacks: SignallingCallbacks
): UseSignallingReturn {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken || !consultationId) return;

    const socket = socketIOClient(`${getSocketUrl()}/signal`, {
      auth:       { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    // ── Register all handlers before joining ─────────────────────────────

    socket.on('connect_error', (err) => {
      callbacks.onError(`Could not connect to ${getSocketUrl()}: ${err.message}`);
    });

    socket.on('peer-joined', () => {
      callbacks.onPeerJoined();
    });

    socket.on('offer', ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      callbacks.onOffer(sdp);
    });

    socket.on('answer', ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      callbacks.onAnswer(sdp);
    });

    socket.on('ice-candidate', ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      callbacks.onIceCandidate(candidate);
    });

    socket.on('peer-left', () => {
      callbacks.onPeerLeft();
    });

    socket.on('error', (err: { message: string }) => {
      callbacks.onError(err.message);
    });

    // ── Join room AFTER all handlers are registered ───────────────────────
    socket.on('connect', () => {
      socket.emit('join-room', { consultationId });
    });

    // Already connected (reconnect case)
    if (socket.connected) {
      socket.emit('join-room', { consultationId });
    }

    return () => {
      socket.emit('leave-room', { consultationId });
      socket.disconnect();
      socketRef.current = null;
    };
    // callbacks is intentionally excluded from deps — we use the initial
    // callbacks and don't re-register on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId, accessToken]);

  const sendOffer = useCallback((sdp: RTCSessionDescriptionInit) => {
    socketRef.current?.emit('offer', { consultationId, sdp });
  }, [consultationId]);

  const sendAnswer = useCallback((sdp: RTCSessionDescriptionInit) => {
    socketRef.current?.emit('answer', { consultationId, sdp });
  }, [consultationId]);

  const sendIceCandidate = useCallback((candidate: RTCIceCandidateInit) => {
    socketRef.current?.emit('ice-candidate', { consultationId, candidate });
  }, [consultationId]);

  const sendLeave = useCallback(() => {
    socketRef.current?.emit('leave-room', { consultationId });
  }, [consultationId]);

  const isConnected = useCallback(() => {
    return socketRef.current?.connected ?? false;
  }, []);

  return { sendOffer, sendAnswer, sendIceCandidate, sendLeave, isConnected };
}
