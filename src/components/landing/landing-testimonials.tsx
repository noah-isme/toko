import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

const testimonials = [
  { key: 'alya', author: 'Alya Rahman' },
  { key: 'bagus', author: 'Bagus Santoso' },
  { key: 'mita', author: 'Mita Lestari' },
] as const;

export function LandingTestimonials() {
  const t = useTranslations('common.landing.testimonials');
  return (
    <section className="space-y-8 rounded-[32px] border bg-muted/50 px-6 py-10 sm:px-10">
      <div className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">
          {t('eyebrow')}
        </p>
        <h2 className="text-3xl font-semibold">{t('title')}</h2>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground">{t('description')}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {testimonials.map((testimonial) => (
          <article
            key={testimonial.author}
            className="flex h-full flex-col gap-4 rounded-3xl border bg-background p-6 shadow-sm"
          >
            <div className="flex gap-1 text-primary" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="text-base text-muted-foreground">
              “{t(`items.${testimonial.key}.quote`)}”
            </p>
            <div className="pt-2">
              <p className="text-sm font-semibold text-foreground">{testimonial.author}</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t(`items.${testimonial.key}.role`)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
