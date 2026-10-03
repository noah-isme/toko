import Link from 'next/link';

type NotFoundViewProps = {
  homeHref?: string;
  homeLabel?: string;
};

/** Server-safe "not found" body shared by the root, storefront and admin not-found files. */
export function NotFoundView({
  homeHref = '/',
  homeLabel = 'Kembali ke beranda',
}: NotFoundViewProps) {
  return (
    <section
      aria-labelledby="not-found-heading"
      className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center"
    >
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 id="not-found-heading" className="text-2xl font-bold tracking-tight">
        Halaman tidak ditemukan
      </h1>
      <p className="text-sm text-muted-foreground">
        Halaman yang Anda cari tidak ada atau sudah dipindahkan.
      </p>
      <Link
        href={homeHref as never}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {homeLabel}
      </Link>
    </section>
  );
}

export default NotFoundView;
