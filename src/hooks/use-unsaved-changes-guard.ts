'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Structural equality for plain form values (objects, arrays, primitives).
 * Key order does not matter, so a form seeded from an API object compares equal
 * to its untouched state.
 */
export function isFormDirty(current: unknown, baseline: unknown): boolean {
  return !valuesEqual(current, baseline);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => valuesEqual(item, b[index]));
  }
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord).filter((key) => aRecord[key] !== undefined);
  const bKeys = Object.keys(bRecord).filter((key) => bRecord[key] !== undefined);
  return (
    aKeys.length === bKeys.length && aKeys.every((key) => valuesEqual(aRecord[key], bRecord[key]))
  );
}

interface PendingNavigation {
  proceed: () => void;
  /** Undo work done before the dialog opened (e.g. restore a popped history entry). */
  cancel?: () => void;
}

export interface UnsavedChangesGuard {
  /** Mirrors the `when` argument. */
  isDirty: boolean;
  /** Whether the confirm dialog should be shown. */
  dialogOpen: boolean;
  /**
   * Runs `proceed` immediately when there is nothing to lose, otherwise asks first.
   * Use for programmatic navigation (`router.push`) and for dismissing form dialogs.
   */
  confirmNavigation: (proceed: () => void) => void;
  /** Dismiss the dialog and stay on the form. */
  stay: () => void;
  /** Discard the changes and carry out the navigation that was held back. */
  leave: () => void;
}

/** Same-origin `<a>` click that would leave the current page, or `null`. */
function navigatingAnchor(event: MouseEvent): { anchor: HTMLAnchorElement; url: URL } | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== '_self') return null;
  if (anchor.hasAttribute('download')) return null;

  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return null;
  }
  // Cross-origin links unload the document, which `beforeunload` already covers.
  if (url.origin !== window.location.origin) return null;
  // Hash jumps and links to the current URL keep the form mounted.
  if (url.pathname === window.location.pathname && url.search === window.location.search) {
    return null;
  }
  return { anchor, url };
}

/**
 * Warns before unsaved form changes are lost.
 *
 * While `when` is true it intercepts:
 * - tab close, reload and cross-origin navigation (`beforeunload`, browser-native prompt);
 * - in-app link clicks (`<Link>` and plain same-origin `<a>`), caught in the capture phase
 *   before Next.js handles them;
 * - browser back/forward (`popstate`), caught before the app router's own listener;
 * - anything routed through `confirmNavigation`.
 *
 * In-app cases open the dialog rendered by `UnsavedChangesDialog`. Pass `when = false`
 * (e.g. reset the form baseline) after a successful save so the guard stays quiet.
 */
export function useUnsavedChangesGuard(when: boolean): UnsavedChangesGuard {
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingRef = useRef<PendingNavigation | null>(null);
  /** Set once the user chose to leave, so the navigation they confirmed is let through. */
  const bypassRef = useRef(false);
  const whenRef = useRef(when);

  const requestConfirmation = useCallback((pending: PendingNavigation) => {
    pendingRef.current = pending;
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    whenRef.current = when;
    if (!when) {
      // Clean again: a later edit must re-arm the guard.
      bypassRef.current = false;
      return;
    }

    // The entry to restore if the user backs out of a back/forward navigation.
    const saved = { state: window.history.state as unknown, url: window.location.href };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (bypassRef.current) return;
      event.preventDefault();
      // Legacy browsers only show the prompt when returnValue is set.
      event.returnValue = '';
    };

    const onClick = (event: MouseEvent) => {
      if (bypassRef.current) return;
      const match = navigatingAnchor(event);
      if (!match) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const { anchor, url } = match;
      requestConfirmation({
        proceed: () => {
          // Re-clicking keeps <Link> semantics (replace, scroll, prefetch cache).
          if (anchor.isConnected) anchor.click();
          else window.location.assign(url.href);
        },
      });
    };

    const onPopState = (event: PopStateEvent) => {
      if (bypassRef.current) return;
      // Keep the app router from rendering the popped entry until the user decides.
      event.stopImmediatePropagation();
      const poppedState: unknown = event.state;
      requestConfirmation({
        proceed: () => {
          window.dispatchEvent(new PopStateEvent('popstate', { state: poppedState }));
        },
        cancel: () => {
          window.history.pushState(saved.state, '', saved.url);
        },
      });
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState, true);
    };
  }, [when, requestConfirmation]);

  const confirmNavigation = useCallback(
    (proceed: () => void) => {
      if (!whenRef.current || bypassRef.current) {
        proceed();
        return;
      }
      requestConfirmation({ proceed });
    },
    [requestConfirmation],
  );

  const stay = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setDialogOpen(false);
    pending?.cancel?.();
  }, []);

  const leave = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setDialogOpen(false);
    bypassRef.current = true;
    pending?.proceed();
  }, []);

  return { isDirty: when, dialogOpen, confirmNavigation, stay, leave };
}
