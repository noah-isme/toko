import { ArrowRight, Gift } from 'lucide-react';
import Link from 'next/link';

import { NewsletterSignup } from '@/components/newsletter-signup';
import { Button } from '@/components/ui/button';

export function LandingCTA() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-12 text-white sm:px-12 sm:py-16">
      {/* Subtle pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15), transparent 40%)',
        }}
      />

      <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
        {/* Left: CTA */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium">
            <Gift className="h-4 w-4" />
            <span>Promo Member Baru</span>
          </div>

          <h2 className="text-3xl font-bold sm:text-4xl">
            Daftar Sekarang, Dapat Voucher Rp50.000
          </h2>

          <p className="text-lg text-white/80">
            Buat akun gratis dan nikmati diskon eksklusif, promo khusus member, dan notifikasi
            produk favorit.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg" className="bg-white text-violet-600 hover:bg-white/90">
              <Link href="/register">
                Daftar Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/login">Sudah Punya Akun</Link>
            </Button>
          </div>
        </div>

        {/* Right: Newsletter */}
        <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
          <div className="mb-4 text-center">
            <h3 className="text-xl font-semibold">Tetap Update</h3>
            <p className="mt-1 text-sm text-white/70">
              Dapatkan info promo dan produk terbaru langsung ke email Anda
            </p>
          </div>
          <NewsletterSignup />
        </div>
      </div>
    </section>
  );
}
