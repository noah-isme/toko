import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useToast } from '@/shared/ui/toast';
import { resolveToastDuration, toastPolicy } from '@/shared/ui/toast/policy';

describe('toast policy', () => {
  it('deduplicates identical event keys', () => {
    const { result, unmount } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Hello', eventKey: 'same-event' });
      result.current.toast({ title: 'Hello', eventKey: 'same-event' });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.dismiss();
    });
    unmount();
  });

  it('limits concurrent toasts to policy maximum', () => {
    const { result, unmount } = renderHook(() => useToast());

    act(() => {
      for (let index = 0; index < toastPolicy.maxConcurrent + 2; index += 1) {
        result.current.toast({ title: `Toast ${index}`, eventKey: `toast-${index}` });
      }
    });

    expect(result.current.toasts).toHaveLength(toastPolicy.maxConcurrent);

    act(() => {
      result.current.dismiss();
    });
    unmount();
  });

  it('applies default durations by variant', () => {
    expect(resolveToastDuration('success', undefined)).toBe(toastPolicy.defaultDurations.success);
    expect(resolveToastDuration('destructive', undefined)).toBe(
      toastPolicy.defaultDurations.destructive,
    );
    expect(resolveToastDuration(undefined, undefined)).toBe(toastPolicy.defaultDurations.default);
    expect(resolveToastDuration('success', 1200)).toBe(1200);
  });
});
