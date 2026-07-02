/**
 * @file src/features/consultation/components/VideoControls.tsx
 * @description Video call controls bar — extracted from VideoRoom per spec structure.
 * Contains: mute, camera toggle, end call, chat toggle buttons.
 * All buttons are WCAG 2.1 AA compliant (role, aria-label, aria-pressed, focus ring).
 */

import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare } from 'lucide-react';

interface VideoControlsProps {
  isMuted:      boolean;
  isVideoOff:   boolean;
  isChatOpen:   boolean;
  onToggleMute:  () => void;
  onToggleVideo: () => void;
  onEndCall:     () => void;
  onToggleChat:  () => void;
}

export function VideoControls({
  isMuted,
  isVideoOff,
  isChatOpen,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  onToggleChat,
}: VideoControlsProps) {
  return (
    <div
      role="toolbar"
      aria-label="Video call controls"
      className="flex items-center justify-center gap-4 px-4 py-4 bg-gray-900/95"
    >
      {/* Mute audio */}
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        aria-pressed={isMuted}
        className={`
          w-12 h-12 rounded-full flex items-center justify-center
          focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900
          transition-colors
          ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}
        `}
      >
        {isMuted
          ? <MicOff size={18} className="text-white" aria-hidden="true" />
          : <Mic    size={18} className="text-white" aria-hidden="true" />
        }
      </button>

      {/* Toggle video */}
      <button
        type="button"
        onClick={onToggleVideo}
        aria-label={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        aria-pressed={isVideoOff}
        className={`
          w-12 h-12 rounded-full flex items-center justify-center
          focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900
          transition-colors
          ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}
        `}
      >
        {isVideoOff
          ? <VideoOff size={18} className="text-white" aria-hidden="true" />
          : <Video    size={18} className="text-white" aria-hidden="true" />
        }
      </button>

      {/* End call — largest, most prominent */}
      <button
        type="button"
        onClick={onEndCall}
        aria-label="End call"
        className="
          w-14 h-14 rounded-full
          bg-red-600 hover:bg-red-700
          flex items-center justify-center
          focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-900
          transition-colors shadow-lg
        "
      >
        <PhoneOff size={20} className="text-white" aria-hidden="true" />
      </button>

      {/* Toggle chat sidebar */}
      <button
        type="button"
        onClick={onToggleChat}
        aria-label={isChatOpen ? 'Close in-call chat' : 'Open in-call chat'}
        aria-pressed={isChatOpen}
        className={`
          w-12 h-12 rounded-full flex items-center justify-center
          focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900
          transition-colors
          ${isChatOpen ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-700 hover:bg-gray-600'}
        `}
      >
        <MessageSquare size={18} className="text-white" aria-hidden="true" />
      </button>
    </div>
  );
}
