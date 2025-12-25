import { CreditCard, Package, RotateCcw, Truck } from 'lucide-react';

const features = [
  {
    title: 'Gratis Ongkir',
    description: 'Belanja minimal Rp100.000 gratis ongkir ke seluruh Indonesia.',
    icon: Truck,
    color: 'bg-emerald-500/10 text-emerald-500',
  },
  {
    title: 'Garansi Resmi',
    description: 'Semua produk dijamin original dengan garansi resmi dari brand.',
    icon: Package,
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    title: 'Pembayaran Aman',
    description: 'Transfer bank, e-wallet, kartu kredit, hingga COD tersedia.',
    icon: CreditCard,
    color: 'bg-violet-500/10 text-violet-500',
  },
  {
    title: 'Pengembalian Mudah',
    description: 'Tidak cocok? Kembalikan dalam 7 hari tanpa ribet.',
    icon: RotateCcw,
    color: 'bg-amber-500/10 text-amber-500',
  },
];

export function LandingFeatures() {
  return (
    <section className="space-y-10">
      <div className="text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Kenapa Belanja di Toko?</h2>
        <p className="mt-2 text-muted-foreground">Pengalaman belanja online yang nyaman dan aman</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="group rounded-2xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
          >
            <div
              className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}
            >
              <feature.icon className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
