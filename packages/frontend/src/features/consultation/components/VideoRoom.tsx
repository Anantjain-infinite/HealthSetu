/**
 * @file src/features/consultation/components/VideoRoom.tsx
 * @description Full WebRTC video room.
 * Spec 5.10: large remote video, PiP local preview, controls bar,
 *            connection state badge, collapsible in-call chat sidebar.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, X, Send } from 'lucide-react';
import { io as socketIOClient, type Socket } from 'socket.io-client';
import { useWebRTC, type ConnectionState } from '../hooks/useWebRTC';
import { useAuthStore } from '../../auth/store/authStore';
import { ErrorBoundary } from '../../../shared/components/ErrorBoundary';
import type { ChatMessage } from '../../../shared/types';

// ── Connection state badge ─────────────────────────────────────────────────

const stateConfig: Record<ConnectionState, { label: string; colour: string }> = {
  idle:         { label: 'Waiting…',     colour: 'bg-gray-500' },
  connecting:   { label: 'Connecting…',  colour: 'bg-yellow-500' },
  connected:    { label: 'Connected',    colour: 'bg-accent-500' },
  disconnected: { label: 'Disconnected', colour: 'bg-orange-500' },
  failed:       { label: 'Failed',       colour: 'bg-red-500' },
};

// ── In-call chat ───────────────────────────────────────────────────────────

function InCallChat({
  consultationId,
  onClose,
}: {
  consultationId: string;
  onClose: () => void;
}) {
  const { accessToken, user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState('');
  const socketRef  = useRef<Socket | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketUrl = (import.meta as any).env?.VITE_SOCKET_URL ?? 'http://localhost:5000';

  useEffect(() => {
    if (!accessToken) return;
    const socket = socketIOClient(`${socketUrl}/chat`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', { consultationId });
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => { socket.disconnect(); };
  }, [consultationId, accessToken, socketUrl]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    const text = input.trim();
    if (!text || !socketRef.current) return;

    // Optimistic local message
    const localMsg: ChatMessage = {
      senderId:   user?.id ?? '',
      senderName: user?.fullName ?? 'You',
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, localMsg]);

    socketRef.current.emit('chat:message', {
      consultationId,
      text,
      senderName: user?.fullName ?? 'Doctor',
    });
    setInput('');
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-72 flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700">In-Call Chat</span>
        <button onClick={onClose} aria-label="Close chat" className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">No messages yet.</p>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.senderId === user?.id;
          return (
            <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`
                  max-w-[85%] px-3 py-2 rounded-xl text-sm
                  ${isMine ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}
                `}
              >
                {!isMine && (
                  <p className="text-xs font-medium text-primary-600 mb-0.5">{msg.senderName}</p>
                )}
                <p className="break-words">{msg.text}</p>
                <p className={`text-xs mt-0.5 ${isMine ? 'text-primary-200' : 'text-gray-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 p-3 border-t border-gray-100">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Type a message…"
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          maxLength={1000}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          aria-label="Send message"
          className="p-2 rounded-lg bg-primary-600 text-white disabled:bg-primary-300 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Main VideoRoom ─────────────────────────────────────────────────────────

export function VideoRoom() {
  const { id: consultationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);

  const {
    localStream, remoteStream, connectionState, mediaError,
    isMuted, isVideoOff,
    toggleMute, toggleVideo, endCall,
  } = useWebRTC(consultationId ?? '');

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef  = useRef<HTMLVideoElement>(null);

  // Attach streams to video elements
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  function handleEndCall() {
    endCall();
    navigate(-1);
  }

  const { label: stateLabel, colour: stateColour } = stateConfig[connectionState];

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 bg-gray-900 flex flex-col">
        {/* Main area: video + optional chat sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Video area */}
          <div className="flex-1 relative">
            {/* Remote video — large */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              aria-label="Remote participant video"
            />

            {/* Connection state overlay when not connected */}
            {connectionState !== 'connected' && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                <div className="text-center text-white space-y-3">
                  {connectionState === 'connecting' && (
                    <svg className="animate-spin h-10 w-10 mx-auto text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  )}
                  <p className="text-lg font-semibold">{stateLabel}</p>
                  {mediaError && (
                    <p className="text-sm text-red-300 max-w-xs mx-auto px-4">{mediaError}</p>
                  )}
                  {connectionState === 'failed' && (
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-primary-600 rounded-lg text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
                    >
                      Reconnect
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Connection state badge */}
            <div className={`absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-medium ${stateColour}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
              {stateLabel}
            </div>

            {/* Local video — picture-in-picture, bottom right */}
            <div className="absolute bottom-20 right-4 w-28 h-20 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg bg-gray-800">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                aria-label="Your local video preview"
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <VideoOff size={16} className="text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Chat sidebar — collapsible */}
          {showChat && consultationId && (
            <InCallChat
              consultationId={consultationId}
              onClose={() => setShowChat(false)}
            />
          )}
        </div>

        {/* Controls bar */}
        <div className="flex items-center justify-center gap-4 px-4 py-4 bg-gray-900/95">
          {/* Mute audio */}
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-pressed={isMuted}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center
              focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900
              transition-colors
              ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}
            `}
          >
            {isMuted ? <MicOff size={18} className="text-white" /> : <Mic size={18} className="text-white" />}
          </button>

          {/* Toggle video */}
          <button
            onClick={toggleVideo}
            aria-label={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            aria-pressed={isVideoOff}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center
              focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900
              transition-colors
              ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}
            `}
          >
            {isVideoOff ? <VideoOff size={18} className="text-white" /> : <Video size={18} className="text-white" />}
          </button>

          {/* End call */}
          <button
            onClick={handleEndCall}
            aria-label="End call"
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors shadow-lg"
          >
            <PhoneOff size={20} className="text-white" />
          </button>

          {/* Toggle chat */}
          <button
            onClick={() => setShowChat((v) => !v)}
            aria-label={showChat ? 'Close chat' : 'Open chat'}
            aria-pressed={showChat}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center
              focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900
              transition-colors
              ${showChat ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-700 hover:bg-gray-600'}
            `}
          >
            <MessageSquare size={18} className="text-white" />
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}