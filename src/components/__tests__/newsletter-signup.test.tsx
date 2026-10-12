import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NewsletterSignup } from '../newsletter-signup';

import { mockNewsletterSubscribers, resetMockNewsletter } from '@/mocks/handlers.newsletter';
import { NEWSLETTER_SUCCESS_MESSAGE } from '@/mocks/resolvers/newsletter';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

const { capturePosthogEvent } = vi.hoisted(() => ({ capturePosthogEvent: vi.fn() }));

vi.mock('@/shared/telemetry/posthog', () => ({ capturePosthogEvent }));

describe('NewsletterSignup', () => {
  afterEach(() => {
    capturePosthogEvent.mockClear();
    resetMockNewsletter();
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

  describe('against the default newsletter mock', () => {
    async function subscribe(email: string) {
      const user = userEvent.setup();
      render(<NewsletterSignup />);
      await user.type(screen.getByRole('textbox'), email);
      await user.click(screen.getByRole('button'));
    }

    it('shows the confirmation the API returns and records the subscriber', async () => {
      await subscribe('Rina.Subscriber@Example.com');

      expect(await screen.findByRole('alert')).toHaveTextContent(NEWSLETTER_SUCCESS_MESSAGE);
      expect(screen.getByRole('textbox')).toHaveValue('');
      expect([...mockNewsletterSubscribers]).toEqual(['rina.subscriber@example.com']);
    });

    it('treats subscribing an already-subscribed address as success', async () => {
      mockNewsletterSubscribers.add('rina@example.com');

      await subscribe('rina@example.com');

      expect(await screen.findByRole('alert')).toHaveTextContent(NEWSLETTER_SUCCESS_MESSAGE);
      expect(capturePosthogEvent).toHaveBeenCalledWith('newsletter_subscribed', { success: true });
      expect(mockNewsletterSubscribers.size).toBe(1);
    });

    it('shows the API validation error for an address the server rejects', async () => {
      const user = userEvent.setup();
      render(<NewsletterSignup />);
      // Passes the component's own check (has "@" and "."), fails the server's. Native
      // type="email" validation would block a click, so submit the form directly, as a
      // browser without constraint validation would.
      await user.type(screen.getByRole('textbox'), 'rina@@example.com');
      fireEvent.submit(screen.getByRole('button').closest('form')!);

      expect(await screen.findByRole('alert')).toHaveTextContent('invalid email address');
      expect(screen.getByRole('textbox')).toHaveValue('rina@@example.com');
      expect(capturePosthogEvent).not.toHaveBeenCalled();
      expect(mockNewsletterSubscribers.size).toBe(0);
    });
  });
});
