/**
 * @file src/features/consultation/components/InCallChat.tsx
 * @description In-call chat sidebar — extracted from VideoRoom per spec structure.
 * Connects to Socket.io /chat namespace.
 * Shows message history, input box, send button.
 * Auto-scrolls to newest message.
 */

import { useEffect, useRef, useState } from 'react';
import { io as socketIOClient, type Socket } from 'socket.io-client';
import { X, Send } from 'lucide-react';
import { useAuthStore } from '../../auth/store/authStore';
import type { ChatMessage } from '../../../shared/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSocketUrl = (): string =>
  (import.meta as any).env?.VITE_SOCKET_URL ?? 'http://localhost:5000';

interface InCallChatProps {
  consultationId: string;
  onClose:        () => void;
}

export function InCallChat({ consultationId, onClose }: InCallChatProps) {
  const { accessToken, user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState('');
  const socketRef  = useRef<Socket | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!accessToken) return;

    const socket = socketIOClient(`${getSocketUrl()}/chat`, {
      auth:       { token: accessToken },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', { consultationId });
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [consultationId, accessToken]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function sendMessage() {
    const text = input.trim();
    if (!text || !socketRef.current) return;

    socketRef.current.emit('chat:message', {
      consultationId,
      text,
      senderName: user?.fullName ?? (user?.role === 'DOCTOR' ? 'Doctor' : 'Patient'),
    });
    setInput('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div
      role="complementary"
      aria-label="In-call chat"
      className="flex flex-col h-full bg-white border-l border-gray-200 w-72 flex-shrink-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700">In-Call Chat</span>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="p-1 text-gray-400 hover:text-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-2"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-6">
            No messages yet. Say hello!
          </p>
        )}

        {messages.map((msg, i) => {
          const isMine = msg.senderId === user?.id;
          return (
            <div
              key={i}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[85%] px-3 py-2 rounded-xl text-sm
                  ${isMine
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }
                `}
              >
                {!isMine && (
                  <p className="text-xs font-semibold text-primary-600 mb-0.5">
                    {msg.senderName}
                  </p>
                )}
                <p className="break-words leading-relaxed">{msg.text}</p>
                <p className={`text-xs mt-0.5 ${isMine ? 'text-primary-200' : 'text-gray-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t border-gray-100">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          maxLength={1000}
          aria-label="Chat message input"
          className="
            flex-1 px-3 py-2 text-sm rounded-lg
            border border-gray-300
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            placeholder:text-gray-400
          "
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={!input.trim()}
          aria-label="Send message"
          className="
            p-2 rounded-lg
            bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300
            text-white
            focus:outline-none focus:ring-2 focus:ring-primary-500
            transition-colors
          "
        >
          <Send size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
