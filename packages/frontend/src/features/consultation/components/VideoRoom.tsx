/**
 * @file src/features/consultation/components/VideoRoom.tsx
 * @description WebRTC video room — refactored to use extracted components.
 * VideoControls and InCallChat are now separate files per spec structure.
 * useWebRTC handles RTCPeerConnection; useSignalling handles Socket.io.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { VideoOff } from 'lucide-react';
import { useWebRTC, type ConnectionState } from '../hooks/useWebRTC';
import { VideoControls } from './VideoControls';
import { InCallChat } from './InCallChat';
import { ErrorBoundary } from '../../../shared/components/ErrorBoundary';

// ── Connection state badge config ──────────────────────────────────────────

const stateConfig: Record<ConnectionState, { label: string; colour: string }> = {
  idle:         { label: 'Waiting…',     colour: 'bg-gray-500' },
  connecting:   { label: 'Connecting…',  colour: 'bg-yellow-500' },
  connected:    { label: 'Connected',    colour: 'bg-accent-500' },
  disconnected: { label: 'Disconnected', colour: 'bg-orange-500' },
  failed:       { label: 'Failed',       colour: 'bg-red-500' },
};

// ── Component ──────────────────────────────────────────────────────────────

export function VideoRoom() {
  const { id: consultationId } = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const [showChat, setShowChat] = useState(false);

  const {
    localStream, remoteStream, connectionState, mediaError,
    isMuted, isVideoOff,
    toggleMute, toggleVideo, endCall,
  } = useWebRTC(consultationId ?? '');

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef  = useRef<HTMLVideoElement>(null);

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
        {/* Main area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Video area */}
          <div className="flex-1 relative">
            {/* Remote video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              aria-label="Remote participant video"
            />

            {/* Overlay when not connected */}
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
                  {connectionState === 'failed' && !mediaError && (
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

            {/* Connection badge */}
            <div className={`absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-medium ${stateColour}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" aria-hidden="true" />
              {stateLabel}
            </div>

            {/* Local PiP */}
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
                  <VideoOff size={16} className="text-gray-400" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>

          {/* Chat sidebar */}
          {showChat && consultationId && (
            <InCallChat
              consultationId={consultationId}
              onClose={() => setShowChat(false)}
            />
          )}
        </div>

        {/* Controls bar — now a separate component */}
        <VideoControls
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isChatOpen={showChat}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={handleEndCall}
          onToggleChat={() => setShowChat((v) => !v)}
        />
      </div>
    </ErrorBoundary>
  );
}
