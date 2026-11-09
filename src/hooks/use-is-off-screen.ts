'use client';

import { useEffect, useState } from 'react';

/**
 * True while `element` is outside the viewport. Pass the element from a callback ref
 * (`ref={setElement}`) so observation starts whenever it mounts. Stays false when
 * IntersectionObserver is unavailable (e.g. jsdom, very old browsers) so callers never act
 * on a missing signal.
 */
export function useIsOffScreen(element: Element | null) {
  const [offScreenElement, setOffScreenElement] = useState<Element | null>(null);

  useEffect(() => {
    if (!element || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry) {
        setOffScreenElement(entry.isIntersecting ? null : element);
      }
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [element]);

  return element !== null && offScreenElement === element;
}
