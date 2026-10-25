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

const LEAVE_EVENT = 'toko:unsaved-changes-leave';

/** A dirty form's confirmation step: asks, then calls `next` only if the user discards. */
type LeaveStep = (next: () => void) => void;

type LeaveEvent = CustomEvent<{ steps: LeaveStep[] }>;

/**
 * For navigation started outside a guarded form (e.g. sign-out in the admin shell):
 * runs `proceed` right away when no mounted form has unsaved changes. Otherwise every
 * dirty form asks in turn, and `proceed` runs only once all of them were discarded.
 */
export function confirmLeaveUnsaved(proceed: () => void): void {
  const steps: LeaveStep[] = [];
  window.dispatchEvent(new CustomEvent(LEAVE_EVENT, { detail: { steps } }) as LeaveEvent);
  const run = (index: number) => {
    if (index >= steps.length) proceed();
    else steps[index](() => run(index + 1));
  };
  run(0);
}

/** Same path and query (only the hash may differ). */
function samePage(a: string, b: string): boolean {
  try {
    const left = new URL(a);
    const right = new URL(b);
    return left.pathname === right.pathname && left.search === right.search;
  } catch {
    return false;
  }
}

/**
 * Warns before unsaved form changes are lost.
 *
 * While `when` is true it intercepts:
 * - tab close, reload and cross-origin navigation (`beforeunload`, browser-native prompt);
 * - in-app link clicks (`<Link>` and plain same-origin `<a>`), caught in the capture phase
 *   before Next.js handles them;
 * - browser back/forward (`popstate`), caught before the app router's own listener;
 * - anything routed through `confirmNavigation`, or `confirmLeaveUnsaved` from outside the form.
 *
 * In-app cases open the dialog rendered by `UnsavedChangesDialog`. Pass `when = false`
 * (e.g. reset the form baseline) after a successful save so the guard stays quiet.
 *
 * After Discard, in-app paths re-arm right away if the form is still mounted, but tab
 * close stays quiet until the form is clean again or unmounts, so a full-page fallback
 * of the confirmed navigation does not ask a second time.
 *
 * Known gaps: the history entry restored on "Keep editing" after back/forward is captured
 * when the form first becomes dirty, so a later Next.js `replaceState` (router.refresh,
 * search-param updates) is not reflected in it. Programmatic navigation started outside
 * the form must go through `confirmLeaveUnsaved` (as sign-out does) to be intercepted.
 */
export function useUnsavedChangesGuard(when: boolean): UnsavedChangesGuard {
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingRef = useRef<PendingNavigation | null>(null);
  /** Set once the user chose to leave, so the navigation they confirmed is let through. */
  const bypassRef = useRef(false);
  /**
   * Also set on Discard, but only cleared when the form becomes clean or unmounts: client
   * navigation is asynchronous and may fall back to a full page load, whose `beforeunload`
   * must not ask again after the user already chose to discard.
   */
  const discardedRef = useRef(false);
  const rearmTimerRef = useRef<number | undefined>(undefined);
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
      discardedRef.current = false;
      return;
    }

    // The entry to restore if the user backs out of a back/forward navigation.
    const saved = { state: window.history.state as unknown, url: window.location.href };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (bypassRef.current || discardedRef.current) return;
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
      // Hash-only entries of this page keep the form mounted: nothing to lose.
      if (samePage(window.location.href, saved.url)) return;
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

    const onLeaveRequest = (event: Event) => {
      if (bypassRef.current) return;
      (event as LeaveEvent).detail.steps.push((next) => requestConfirmation({ proceed: next }));
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener(LEAVE_EVENT, onLeaveRequest);
    window.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener(LEAVE_EVENT, onLeaveRequest);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState, true);
    };
  }, [when, requestConfirmation]);

  useEffect(() => () => window.clearTimeout(rearmTimerRef.current), []);

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
    discardedRef.current = true;
    pending?.proceed();
    // Link clicks, history replays and `router.push` reach the router synchronously inside
    // `proceed`. If the form is still mounted afterwards (the router ignored a replayed
    // same-document entry, or only the query changed), it is still dirty, so re-arm the
    // in-app paths (clicks, back/forward, leave requests). Tab close stays quiet until the
    // form is clean again or unmounts (see `discardedRef`).
    window.clearTimeout(rearmTimerRef.current);
    rearmTimerRef.current = window.setTimeout(() => {
      bypassRef.current = false;
    }, 0);
  }, []);

  return { isDirty: when, dialogOpen, confirmNavigation, stay, leave };
}
