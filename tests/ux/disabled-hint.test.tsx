import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { DisabledHint } from '@/shared/ui/DisabledHint';

describe('DisabledHint', () => {
  beforeEach(() => {
    (globalThis as { React?: typeof React }).React = React;
  });

  it('links buttons to their descriptive hints', () => {
    const hintId = 'disabled-reason';

    render(
      <div>
        <button type="button" aria-describedby={hintId} disabled>
          Proceed
        </button>
        <DisabledHint id={hintId} message="Lengkapi alamat pengiriman terlebih dahulu." />
      </div>,
    );

    const button = screen.getByRole('button', { name: 'Proceed' });
    const hint = screen.getByText('Lengkapi alamat pengiriman terlebih dahulu.');

    expect(button).toHaveAttribute('aria-describedby', hintId);
    expect(hint).toHaveAttribute('id', hintId);
    expect(hint).toHaveAttribute('role', 'note');
  });
});
