import { MapPin, Phone, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

const BRANCHES = [
  {
    name: "Head Office – Islamabad",
    address: "1st Floor, Zain Plaza, Islamabad",
    phone: "+92 310 1111 327",
    city: "Islamabad",
    tag: "Head Office",
    tagColor: "bg-blue-100 text-blue-700",
    glow: "from-blue-500 to-indigo-600",
  },
  {
    name: "Islamabad Branch",
    address: "Islamabad, Pakistan",
    phone: "+92 310 1111 327",
    city: "Islamabad",
    tag: "Branch Office",
    tagColor: "bg-emerald-100 text-emerald-700",
    glow: "from-emerald-500 to-teal-600",
  },
  {
    name: "B17 Branch",
    address: "B17 Housing Scheme, Islamabad",
    phone: "+92 310 1111 327",
    city: "B17",
    tag: "Branch Office",
    tagColor: "bg-violet-100 text-violet-700",
    glow: "from-violet-500 to-purple-600",
  },
  {
    name: "Fateh Jang Branch",
    address: "Fateh Jang, Attock District",
    phone: "+92 310 1111 327",
    city: "Fateh Jang",
    tag: "Branch Office",
    tagColor: "bg-amber-100 text-amber-700",
    glow: "from-amber-500 to-orange-500",
  },
  {
    name: "Bakhar Branch",
    address: "Bakhar, Punjab, Pakistan",
    phone: "+92 310 1111 327",
    city: "Bakhar",
    tag: "Branch Office",
    tagColor: "bg-rose-100 text-rose-700",
    glow: "from-rose-500 to-red-600",
  },
];

export function BranchesSection() {
  return (
    <section id="branches" className="py-20 lg:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Our Locations
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold">
            Serving you <span className="text-gradient-brand">across Pakistan.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            With branches in major cities and districts, ECS is always close to you — ready to dispatch a verified technician to your location.
          </p>
        </div>

        {/* Branches Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BRANCHES.map((branch) => (
            <div
              key={branch.city}
              className="group relative rounded-2xl bg-card border border-border p-6 shadow-card-soft hover:shadow-brand hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
            >
              {/* Glow accent */}
              <div className={`absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br ${branch.glow} opacity-10 group-hover:opacity-20 transition-opacity duration-300`} />

              {/* Icon */}
              <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${branch.glow} text-white shadow-md mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <Building2 className="h-6 w-6" />
              </div>

              {/* Tag */}
              <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3 ${branch.tagColor}`}>
                {branch.tag}
              </span>

              {/* Name */}
              <h3 className="text-base font-bold leading-tight">{branch.name}</h3>

              {/* Address */}
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>{branch.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <span>{branch.phone}</span>
                </div>
              </div>

              {/* CTA */}
              <Link
                to="/contact"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Request in this area →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
