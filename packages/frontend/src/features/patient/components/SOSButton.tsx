/**
 * @file src/features/patient/components/SOSButton.tsx
 * @description Emergency SOS button — spec section 5.9.
 *
 * States: normal → loading → cooldown (60s countdown) → normal
 * WCAG 2.1 AA: role, aria-label, focus ring, disabled state announced.
 */

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../shared/lib/axiosInstance';

const COOLDOWN_MS = 60_000;

export function SOSButton() {
  const [isLoading,   setIsLoading]   = useState(false);
  const [isCooldown,  setIsCooldown]  = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout>  | null>(null);

  // Start the visible 60s countdown
  function startCooldown() {
    setIsCooldown(true);
    setSecondsLeft(60);

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    cooldownRef.current = setTimeout(() => {
      setIsCooldown(false);
      setSecondsLeft(0);
    }, COOLDOWN_MS);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current)    clearInterval(timerRef.current);
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  async function handleSOS() {
    if (isCooldown) {
      toast('Please wait before sending another alert.', { icon: '⏳' });
      return;
    }

    setIsLoading(true);

    try {
      // Try to get GPS — resolve regardless of success/failure
      const position = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          ()    => resolve(null),   // User denied or unavailable
          { timeout: 5000 }
        );
      });

      const payload: { lat?: number; lng?: number } = {};
      if (position) {
        payload.lat = position.coords.latitude;
        payload.lng = position.coords.longitude;
      }

      const { data } = await api.post<{ success: boolean; message: string }>(
        '/emergency/sos',
        payload
      );

      startCooldown();

      if (data.success) {
        toast.success('Emergency alert sent to your contact!', { duration: 6000 });
      } else {
        toast.error(data.message, { duration: 6000 });
      }
    } catch {
      toast.error('Failed to send emergency alert. Please call emergency services directly.', {
        duration: 8000,
      });
      startCooldown(); // Still start cooldown to prevent spam on error
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const isDisabled = isLoading || isCooldown;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        role="button"
        aria-label={
          isCooldown
            ? `Emergency SOS on cooldown. Available in ${secondsLeft} seconds.`
            : 'Send Emergency SOS alert to your emergency contact'
        }
        aria-disabled={isDisabled}
        disabled={isDisabled}
        onClick={handleSOS}
        className={`
          relative w-full max-w-xs py-4 rounded-2xl font-bold text-lg text-white
          focus:outline-none focus:ring-4 focus:ring-offset-2
          transition-all duration-200 select-none
          ${isDisabled
            ? 'bg-gray-400 cursor-not-allowed focus:ring-gray-400'
            : 'bg-emergency-600 hover:bg-emergency-700 active:scale-95 shadow-lg shadow-emergency-200 focus:ring-emergency-500 animate-pulse-slow'
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Sending alert…
          </span>
        ) : isCooldown ? (
          <span className="flex items-center justify-center gap-2">
            <AlertTriangle size={20} aria-hidden="true" />
            Alert sent — wait {secondsLeft}s
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <AlertTriangle size={20} aria-hidden="true" />
            🚨 EMERGENCY SOS
          </span>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center max-w-xs">
        Sends an SMS alert with your location to your emergency contact.
        {isCooldown && ' You can send another alert after the cooldown.'}
      </p>
    </div>
  );
}
