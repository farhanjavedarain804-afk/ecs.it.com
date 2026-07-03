import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SERVICES } from "./services-data";

export function ServicesGrid({ heading = true }: { heading?: boolean }) {
  return (
    <section id="services" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {heading && (
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              What we deliver
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold">
              All technical services, <span className="text-gradient-brand">one platform.</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              From routine maintenance to large-scale installations — ECS connects you with verified
              specialists for every job.
            </p>
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {SERVICES.map((s, i) => (
            <ServiceCard key={s.slug} {...s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({
  title,
  desc,
  icon: Icon,
  index,
}: {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  index: number;
}) {
  const accent = index % 3 === 0 ? "from-brand-blue to-brand-blue/70"
    : index % 3 === 1 ? "from-brand-red to-brand-red/70"
    : "from-brand-yellow to-brand-red";
  return (
    <div className="group relative rounded-2xl bg-card border border-border p-6 shadow-card-soft hover:shadow-brand hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${accent} opacity-10 group-hover:opacity-20 transition-opacity`} />
      <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-spark`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
      <Link
        to="/contact"
        className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all"
      >
        View Details <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}