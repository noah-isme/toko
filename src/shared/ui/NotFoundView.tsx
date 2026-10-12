import Link from 'next/link';
import { useTranslations } from 'next-intl';

type NotFoundViewProps = {
  homeHref?: string;
  /** Link text; defaults to `notFound.home`. */
  homeLabel?: string;
};

/**
 * Server-safe "not found" body shared by the root, storefront and admin not-found files.
 * Non-async on purpose: `useTranslations` works in Server and Client Components alike.
 */
export function NotFoundView({ homeHref = '/', homeLabel }: NotFoundViewProps) {
  const t = useTranslations('notFound');

  return (
    <section
      aria-labelledby="not-found-heading"
      className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center"
    >
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 id="not-found-heading" className="text-2xl font-bold tracking-tight">
        {t('title')}
      </h1>
      <p className="text-sm text-muted-foreground">{t('description')}</p>
      <Link
        href={homeHref as never}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {homeLabel ?? t('home')}
      </Link>
    </section>
  );
}

export default NotFoundView;
