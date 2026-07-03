import { FileText, ClipboardCheck, UserCog, Wrench, Star } from "lucide-react";

const STEPS = [
  { icon: FileText, title: "Submit Complaint", desc: "Raise a request via portal, app or phone." },
  { icon: ClipboardCheck, title: "Complaint Review", desc: "Our team validates and prioritises the job." },
  { icon: UserCog, title: "Technician Assigned", desc: "A verified specialist is dispatched to you." },
  { icon: Wrench, title: "Work Completion", desc: "Service delivered, documented and signed off." },
  { icon: Star, title: "Customer Feedback", desc: "You rate the service — we keep improving." },
];

export function Process() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">How it works</span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold">
            Five steps from <span className="text-gradient-brand">complaint to resolution.</span>
          </h2>
        </div>

        <div className="mt-14 relative">
          <div className="hidden lg:block absolute top-7 left-[10%] right-[10%] h-0.5 bg-gradient-brand opacity-30" />
          <ol className="grid gap-6 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <div className="relative grid h-14 w-14 mx-auto place-items-center rounded-full bg-gradient-brand text-white shadow-brand">
                  <s.icon className="h-6 w-6" />
                  <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-brand-yellow text-foreground text-xs font-bold grid place-items-center shadow">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-bold text-center">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground text-center leading-relaxed">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
