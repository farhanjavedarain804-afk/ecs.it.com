import { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const REVIEWS = [
  { name: "Ahmed Raza", city: "Karachi", rating: 5, text: "ECS resolved our office HVAC issue within hours. The technician was professional, clean and ID-verified. Truly trustworthy service." },
  { name: "Sana Malik", city: "Lahore", rating: 5, text: "Got our solar system installed end-to-end by ECS. Transparent pricing and excellent after-sales support — exactly what we needed." },
  { name: "Bilal Khan", city: "Islamabad", rating: 4, text: "Used the verification portal before letting a technician in. Loved the peace of mind. The repair itself was fast and tidy." },
  { name: "Hira Sheikh", city: "Faisalabad", rating: 5, text: "Generator maintenance has never been this smooth. Real-time tracking and a friendly team. ECS is now our go-to facility partner." },
];

export function Testimonials() {
  const [i, setI] = useState(0);
  const next = () => setI((i + 1) % REVIEWS.length);
  const prev = () => setI((i - 1 + REVIEWS.length) % REVIEWS.length);
  const r = REVIEWS[i];

  return (
    <section className="py-20 lg:py-28 bg-surface-muted">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Testimonials</span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold">
            Loved by <span className="text-gradient-brand">homes & businesses.</span>
          </h2>
        </div>

        <div className="mt-12 relative rounded-3xl bg-card border border-border shadow-card-soft p-8 sm:p-12">
          <Quote className="absolute top-6 right-6 h-16 w-16 text-primary/10" />
          <div className="flex gap-1 mb-4">
            {Array.from({ length: r.rating }).map((_, k) => (
              <Star key={k} className="h-5 w-5 fill-brand-yellow text-brand-yellow" />
            ))}
          </div>
          <p className="text-lg sm:text-xl leading-relaxed text-foreground">
            "{r.text}"
          </p>
          <div className="mt-6 flex items-center justify-between">
            <div>
              <p className="font-bold">{r.name}</p>
              <p className="text-sm text-muted-foreground">{r.city}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={prev} aria-label="Previous" className="grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-primary hover:text-primary-foreground transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={next} aria-label="Next" className="grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-primary hover:text-primary-foreground transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-6 flex gap-1.5">
            {REVIEWS.map((_, k) => (
              <button
                key={k}
                onClick={() => setI(k)}
                aria-label={`Go to review ${k + 1}`}
                className={`h-1.5 rounded-full transition-all ${k === i ? "w-8 bg-gradient-brand" : "w-2 bg-border"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}