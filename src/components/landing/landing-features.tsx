import { CreditCard, ShieldCheck, RotateCcw, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';

const features = [
  { key: 'shipping', icon: Truck },
  { key: 'original', icon: ShieldCheck },
  { key: 'payment', icon: CreditCard },
  { key: 'returns', icon: RotateCcw },
] as const;

export function LandingFeatures() {
  const t = useTranslations('common.landing.features');
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">{t('title')}</h2>
          <p className="text-xs text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <article
            key={feature.key}
            className="hover:shadow-xs group rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-primary/50"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-primary">
              <feature.icon className="h-4 w-4" />
            </div>
            <h3 className="mb-1 text-sm font-bold text-foreground">{t(`${feature.key}.title`)}</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t(`${feature.key}.description`)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
