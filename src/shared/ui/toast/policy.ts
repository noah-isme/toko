export type ToastVariant = 'default' | 'success' | 'destructive';

export interface ToastPolicy {
  defaultPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  maxConcurrent: number;
  defaultDurations: Record<ToastVariant | 'default', number>;
}

export const toastPolicy: ToastPolicy = {
  defaultPosition: 'top-right',
  maxConcurrent: 3,
  defaultDurations: {
    default: 2600,
    success: 2200,
    destructive: 3200,
  },
};

export function resolveToastDuration(variant: ToastVariant | undefined, override?: number) {
  if (typeof override === 'number') {
    return override;
  }

  if (!variant) {
    return toastPolicy.defaultDurations.default;
  }

  return toastPolicy.defaultDurations[variant] ?? toastPolicy.defaultDurations.default;
}
