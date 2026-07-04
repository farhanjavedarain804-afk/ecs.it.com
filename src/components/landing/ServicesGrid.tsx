import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SERVICES } from "./services-data";

export function ServicesGrid({ heading = true }: { heading?: boolean }) {
  return (
    <section id="services" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {heading && (
          <div className="max-w-2xl mb-14">
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
  color,
  index,
}: {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  index: number;
}) {
  return (
    <div className="group relative rounded-2xl bg-card border border-border p-6 shadow-card-soft hover:shadow-brand hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col gap-4">
      {/* background glow */}
      <div className={`absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br ${color} opacity-10 group-hover:opacity-20 transition-opacity duration-300`} />

      {/* Icon badge */}
      <div className={`relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-7 w-7" />
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="text-base font-bold leading-tight">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>

      <Link
        to="/contact"
        className={`inline-flex items-center gap-1 text-sm font-semibold bg-gradient-to-r ${color} bg-clip-text text-transparent group-hover:gap-2 transition-all`}
      >
        Request Service <ArrowUpRight className="h-4 w-4 text-primary" />
      </Link>
    </div>
  );
}
