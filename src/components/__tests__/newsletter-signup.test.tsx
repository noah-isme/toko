import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { NewsletterSignup } from '../newsletter-signup';

describe('NewsletterSignup', () => {
  it('keeps the newsletter input markup stable during hydration', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<NewsletterSignup />);

    const serverInput = container.querySelector('input');
    expect(serverInput).not.toBeNull();
    expect(serverInput).not.toHaveAttribute('style');

    const serverInputMarkup = serverInput?.outerHTML;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;

    try {
      await act(async () => {
        root = hydrateRoot(container, <NewsletterSignup />);
      });

      expect(consoleError).not.toHaveBeenCalled();
      expect(container.querySelector('input')?.outerHTML).toBe(serverInputMarkup);
    } finally {
      await act(async () => {
        root?.unmount();
      });
      consoleError.mockRestore();
    }
  });
});
