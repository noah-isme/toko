import { describe, expect, it } from 'vitest';

import enMessages from '../../messages/en.json';
import idMessages from '../../messages/id.json';

/**
 * Storefront copy in `messages/id.json` must be Indonesian. A value identical to
 * the English catalog is only allowed for loanwords Indonesian shoppers use as-is,
 * brand and language names, and pure formatting patterns. The admin namespace is
 * out of scope here.
 */
const SHARED_WITH_ENGLISH = [
  'account.invoice.email',
  'account.invoice.subtotal',
  'account.invoice.total',
  'account.loyalty.history.filter',
  'account.loyalty.history.reference',
  'account.loyalty.history.types.bonus',
  'account.loyalty.rewards.types.voucher',
  'account.orderDetail.status',
  'account.orderDetail.subtotal',
  'account.orderDetail.total',
  'account.profile.fields.email',
  'account.profile.security.ip',
  'account.push.card.endpoint',
  'account.push.card.status',
  'account.push.card.types.flash_sale.label',
  'auth.fields.email',
  'auth.fields.password',
  'cart.drawer.subtotal',
  'cart.view.summary.total',
  'catalog.chips.rating',
  'catalog.comparePage.rows.rating',
  'catalog.listing.chips.discount',
  'checkout.header.breadcrumbCheckout',
  'checkout.header.title',
  'checkout.notes.counter',
  'checkout.payment.methods.ewallet_dana.label',
  'checkout.payment.methods.ewallet_gopay.label',
  'checkout.payment.methods.ewallet_ovo.label',
  'checkout.payment.methods.virtual_account.label',
  'checkout.review.instructions.accountFallback',
  'checkout.review.instructions.bankFallback',
  'checkout.summary.subtotal',
  'checkout.summary.total',
  'common.landing.testimonials.items.mita.role',
  'common.theme.normal',
  'common.ui.panel',
  'footer.legal.title',
  'nav.language.options.en',
  'nav.language.options.id',
  'product.qa.item.admin',
  'product.reviews.form.rating',
  'product.reviews.item.ratingOutOf',
  'product.share.platforms.facebook',
  'product.share.platforms.twitter',
];

type Catalog = { [key: string]: string | Catalog };

function leaves(node: Catalog, prefix = ''): Array<[string, string]> {
  return Object.entries(node).flatMap(([key, value]) => {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [[keyPath, value]] : leaves(value, keyPath);
  });
}

function lookup(node: Catalog, keyPath: string): string | undefined {
  const value = keyPath
    .split('.')
    .reduce<
      string | Catalog | undefined
    >((current, key) => (typeof current === 'object' ? current[key] : undefined), node);
  return typeof value === 'string' ? value : undefined;
}

describe('Indonesian storefront catalog', () => {
  const storefront = leaves(idMessages as Catalog).filter(([key]) => !key.startsWith('admin.'));

  it('does not copy English storefront text into id.json', () => {
    const untranslated = storefront
      .filter(([key, value]) => lookup(enMessages as Catalog, key) === value)
      .map(([key]) => key)
      .filter((key) => !SHARED_WITH_ENGLISH.includes(key));
    expect(untranslated).toEqual([]);
  });

  it('separates words around rich-text tags', () => {
    // e.g. "atau<register>daftar</register>" renders as "ataudaftar".
    const glued = storefront
      .filter(([, value]) => /[\p{L}\p{N}]<[a-z]+>|<\/[a-z]+>[\p{L}\p{N}]/u.test(value))
      .map(([key]) => key);
    expect(glued).toEqual([]);
  });
});
