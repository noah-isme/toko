import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const captureSentryException = vi.hoisted(() => vi.fn());

vi.mock('@/shared/telemetry/sentry', () => ({ captureSentryException }));
vi.mock('@/shared/ui/NotFoundView', () => ({ NotFoundView: () => null }));
vi.mock('./globals.css', () => ({}));

import AdminSegmentError from '@/app/(admin)/error';
import StorefrontError from '@/app/(storefront)/error';
import GlobalError from '@/app/global-error';

function makeError(message = 'boom', digest?: string) {
  const error = new Error(message) as Error & { digest?: string };
  error.digest = digest;
  return error;
}

class FakeNextBoundary extends React.Component<
  { children: React.ReactNode },
  { error: (Error & { digest?: string }) | null }
> {
  state = { error: null as (Error & { digest?: string }) | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <StorefrontError error={this.state.error} retry={() => this.setState({ error: null })} />
      );
    }
    return this.props.children;
  }
}

describe('error boundary files', () => {
  beforeEach(() => {
    captureSentryException.mockClear();
  });

  it('storefront error shows the digest, retries and reports once', () => {
    const retry = vi.fn();
    const error = makeError('boom', 'abc123');
    const { rerender } = render(<StorefrontError error={error} retry={retry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Terjadi kesalahan');
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(retry).toHaveBeenCalledTimes(1);

    rerender(<StorefrontError error={error} retry={retry} />);
    expect(captureSentryException).toHaveBeenCalledTimes(1);
    expect(captureSentryException).toHaveBeenCalledWith(error, {
      tags: { boundary: 'storefront' },
    });
  });

  it('admin error retries and reports with the admin tag', () => {
    const retry = vi.fn();
    const error = makeError('admin boom', 'adm1');
    render(<AdminSegmentError error={error} retry={retry} />);

    expect(screen.getByText(/adm1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(captureSentryException).toHaveBeenCalledTimes(1);
    expect(captureSentryException).toHaveBeenCalledWith(error, { tags: { boundary: 'admin' } });
  });

  it('global error renders bilingual text, retries and reports once', () => {
    const retry = vi.fn();
    const error = makeError('fatal', 'g1');
    // <html> inside a div triggers a DOM nesting warning in jsdom; it is irrelevant here.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<GlobalError error={error} retry={retry} />);
    spy.mockRestore();

    expect(screen.getByRole('heading', { name: 'Terjadi kesalahan' })).toBeInTheDocument();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.getByText(/g1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Coba lagi/ }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(captureSentryException).toHaveBeenCalledTimes(1);
    expect(captureSentryException).toHaveBeenCalledWith(error, { tags: { boundary: 'global' } });
  });

  it('a page that throws shows the storefront fallback while the layout chrome stays', () => {
    const Thrower = () => {
      throw new Error('page exploded');
    };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mirrors Next: the segment error boundary sits inside layout.tsx, so the navbar is outside it.
    render(
      <div>
        <nav aria-label="Navbar">navbar</nav>
        <FakeNextBoundary>
          <Thrower />
        </FakeNextBoundary>
      </div>,
    );
    consoleSpy.mockRestore();

    expect(screen.getByRole('navigation', { name: 'Navbar' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Terjadi kesalahan');
  });
});
