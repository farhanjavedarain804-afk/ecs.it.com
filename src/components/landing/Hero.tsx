import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, CheckCircle2, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = ["Verified Staff", "Fast Response", "Professional Team", "Nationwide Support"];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero text-white pt-28 pb-20 lg:pt-36 lg:pb-32">
      <div className="absolute inset-0 bg-gradient-mesh opacity-70 pointer-events-none" />
      {/* particle/spark accents */}
      <div className="absolute inset-0 pointer-events-none">
        <Sparkles className="absolute top-24 left-[8%] h-6 w-6 text-brand-yellow/70 animate-ecs-spark" />
        <Sparkles className="absolute top-1/2 right-[10%] h-8 w-8 text-brand-yellow/50 animate-ecs-spark" style={{ animationDelay: "0.8s" }} />
        <Zap className="absolute bottom-20 left-[15%] h-7 w-7 text-brand-yellow/60 animate-ecs-float" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-red/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-brand-blue/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-brand-yellow animate-ecs-spark" />
              One Solution For All Technical Services
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05]">
              Professional Maintenance &{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, hsl(38 95% 55%) 0%, hsl(0 85% 55%) 100%)" }}
              >
                Technical Solutions
              </span>{" "}
              Across Pakistan
            </h1>
            <p className="mt-6 text-lg text-white/80 max-w-2xl leading-relaxed">
              Electrical, HVAC, Plumbing, Solar, Refrigeration, Renovation and Facility Management
              services — delivered by verified professionals under one trusted platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="spark" size="xl">
                <Link to="/contact">Request Service <ArrowRight /></Link>
              </Button>
              <Button asChild variant="glass" size="xl">
                <Link to="/verification"><ShieldCheck /> Verify Technician</Link>
              </Button>
            </div>
            <ul className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-white/85">
                  <CheckCircle2 className="h-4 w-4 text-brand-yellow shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative aspect-square max-w-md mx-auto">
              <div className="absolute inset-0 rounded-3xl bg-gradient-spark blur-2xl opacity-60 animate-ecs-float" />
              <div className="relative h-full w-full rounded-3xl glass p-8 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full animate-ecs-pulse-ring" />
                  <div className="relative grid h-40 w-40 place-items-center rounded-full bg-gradient-spark shadow-spark">
                    <Zap className="h-20 w-20 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <FloatingChip className="-top-4 -left-4" icon={ShieldCheck} label="Verified" />
                <FloatingChip className="top-1/3 -right-6" icon={Zap} label="24/7" delay="1.2s" />
                <FloatingChip className="-bottom-4 left-8" icon={CheckCircle2} label="Trusted" delay="0.6s" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingChip({
  icon: Icon,
  label,
  className = "",
  delay = "0s",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  className?: string;
  delay?: string;
}) {
  return (
    <div
      className={`absolute glass rounded-2xl px-3 py-2 flex items-center gap-2 text-xs font-semibold animate-ecs-float ${className}`}
      style={{ animationDelay: delay }}
    >
      <Icon className="h-4 w-4 text-brand-yellow" />
      {label}
    </div>
  );
}
