'use client';

import { X } from 'lucide-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { resolveToastDuration, toastPolicy, type ToastVariant } from './policy';

import { cn } from '@/lib/utils';

type ToastActionConfig = {
  label: string;
  onClick: (dismiss: () => void) => void;
};

export type ToastOptions = {
  id?: string;
  eventKey?: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: ReactNode | ToastActionConfig;
};

type ToastState = Required<Pick<ToastOptions, 'id'>> &
  Omit<ToastOptions, 'id'> & { eventKey?: string };

type ToastListener = (state: ToastState[]) => void;

const listeners = new Set<ToastListener>();
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();
const eventKeyIndex = new Map<string, string>();
let memoryState: ToastState[] = [];

const ToastActionContext = createContext<{
  toastId: string;
  dismiss: (id?: string) => void;
} | null>(null);

function isActionConfig(action: ToastOptions['action']): action is ToastActionConfig {
  if (!action || typeof action !== 'object') {
    return false;
  }

  return (
    'label' in action &&
    typeof (action as ToastActionConfig).label === 'string' &&
    'onClick' in action &&
    typeof (action as ToastActionConfig).onClick === 'function'
  );
}

function ToastActionButton({
  action,
  onDismiss,
}: {
  action: ToastActionConfig;
  onDismiss: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        action.onClick(onDismiss);
      }}
      className="prm:no-anim rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground shadow transition-colors duration-150 ease-out hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {action.label}
    </button>
  );
}

export function useToastActionContext() {
  const context = useContext(ToastActionContext);

  if (!context) {
    throw new Error('useToastActionContext must be used within a toast action.');
  }

  return context;
}

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
  const current = memoryState.find((toast) => toast.id === id);
  const timeout = timeouts.get(id);
  if (timeout) {
    clearTimeout(timeout);
    timeouts.delete(id);
  }
  if (current?.eventKey) {
    const indexedId = eventKeyIndex.get(current.eventKey);
    if (indexedId === id) {
      eventKeyIndex.delete(current.eventKey);
    }
  }
  memoryState = memoryState.filter((toast) => toast.id !== id);
  notify();
}

function addToast(toast: ToastOptions) {
  const id = toast.id ?? createId();
  const duration = resolveToastDuration(toast.variant, toast.duration);
  const eventKey =
    toast.eventKey ??
    toast.id ??
    (toast.title || toast.description
      ? `${toast.variant ?? 'default'}:${toast.title ?? ''}:${toast.description ?? ''}`
      : undefined);

  removeToast(id);
  if (eventKey) {
    const existingId = eventKeyIndex.get(eventKey);
    if (existingId && existingId !== id) {
      removeToast(existingId);
    }
    eventKeyIndex.set(eventKey, id);
  }

  memoryState = [...memoryState, { ...toast, id, eventKey }];

  if (memoryState.length > toastPolicy.maxConcurrent) {
    const overflow = memoryState.length - toastPolicy.maxConcurrent;
    const toRemove = memoryState.slice(0, overflow);
    toRemove.forEach((item) => removeToast(item.id));
    memoryState = memoryState.slice(-toastPolicy.maxConcurrent);
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
  eventKeyIndex.clear();
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
      className={cn(
        'pointer-events-none fixed z-50 flex flex-col space-y-2 p-4',
        toastPolicy.defaultPosition === 'top-right' && 'top-4 right-4 items-end',
        toastPolicy.defaultPosition === 'top-left' && 'top-4 left-4 items-start',
        toastPolicy.defaultPosition === 'bottom-right' && 'bottom-4 right-4 items-end',
        toastPolicy.defaultPosition === 'bottom-left' && 'bottom-4 left-4 items-start',
      )}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg transition-all duration-200 ease-out prm:no-anim focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
              className="prm:no-anim rounded-md p-1 text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="sr-only">Tutup</span>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {toast.action ? (
            <ToastActionContext.Provider value={{ toastId: toast.id, dismiss }}>
              <div className="flex justify-end border-t border-border/40 bg-black/5 p-3 dark:border-border/20 dark:bg-white/5">
                {isActionConfig(toast.action) ? (
                  <ToastActionButton action={toast.action} onDismiss={() => dismiss(toast.id)} />
                ) : (
                  toast.action
                )}
              </div>
            </ToastActionContext.Provider>
          ) : null}
        </div>
      ))}
    </div>
  );
}
