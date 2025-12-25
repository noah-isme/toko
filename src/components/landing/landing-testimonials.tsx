import { Star } from 'lucide-react';

const testimonials = [
  {
    quote:
      'Landing page toko bikin kampanye musiman kami terasa sinematik tanpa perlu tim dev tambahan. Modul hero mereka tinggal plug-in.',
    author: 'Alya Rahman',
    role: 'Creative Director, Kinara Atelier',
  },
  {
    quote:
      'Performance tetap tinggi walau kami taruh video, carousel, dan rekomendasi dinamis sekaligus. Conversion naik 21% yoy.',
    author: 'Bagus Santoso',
    role: 'Head of Digital, Kolektif',
  },
  {
    quote:
      'Toko memberi bahasa visual yang konsisten untuk semua brand di marketplace kami dan mengurangi waktu live kampanye hingga setengahnya.',
    author: 'Mita Lestari',
    role: 'VP Merchandising, Orbit Supply',
  },
];

export function LandingTestimonials() {
  return (
    <section className="space-y-8 rounded-[32px] border bg-muted/50 px-6 py-10 sm:px-10">
      <div className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">
          Cerita partner
        </p>
        <h2 className="text-3xl font-semibold">Brand yang tumbuh bersama toko</h2>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground">
          Pemilik brand independen sampai retailer enterprise memakai landing page toko untuk
          merilis koleksi baru tanpa drama.
        </p>
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
            <p className="text-base text-muted-foreground">“{testimonial.quote}”</p>
            <div className="pt-2">
              <p className="text-sm font-semibold text-foreground">{testimonial.author}</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {testimonial.role}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
