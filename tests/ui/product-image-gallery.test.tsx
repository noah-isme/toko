import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ProductImageGallery } from '@/components/product-image-gallery';

const images = ['/a.jpg', '/b.jpg', '/c.jpg'];

function swipe(el: Element, startX: number, endX: number) {
  fireEvent.touchStart(el, { changedTouches: [{ clientX: startX }] });
  fireEvent.touchEnd(el, { changedTouches: [{ clientX: endX }] });
}

function counter() {
  // The "1 / 3" overlay reflects the currently selected image.
  return screen.getByText(/\d+ \/ \d+/).textContent;
}

describe('ProductImageGallery swipe gestures', () => {
  beforeEach(() => {
    (globalThis as { React?: typeof React }).React = React;
  });

  it('advances to the next image on a left swipe past the threshold', () => {
    render(<ProductImageGallery images={images} productName="Widget" />);
    const stage = screen.getByRole('button', { name: /zoom in/i });

    swipe(stage, 200, 120); // dx = -80

    expect(counter()).toBe('2 / 3');
  });

  it('goes to the previous image on a right swipe past the threshold', () => {
    render(<ProductImageGallery images={images} productName="Widget" />);
    const stage = screen.getByRole('button', { name: /zoom in/i });

    swipe(stage, 120, 200); // dx = +80, wraps from first to last

    expect(counter()).toBe('3 / 3');
  });

  it('ignores swipes shorter than the threshold', () => {
    render(<ProductImageGallery images={images} productName="Widget" />);
    const stage = screen.getByRole('button', { name: /zoom in/i });

    swipe(stage, 200, 180); // dx = -20

    expect(counter()).toBe('1 / 3');
  });

  it('does not change the image for a single-image gallery', () => {
    render(<ProductImageGallery images={['/only.jpg']} productName="Widget" />);
    const stage = screen.getByRole('button', { name: /zoom in/i });

    // No counter is shown for a single image; a swipe must not throw or advance.
    swipe(stage, 200, 100);

    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
  });
});
