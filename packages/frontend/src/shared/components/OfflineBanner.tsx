import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      return undefined;
    }
    if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed top-0 left-0 right-0 z-50
        flex items-center justify-center gap-2
        px-4 py-2 text-sm font-medium text-white
        transition-all duration-300
        ${!isOnline ? 'bg-red-500' : 'bg-accent-600'}
      `}
    >
      {!isOnline ? (
        <>
          <WifiOff size={14} aria-hidden="true" />
          You are offline. Cached records are still available.
        </>
      ) : (
        <>
          <Wifi size={14} aria-hidden="true" />
          Back online!
        </>
      )}
    </div>
  );
}
