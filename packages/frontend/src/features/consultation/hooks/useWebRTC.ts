/**
 * @file src/features/consultation/hooks/useWebRTC.ts
 * @description WebRTC peer connection hook — fully fixed version.
 *
 * Root cause of "failed on different browsers, works on same browser":
 *   The server emits 'peer-joined' to the FIRST joiner when the SECOND joins.
 *   If the first joiner's socket connects but the React effect hasn't finished
 *   setting up the peer connection yet, the 'peer-joined' handler isn't
 *   registered in time and the offer is never sent.
 *
 * Fix: use a ref to track "ready" state. If 'peer-joined' arrives before the
 * PC is ready, we store it and process it as soon as the PC is created.
 *
 * Other fixes:
 *   - ICE candidates queued until setRemoteDescription completes
 *   - pc.restartIce() on connection failure
 *   - mediaError surface for camera permission denial
 *   - localStreamRef so cleanup works across re-renders
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io as socketIOClient, type Socket } from 'socket.io-client';
import { useAuthStore } from '../../auth/store/authStore';

// Read env vars directly via import.meta.env so Vite's build-time static
// replacement works correctly. Do NOT wrap this in an intermediate variable
// assigned outside a function — that can break Vite's static analysis in some
// configurations and silently fall back to undefined.
function getEnvVar(key: string): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (import.meta as any).env;
    return env ? env[key] : undefined;
  } catch {
    return undefined;
  }
}

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  const turnUrl = getEnvVar('VITE_TURN_URL');
  if (turnUrl) {
    servers.push({
      urls:       turnUrl,
      username:   getEnvVar('VITE_TURN_USERNAME')   ?? '',
      credential: getEnvVar('VITE_TURN_CREDENTIAL') ?? '',
    });
  }
  return servers;
}

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

export interface UseWebRTCReturn {
  localStream:     MediaStream | null;
  remoteStream:    MediaStream | null;
  connectionState: ConnectionState;
  mediaError:      string | null;
  isMuted:         boolean;
  isVideoOff:      boolean;
  toggleMute:      () => void;
  toggleVideo:     () => void;
  endCall:         () => void;
}

export function useWebRTC(consultationId: string): UseWebRTCReturn {
  const { accessToken } = useAuthStore();

  const [localStream,     setLocalStream]    = useState<MediaStream | null>(null);
  const [remoteStream,    setRemoteStream]   = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [mediaError,      setMediaError]     = useState<string | null>(null);
  const [isMuted,         setIsMuted]        = useState(false);
  const [isVideoOff,      setIsVideoOff]     = useState(false);

  // Refs that persist across renders without triggering re-renders
  const pcRef               = useRef<RTCPeerConnection | null>(null);
  const socketRef           = useRef<Socket | null>(null);
  const localStreamRef      = useRef<MediaStream | null>(null);
  const remoteDescSet       = useRef(false);
  const iceCandidateQueue   = useRef<RTCIceCandidateInit[]>([]);
  // If peer-joined fires before PC is ready, store a flag
  const peerJoinedBeforeReady = useRef(false);
  const pcReadyRef          = useRef(false);

  // ── Drain queued ICE candidates ──────────────────────────────────────────
  async function drainQueue(pc: RTCPeerConnection) {
    for (const c of iceCandidateQueue.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* stale */ }
    }
    iceCandidateQueue.current = [];
  }

  // ── Create and send offer (called when we are the initiator) ─────────────
  async function createOffer(pc: RTCPeerConnection, socket: Socket) {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { consultationId, sdp: pc.localDescription });
    } catch (err) {
      console.error('[WebRTC] createOffer failed:', err);
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    socketRef.current?.disconnect();
    pcRef.current             = null;
    socketRef.current         = null;
    localStreamRef.current    = null;
    remoteDescSet.current     = false;
    pcReadyRef.current        = false;
    peerJoinedBeforeReady.current = false;
    iceCandidateQueue.current = [];
  }, []);

  useEffect(() => {
    if (!accessToken || !consultationId) return;
    let cancelled = false;

    async function init() {
      setConnectionState('connecting');
      setMediaError(null);
      remoteDescSet.current     = false;
      pcReadyRef.current        = false;
      peerJoinedBeforeReady.current = false;
      iceCandidateQueue.current = [];

      // ── 1. Camera + microphone ─────────────────────────────────────────
      let stream: MediaStream;
      try {
        // Browsers only expose mediaDevices on secure contexts (HTTPS or localhost).
        // Surface a clear message instead of letting the call crash with
        // "Cannot read properties of undefined".
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(
            window.isSecureContext
              ? 'Camera access is not supported in this browser.'
              : 'Camera access requires HTTPS. This page was loaded over an insecure connection.'
          );
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Camera/microphone permission denied. Please allow access and reload.'
            : `Media error: ${err instanceof Error ? err.message : String(err)}`;
        setMediaError(msg);
        setConnectionState('failed');
        return;
      }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      localStreamRef.current = stream;
      setLocalStream(stream);

      // ── 2. Peer connection ─────────────────────────────────────────────
      const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
      pcRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        if (!cancelled) setRemoteStream(e.streams[0] ?? null);
      };

      pc.onconnectionstatechange = () => {
        if (cancelled) return;
        const s = pc.connectionState;
        if (s === 'connected')    setConnectionState('connected');
        if (s === 'disconnected') setConnectionState('disconnected');
        if (s === 'failed') {
          setConnectionState('failed');
          pc.restartIce(); // attempt automatic recovery
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && socketRef.current) {
          socketRef.current.emit('ice-candidate', {
            consultationId,
            candidate: e.candidate.toJSON(),
          });
        }
      };

      // ── 3. Socket connection ───────────────────────────────────────────
      const socketUrl = getEnvVar('VITE_SOCKET_URL') ?? 'http://localhost:5000';
      const socket = socketIOClient(`${socketUrl}/signal`, {
        auth:       { token: accessToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on('connect_error', (err) => {
        if (!cancelled) {
          console.error('[WebRTC] Socket connect error:', err.message, 'URL:', socketUrl);
          setConnectionState('failed');
          setMediaError(`Could not connect to ${socketUrl}: ${err.message}`);
        }
      });

      // ── 4. Register ALL socket event handlers BEFORE emitting join-room ─
      // This is the key fix: handlers must exist before any events can arrive.

      // We are the FIRST joiner — a second peer just joined → we send offer
      socket.on('peer-joined', () => {
        if (cancelled) return;
        if (pcReadyRef.current) {
          // PC is fully set up — send offer immediately
          createOffer(pc, socket);
        } else {
          // PC setup still in progress — flag it, offer will be sent below
          peerJoinedBeforeReady.current = true;
        }
      });

      // We are the SECOND joiner — receive offer → send answer
      socket.on('offer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
        if (cancelled) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          remoteDescSet.current = true;
          await drainQueue(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { consultationId, sdp: pc.localDescription });
        } catch (err) {
          console.error('[WebRTC] Failed to handle offer:', err);
        }
      });

      // We are the FIRST joiner — receive answer
      socket.on('answer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
        if (cancelled) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          remoteDescSet.current = true;
          await drainQueue(pc);
        } catch (err) {
          console.error('[WebRTC] Failed to handle answer:', err);
        }
      });

      // ICE candidates — queue if remote description not yet set
      socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        if (cancelled) return;
        if (!remoteDescSet.current) {
          iceCandidateQueue.current.push(candidate);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch { /* stale, ignore */ }
      });

      socket.on('peer-left', () => {
        if (!cancelled) setConnectionState('disconnected');
      });

      socket.on('error', (err: { message: string }) => {
        console.error('[WebRTC] Server error:', err.message);
      });

      // ── 5. NOW join the room — after all handlers are registered ────────
      socket.on('connect', () => {
        socket.emit('join-room', { consultationId });
      });

      // If already connected (reconnect case), join immediately
      if (socket.connected) {
        socket.emit('join-room', { consultationId });
      }

      // ── 6. Mark PC as ready; send offer if peer-joined already fired ────
      pcReadyRef.current = true;
      if (peerJoinedBeforeReady.current) {
        peerJoinedBeforeReady.current = false;
        createOffer(pc, socket);
      }
    }

    init().catch((err) => {
      console.error('[WebRTC] Init error:', err);
      if (!cancelled) setConnectionState('failed');
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId, accessToken]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((v) => !v);
  }, []);

  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsVideoOff((v) => !v);
  }, []);

  const endCall = useCallback(() => {
    socketRef.current?.emit('leave-room', { consultationId });
    cleanup();
    setConnectionState('disconnected');
  }, [cleanup, consultationId]);

  return {
    localStream, remoteStream, connectionState, mediaError,
    isMuted, isVideoOff,
    toggleMute, toggleVideo, endCall,
  };
}