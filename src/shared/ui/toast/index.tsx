'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

type ToastVariant = 'default' | 'success' | 'destructive';

type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastOptions = {
  id?: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
};

type ToastState = Required<Pick<ToastOptions, 'id'>> & Omit<ToastOptions, 'id'>;

type ToastListener = (state: ToastState[]) => void;

const TOAST_LIMIT = 5;
const DEFAULT_DURATION = 4000;
const listeners = new Set<ToastListener>();
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();
let memoryState: ToastState[] = [];

function createId() {
  return Math.random().toString(36).slice(2);
}

function notify() {
  for (const listener of listeners) {
    listener([...memoryState]);
  }
}

function subscribe(listener: ToastListener) {
  listeners.add(listener);
  listener([...memoryState]);
  return () => {
    listeners.delete(listener);
  };
}

function removeToast(id: string) {
  const timeout = timeouts.get(id);
  if (timeout) {
    clearTimeout(timeout);
    timeouts.delete(id);
  }
  memoryState = memoryState.filter((toast) => toast.id !== id);
  notify();
}

function addToast(toast: ToastOptions) {
  const id = toast.id ?? createId();
  const duration = toast.duration ?? DEFAULT_DURATION;

  removeToast(id);
  memoryState = [...memoryState, { ...toast, id }];

  if (memoryState.length > TOAST_LIMIT) {
    memoryState = memoryState.slice(memoryState.length - TOAST_LIMIT);
  }

  notify();

  if (Number.isFinite(duration) && duration > 0) {
    timeouts.set(
      id,
      setTimeout(() => {
        removeToast(id);
      }, duration),
    );
  }

  return id;
}

function clearToasts() {
  for (const id of Array.from(timeouts.keys())) {
    removeToast(id);
  }
  memoryState = [];
  notify();
}

export function useToast() {
  const [state, setState] = useState<ToastState[]>(memoryState);

  useEffect(() => subscribe(setState), []);

  return {
    toast: addToast,
    dismiss: (id?: string) => {
      if (id) {
        removeToast(id);
        return;
      }
      clearToasts();
    },
    toasts: state,
  };
}

const variantStyles: Record<ToastVariant, string> = {
  default: 'border-border bg-background text-foreground',
  success:
    'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
  destructive:
    'border-destructive/40 bg-destructive/10 text-destructive dark:border-destructive dark:bg-destructive/20 dark:text-destructive-foreground',
};

export function Toaster() {
  const { dismiss, toasts } = useToast();

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 top-2 z-50 flex flex-col items-center space-y-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            variantStyles[toast.variant ?? 'default'],
          )}
        >
          <div className="flex items-start gap-3 p-4">
            <div className="flex-1 space-y-1">
              {toast.title ? <p className="font-medium leading-none">{toast.title}</p> : null}
              {toast.description ? (
                <p className="text-sm text-muted-foreground">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="sr-only">Tutup</span>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {toast.action ? (
            <div className="flex justify-end border-t border-border/40 bg-black/5 p-3 dark:border-border/20 dark:bg-white/5">
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {toast.action.label}
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
