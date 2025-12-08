'use client';

import { WifiOff, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={cn(
        'fixed left-0 right-0 top-0 z-50 px-4 py-3 text-center text-sm font-medium transition-all',
        isOnline ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white',
      )}
      role="alert"
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>Connection restored</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>You are currently offline. Some features may be unavailable.</span>
          </>
        )}
      </div>
    </div>
  );
}
