import { CreditCard, ShieldCheck, RotateCcw, Truck } from 'lucide-react';

const features = [
  {
    title: 'Gratis Ongkir Rp100rb+',
    description: 'Belanja minimal Rp100.000 gratis pengiriman ke seluruh daerah.',
    icon: Truck,
  },
  {
    title: 'Garansi 100% Original',
    description: 'Semua barang terjamin keasliannya langsung dari brand resmi.',
    icon: ShieldCheck,
  },
  {
    title: 'Pembayaran Lengkap',
    description: 'Transfer bank, e-wallet, kartu kredit, hingga COD tanpa ribet.',
    icon: CreditCard,
  },
  {
    title: 'Pengembalian 7 Hari',
    description: 'Proses klaim retur cepat & mudah jika produk tidak sesuai.',
    icon: RotateCcw,
  },
];

export function LandingFeatures() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">
            Keunggulan Layanan Toko
          </h2>
          <p className="text-xs text-muted-foreground">
            Komitmen kami untuk memberikan pengalaman belanja terbaik untuk Anda
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="hover:shadow-xs group rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-primary/50"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-primary">
              <feature.icon className="h-4 w-4" />
            </div>
            <h3 className="mb-1 text-sm font-bold text-foreground">{feature.title}</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
