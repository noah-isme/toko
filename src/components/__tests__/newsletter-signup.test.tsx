import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NewsletterSignup } from '../newsletter-signup';

import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

const { capturePosthogEvent } = vi.hoisted(() => ({ capturePosthogEvent: vi.fn() }));

vi.mock('@/shared/telemetry/posthog', () => ({ capturePosthogEvent }));

describe('NewsletterSignup', () => {
  afterEach(() => {
    capturePosthogEvent.mockClear();
  });

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

  it('tracks a subscription without sending the email address to analytics', async () => {
    const email = 'rina.subscriber@example.com';
    server.use(
      http.post(apiPath('/newsletter/subscribe'), () =>
        HttpResponse.json({ data: { message: 'Subscribed' } }),
      ),
    );
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByRole('textbox'), email);
    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(capturePosthogEvent).toHaveBeenCalledTimes(1));
    const [event, properties] = capturePosthogEvent.mock.calls[0];
    expect(event).toBe('newsletter_subscribed');
    expect(properties).toEqual({ success: true });
    expect(JSON.stringify(capturePosthogEvent.mock.calls)).not.toContain(email);
    expect(JSON.stringify(capturePosthogEvent.mock.calls)).not.toContain('example.com');
  });
});
