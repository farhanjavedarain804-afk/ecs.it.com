import { BadgeCheck, Activity, ShieldCheck, Timer, Eye, Users2 } from "lucide-react";

const ITEMS = [
  { icon: BadgeCheck, title: "Verified Professionals", desc: "Every technician is screened, trained and ID-verified before deployment." },
  { icon: Activity, title: "Real-Time Tracking", desc: "Track every complaint from submission to resolution with live status updates." },
  { icon: ShieldCheck, title: "Secure Verification", desc: "Instantly verify staff, branches, invoices and complaints through our portal." },
  { icon: Timer, title: "Fast Response", desc: "Dispatch within hours — our nationwide network responds when you need it most." },
  { icon: Eye, title: "Transparent Process", desc: "Clear pricing, documented work and full visibility at every step of service." },
  { icon: Users2, title: "Experienced Teams", desc: "Specialists with years of field experience across every technical domain." },
];

export function WhyChoose() {
  return (
    <section className="py-20 lg:py-28 bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Why ECS</span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold">
            Trust built into every <span className="text-gradient-brand">service call.</span>
          </h2>
        </div>
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ITEMS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-2xl bg-card border border-border p-6 hover:border-primary/40 hover:shadow-card-soft transition-all">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-gradient-brand group-hover:text-white transition-all">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold text-lg">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}