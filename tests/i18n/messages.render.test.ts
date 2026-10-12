import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';

import enMessages from '../../messages/en.json';
import idMessages from '../../messages/id.json';

/**
 * Amendment M17: every migrated key renders exactly the recorded text. The `id` expectations
 * are the strings the UI showed before migration, so moving them into the catalog changes
 * nothing visible. Extend the table for each namespace a migration step touches.
 */
type Expectation = string | [text: string, values: Record<string, string | number>];

const EXPECTED: Record<'id' | 'en', Record<string, Expectation>> = {
  id: {
    'common.skipToContent': 'Lewati ke konten utama',
    'common.offline.restored': 'Connection restored',
    'common.offline.offline': 'You are currently offline. Some features may be unavailable.',
    'common.idleTimeout.title': 'Sesi akan berakhir',
    'common.idleTimeout.description': [
      'Anda tidak aktif selama beberapa menit. Sesi Anda akan berakhir dalam 1:59. Klik “Lanjutkan” untuk tetap masuk.',
      { countdown: '1:59' },
    ],
    'common.idleTimeout.logout': 'Keluar',
    'common.idleTimeout.extend': 'Lanjutkan',
    'common.idleTimeout.processing': 'Memproses...',
    'common.cookieConsent.openPreferences': 'Cookie preferences',
    'common.cookieConsent.bannerTitle': 'We value your privacy',
    'common.cookieConsent.bannerDescription':
      'We use cookies to enhance your experience, analyze traffic, and personalize content.',
    'common.cookieConsent.privacyPolicy': 'Privacy Policy',
    'common.cookieConsent.termsOfService': 'Terms of Service',
    'common.cookieConsent.acceptAll': 'Accept All',
    'common.cookieConsent.rejectAll': 'Reject All',
    'common.cookieConsent.customize': 'Customize',
    'common.cookieConsent.savePreferences': 'Save Preferences',
    'common.cookieConsent.dialogTitle': 'Cookie Preferences',
    'common.cookieConsent.dialogDescription':
      'Customize which cookies and tracking technologies you allow us to use.',
    'common.cookieConsent.footnote':
      'You can change your preferences at any time by clicking the cookie icon.',
    'common.cookieConsent.necessary.label': 'Necessary cookies',
    'common.cookieConsent.necessary.description':
      'Required for the website to function properly. Cannot be disabled.',
    'common.cookieConsent.necessary.switchLabel': 'Necessary cookies (always enabled)',
    'common.cookieConsent.analytics.label': 'Analytics cookies',
    'common.cookieConsent.analytics.description':
      'Help us understand how visitors interact with our website.',
    'common.cookieConsent.marketing.label': 'Marketing cookies',
    'common.cookieConsent.marketing.description':
      'Used to deliver personalized advertisements and track ad performance.',
    'common.cookieConsent.preferences.label': 'Preference cookies',
    'common.cookieConsent.preferences.description':
      'Remember your preferences like language, theme, and region.',
    'nav.language.label': 'Pilih bahasa',
    'nav.language.options.id': 'Bahasa Indonesia',
    'nav.language.options.en': 'English',
    'nav.links.home': 'Home',
    'nav.links.products': 'Products',
    'nav.links.featured': 'Featured',
    'nav.links.cart': 'Cart',
    'nav.links.orders': 'Orders',
    'nav.account.account': 'Account',
    'nav.account.profile': 'Profile',
    'nav.account.orders': 'Orders',
    'nav.account.notifications': 'Notifications',
    'nav.account.addresses': 'Addresses',
    'nav.account.favorites': 'Favorites',
    'nav.account.logout': 'Logout',
    'nav.account.signIn': 'Sign in',
    'nav.mobile.home': 'Home',
    'nav.mobile.products': 'Produk',
    'nav.mobile.cart': 'Cart',
    'nav.mobile.favorites': 'Favorit',
    'nav.mobile.account': 'Akun',
    'footer.quickLinks.title': 'Quick Links',
    'footer.quickLinks.products': 'Products',
    'footer.quickLinks.about': 'About Us',
    'footer.quickLinks.contact': 'Contact',
    'footer.quickLinks.faq': 'FAQ',
    'footer.legal.title': 'Legal',
    'footer.legal.privacy': 'Privacy Policy',
    'footer.legal.terms': 'Terms of Service',
    'footer.legal.shipping': 'Shipping Policy',
    'footer.legal.returns': 'Returns',
    'footer.copyright': ['© 2026 toko. All rights reserved.', { year: 2026 }],
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
    'footer.newsletter.title': 'Subscribe to our newsletter',
    'footer.newsletter.description': 'Get the latest updates on new products and upcoming sales',
    'footer.newsletter.placeholder': 'Enter your email',
    'footer.newsletter.placeholderDisabled': 'Subscription temporarily disabled',
    'footer.newsletter.emailLabel': 'Email address',
    'footer.newsletter.submit': 'Subscribe',
    'footer.newsletter.submitting': 'Subscribing...',
    'footer.newsletter.subscribed': 'Subscribed',
    'footer.newsletter.invalidEmail': 'Silakan masukkan alamat email yang valid.',
    'footer.newsletter.success': 'Terima kasih telah berlangganan buletin kami!',
    'footer.newsletter.error': 'Terjadi kesalahan. Silakan coba lagi.',
    'footer.newsletter.unavailable': 'Newsletter subscription is currently unavailable.',
    'footer.newsletter.consent':
      'By subscribing, you agree to our Privacy Policy and consent to receive updates from our company.',
    'errors.route.title': 'Terjadi kesalahan',
    'errors.route.description': 'Terjadi kesalahan. Coba lagi.',
    'errors.route.adminDescription': 'Halaman admin gagal dimuat. Coba lagi.',
    'errors.route.digest': ['Kode: abc123', { digest: 'abc123' }],
    'errors.route.retry': 'Coba lagi',
    'notFound.title': 'Halaman tidak ditemukan',
    'notFound.description': 'Halaman yang Anda cari tidak ada atau sudah dipindahkan.',
    'notFound.home': 'Kembali ke beranda',
    'notFound.allProducts': 'Lihat semua produk',
  },
  en: {
    'common.skipToContent': 'Skip to main content',
    'common.offline.restored': 'Connection restored',
    'common.offline.offline': 'You are currently offline. Some features may be unavailable.',
    'common.idleTimeout.title': 'Your session is about to expire',
    'common.idleTimeout.description': [
      'You have been inactive for a few minutes. Your session will end in 1:59. Click “Continue” to stay signed in.',
      { countdown: '1:59' },
    ],
    'common.idleTimeout.logout': 'Sign out',
    'common.idleTimeout.extend': 'Continue',
    'common.idleTimeout.processing': 'Processing...',
    'common.cookieConsent.openPreferences': 'Cookie preferences',
    'common.cookieConsent.bannerTitle': 'We value your privacy',
    'common.cookieConsent.bannerDescription':
      'We use cookies to enhance your experience, analyze traffic, and personalize content.',
    'common.cookieConsent.privacyPolicy': 'Privacy Policy',
    'common.cookieConsent.termsOfService': 'Terms of Service',
    'common.cookieConsent.acceptAll': 'Accept All',
    'common.cookieConsent.rejectAll': 'Reject All',
    'common.cookieConsent.customize': 'Customize',
    'common.cookieConsent.savePreferences': 'Save Preferences',
    'common.cookieConsent.dialogTitle': 'Cookie Preferences',
    'common.cookieConsent.dialogDescription':
      'Customize which cookies and tracking technologies you allow us to use.',
    'common.cookieConsent.footnote':
      'You can change your preferences at any time by clicking the cookie icon.',
    'common.cookieConsent.necessary.label': 'Necessary cookies',
    'common.cookieConsent.necessary.description':
      'Required for the website to function properly. Cannot be disabled.',
    'common.cookieConsent.necessary.switchLabel': 'Necessary cookies (always enabled)',
    'common.cookieConsent.analytics.label': 'Analytics cookies',
    'common.cookieConsent.analytics.description':
      'Help us understand how visitors interact with our website.',
    'common.cookieConsent.marketing.label': 'Marketing cookies',
    'common.cookieConsent.marketing.description':
      'Used to deliver personalized advertisements and track ad performance.',
    'common.cookieConsent.preferences.label': 'Preference cookies',
    'common.cookieConsent.preferences.description':
      'Remember your preferences like language, theme, and region.',
    'nav.language.label': 'Choose language',
    'nav.language.options.id': 'Bahasa Indonesia',
    'nav.language.options.en': 'English',
    'nav.links.home': 'Home',
    'nav.links.products': 'Products',
    'nav.links.featured': 'Featured',
    'nav.links.cart': 'Cart',
    'nav.links.orders': 'Orders',
    'nav.account.account': 'Account',
    'nav.account.profile': 'Profile',
    'nav.account.orders': 'Orders',
    'nav.account.notifications': 'Notifications',
    'nav.account.addresses': 'Addresses',
    'nav.account.favorites': 'Favorites',
    'nav.account.logout': 'Logout',
    'nav.account.signIn': 'Sign in',
    'nav.mobile.home': 'Home',
    'nav.mobile.products': 'Products',
    'nav.mobile.cart': 'Cart',
    'nav.mobile.favorites': 'Favorites',
    'nav.mobile.account': 'Account',
    'footer.quickLinks.title': 'Quick Links',
    'footer.quickLinks.products': 'Products',
    'footer.quickLinks.about': 'About Us',
    'footer.quickLinks.contact': 'Contact',
    'footer.quickLinks.faq': 'FAQ',
    'footer.legal.title': 'Legal',
    'footer.legal.privacy': 'Privacy Policy',
    'footer.legal.terms': 'Terms of Service',
    'footer.legal.shipping': 'Shipping Policy',
    'footer.legal.returns': 'Returns',
    'footer.copyright': ['© 2026 toko. All rights reserved.', { year: 2026 }],
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
    'footer.newsletter.title': 'Subscribe to our newsletter',
    'footer.newsletter.description': 'Get the latest updates on new products and upcoming sales',
    'footer.newsletter.placeholder': 'Enter your email',
    'footer.newsletter.placeholderDisabled': 'Subscription temporarily disabled',
    'footer.newsletter.emailLabel': 'Email address',
    'footer.newsletter.submit': 'Subscribe',
    'footer.newsletter.submitting': 'Subscribing...',
    'footer.newsletter.subscribed': 'Subscribed',
    'footer.newsletter.invalidEmail': 'Please enter a valid email address.',
    'footer.newsletter.success': 'Thank you for subscribing to our newsletter!',
    'footer.newsletter.error': 'Something went wrong. Please try again.',
    'footer.newsletter.unavailable': 'Newsletter subscription is currently unavailable.',
    'footer.newsletter.consent':
      'By subscribing, you agree to our Privacy Policy and consent to receive updates from our company.',
    'errors.route.title': 'Something went wrong',
    'errors.route.description': 'Something went wrong. Please try again.',
    'errors.route.adminDescription': 'The admin page failed to load. Please try again.',
    'errors.route.digest': ['Code: abc123', { digest: 'abc123' }],
    'errors.route.retry': 'Try again',
    'notFound.title': 'Page not found',
    'notFound.description': 'The page you are looking for does not exist or has been moved.',
    'notFound.home': 'Back to home',
    'notFound.allProducts': 'View all products',
  },
};

/** Leaf key paths of the namespaces that have been migrated so far. */
function leafKeys(node: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? [keyPath]
      : leafKeys(value as Record<string, unknown>, keyPath);
  });
}

const CATALOGS = { id: idMessages, en: enMessages };

describe.each(['id', 'en'] as const)('%s catalog renders the recorded text', (locale) => {
  const t = createTranslator({ locale, messages: CATALOGS[locale] });

  it('covers every key in the catalog', () => {
    expect(leafKeys(CATALOGS[locale]).sort()).toEqual(Object.keys(EXPECTED[locale]).sort());
  });

  it.each(Object.entries(EXPECTED[locale]))('%s', (key, expectation) => {
    const [expected, values] = typeof expectation === 'string' ? [expectation, {}] : expectation;
    // `markup` renders rich-text tags (e.g. <strong>) to their plain text, which is what the
    // user reads; plain messages render the same as with `t()`.
    const rendered = t.markup(
      key as never,
      { ...values, strong: (chunks: string) => chunks } as never,
    );
    expect(rendered).toBe(expected);
  });
});
