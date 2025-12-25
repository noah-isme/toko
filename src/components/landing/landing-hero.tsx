import { ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-16 text-white sm:px-12 sm:py-24">
      {/* Gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 30% 0%, rgba(139, 92, 246, 0.3), transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(59, 130, 246, 0.2), transparent 50%)',
        }}
      />

      {/* Content */}
      <div className="relative mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
          <ShoppingBag className="h-4 w-4" />
          <span>Selamat datang di Toko</span>
        </div>

        {/* Headline */}
        <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Belanja Lebih Mudah,
          <br />
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Harga Lebih Hemat
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-10 max-w-2xl text-lg text-white/70 sm:text-xl">
          Temukan ribuan produk berkualitas dengan harga terbaik. Gratis ongkir, garansi resmi, dan
          pembayaran aman.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="w-full bg-white text-slate-900 hover:bg-white/90 sm:w-auto"
          >
            <Link href="/products">
              Mulai Belanja
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full border-white/30 bg-transparent text-white hover:bg-white/10 sm:w-auto"
          >
            <Link href="/register">Daftar Gratis</Link>
          </Button>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/50">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Gratis Ongkir</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-400" />
            <span>Garansi Resmi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-violet-400" />
            <span>Pembayaran Aman</span>
          </div>
        </div>
      </div>
    </section>
  );
}
