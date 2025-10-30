'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

type FocusTarget = HTMLElement | null;

function focusElement(element: FocusTarget) {
  if (!element) {
    return;
  }

  const previousTabIndex = element.getAttribute('tabindex');
  if (previousTabIndex === null) {
    element.setAttribute('tabindex', '-1');
  }

  element.focus({ preventScroll: false });

  if (previousTabIndex === null) {
    element.addEventListener(
      'blur',
      () => {
        element.removeAttribute('tabindex');
      },
      { once: true },
    );
  }
}

export function useRouteFocus() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      const mainContent = document.getElementById('main-content');
      const heading = mainContent?.querySelector('h1');

      if (mainContent) {
        mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      if (heading instanceof HTMLElement) {
        focusElement(heading);
        return;
      }

      focusElement(mainContent ?? document.body);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()]);
}

export function RouteFocusHandler() {
  useRouteFocus();
  return null;
}
