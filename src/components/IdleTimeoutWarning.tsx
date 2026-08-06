'use client';

import { AlertCircle, X } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface IdleTimeoutWarningProps {
  /** Time in milliseconds before showing warning (default: 13 minutes - 1 min before token refresh) */
  warningTime?: number;
  /** Time in milliseconds before auto-logout (default: 15 minutes - token expiry) */
  logoutTime?: number;
  /** Callback when user extends session */
  onExtendSession?: () => Promise<void>;
  /** Callback when user is logged out due to inactivity */
  onAutoLogout?: () => void;
}

const DEFAULT_WARNING_TIME = 13 * 60 * 1000; // 13 minutes
const DEFAULT_LOGOUT_TIME = 15 * 60 * 1000; // 15 minutes

export function IdleTimeoutWarning({
  warningTime = DEFAULT_WARNING_TIME,
  logoutTime = DEFAULT_LOGOUT_TIME,
  onExtendSession,
  onAutoLogout,
}: IdleTimeoutWarningProps) {
  const { isAuthenticated, refreshUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isExtendingRef = useRef(false);

  // Reset all timers
  const resetTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    lastActivityRef.current = Date.now();

    if (!isAuthenticated) return;

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setIsOpen(true);
      const remaining = logoutTime - warningTime;
      setCountdown(Math.ceil(remaining / 1000));

      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningTime);

    // Set logout timer
    logoutTimerRef.current = setTimeout(() => {
      if (!isExtendingRef.current) {
        setIsOpen(false);
        if (onAutoLogout) {
          onAutoLogout();
        } else {
          // Force logout by clearing auth state
          // The AuthProvider will handle the actual logout
        }
      }
    }, logoutTime);
  }, [isAuthenticated, warningTime, logoutTime, onAutoLogout]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    if (isOpen) return; // Don't reset if warning is showing
    resetTimers();
  }, [resetTimers, isOpen]);

  // Extend session
  const handleExtend = async () => {
    isExtendingRef.current = true;
    setIsOpen(false);

    try {
      if (onExtendSession) {
        await onExtendSession();
      } else {
        // Default: refresh the token/user
        await refreshUser();
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
    } finally {
      isExtendingRef.current = false;
      resetTimers();
    }
  };

  // Handle logout from dialog
  const handleLogout = () => {
    setIsOpen(false);
    if (onAutoLogout) {
      onAutoLogout();
    }
  };

  // Initialize and cleanup
  useEffect(() => {
    if (!isAuthenticated) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setIsOpen(false);
      return;
    }

    resetTimers();

    // Add activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      events.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [isAuthenticated, resetTimers, handleActivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  if (!isAuthenticated) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const countdownText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" aria-hidden="true" />
          <DialogTitle className="text-center">Sesi akan berakhir</DialogTitle>
          <DialogDescription className="text-center">
            Anda tidak aktif selama beberapa menit. Sesi Anda akan berakhir dalam{' '}
            <strong>{countdownText}</strong>. Klik &ldquo;Lanjutkan&rdquo; untuk tetap masuk.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleLogout}
            disabled={isExtendingRef.current}
          >
            Keluar
          </Button>
          <Button
            className="flex-1 bg-primary"
            onClick={handleExtend}
            disabled={isExtendingRef.current}
          >
            {isExtendingRef.current ? 'Memproses...' : 'Lanjutkan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy integration
export function useIdleTimeoutWarning() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <IdleTimeoutWarning /> : null;
}
