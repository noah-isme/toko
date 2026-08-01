import { ShieldCheck, Sparkles, Truck } from 'lucide-react';
import type { ReactNode } from 'react';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-[0_24px_70px_-42px_rgba(43,32,22,0.55)] lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative hidden min-h-[610px] overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-[hsl(40_56%_63%_/_0.18)] blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full border border-white/15" />
        <div className="relative flex items-center gap-2 text-sm font-bold tracking-wide">
          <span className="grid h-8 w-8 place-items-center rounded-full border border-white/25 text-lg">
            t
          </span>
          toko
        </div>
        <div className="relative my-auto max-w-sm space-y-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[hsl(40_65%_77%)]">
            Belanja yang terasa personal
          </p>
          <h2 className="font-display text-5xl leading-[0.95]">Objects chosen with intention.</h2>
          <p className="text-white/72 text-sm leading-7">
            Temukan koleksi pilihan, pengiriman yang dapat diandalkan, dan pengalaman belanja yang
            tenang.
          </p>
        </div>
        <div className="text-white/78 relative space-y-4 border-t border-white/15 pt-6 text-sm">
          <p className="flex items-center gap-3">
            <ShieldCheck className="h-4 w-4 text-[hsl(40_65%_77%)]" /> Produk pilihan & pembayaran
            aman
          </p>
          <p className="flex items-center gap-3">
            <Truck className="h-4 w-4 text-[hsl(40_65%_77%)]" /> Pengiriman ke seluruh Indonesia
          </p>
        </div>
      </aside>
      <div className="p-6 sm:p-10 lg:p-14">
        <div className="mb-8 space-y-3">
          <p className="eyebrow flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[hsl(35_46%_42%)]" /> {eyebrow}
          </p>
          <h1 className="font-display text-4xl leading-none text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}
