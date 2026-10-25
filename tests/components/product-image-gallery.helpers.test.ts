import { describe, expect, it } from 'vitest';

import { galleryImages } from '@/components/product-image-gallery';

describe('galleryImages', () => {
  it('puts the main image first without repeating it', () => {
    expect(galleryImages('/c.jpg', ['/c.jpg', '/a.jpg', '/b.jpg'])).toEqual([
      '/c.jpg',
      '/a.jpg',
      '/b.jpg',
    ]);
    expect(galleryImages('/t.jpg', ['/a.jpg', '/t.jpg'])).toEqual(['/t.jpg', '/a.jpg']);
  });

  it('handles a missing main image, blanks and missing lists', () => {
    expect(galleryImages(undefined, ['/a.jpg', '', '/a.jpg'])).toEqual(['/a.jpg']);
    expect(galleryImages('/t.jpg', undefined)).toEqual(['/t.jpg']);
    expect(galleryImages('', [])).toEqual([]);
  });
});
