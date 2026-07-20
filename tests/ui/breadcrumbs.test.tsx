import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';

describe('Breadcrumbs', () => {
  beforeEach(() => {
    (globalThis as { React?: typeof React }).React = React;
  });

  it('renders a labelled nav with links for all but the last item', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Beranda', href: '/' },
          { label: 'Produk', href: '/products' },
          { label: 'Sepatu Lari' },
        ]}
      />,
    );

    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    const links = within(nav).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(['Beranda', 'Produk']);
    expect(links[0]).toHaveAttribute('href', '/');
    expect(links[1]).toHaveAttribute('href', '/products');
  });

  it('marks the last item as the current page and does not link it', () => {
    render(<Breadcrumbs items={[{ label: 'Beranda', href: '/' }, { label: 'Sepatu Lari' }]} />);

    const current = screen.getByText('Sepatu Lari');
    expect(current).toHaveAttribute('aria-current', 'page');
    // The current page must not be a link.
    expect(screen.queryByRole('link', { name: 'Sepatu Lari' })).not.toBeInTheDocument();
  });

  it('renders the last item as text even when an href is supplied', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Beranda', href: '/' },
          { label: 'Akun', href: '/account' },
        ]}
      />,
    );

    // '/account' is the last item: rendered as current text, not a link.
    expect(screen.queryByRole('link', { name: 'Akun' })).not.toBeInTheDocument();
    expect(screen.getByText('Akun')).toHaveAttribute('aria-current', 'page');
  });

  it('returns nothing when there are no items', () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
