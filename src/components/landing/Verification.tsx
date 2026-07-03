import { useState } from "react";
import { ShieldCheck, Search, CheckCircle2, XCircle, Loader2, User, Building2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Result = {
  status: "verified" | "invalid";
  name: string;
  department: string;
  validity: string;
};

export function Verification() {
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const onVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim()) return;
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      const valid = id.trim().length >= 4;
      setResult(
        valid
          ? { status: "verified", name: "Demo Technician", department: "Electrical Services", validity: "Valid until Dec 2026" }
          : { status: "invalid", name: "—", department: "—", validity: "—" },
      );
      setLoading(false);
    }, 900);
  };

  return (
    <section id="verification" className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh opacity-30 pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
              <ShieldCheck className="h-4 w-4" /> Verification Portal
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold">
              Verify any ECS{" "}
              <span className="text-gradient-brand">employee, branch or invoice.</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Enter the ID found on your service report, technician badge or invoice. Results come
              directly from the ECS Digital Management System.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {["Technicians & employees", "Branch offices", "Invoices & complaints"].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {x}
                </li>
              ))}
            </ul>
          </div>

          <form
            onSubmit={onVerify}
            className="rounded-3xl bg-card border border-border shadow-card-soft p-6 sm:p-8"
          >
            <label className="block text-sm font-semibold mb-2">Employee / Verification ID</label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="e.g. ECS-TECH-1042"
                className="h-12"
              />
              <Button type="submit" variant="hero" size="lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <Search />} Verify
              </Button>
            </div>

            <div className="mt-6 min-h-[160px]">
              {result?.status === "verified" && (
                <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <CheckCircle2 className="h-5 w-5" /> Verified
                  </div>
                  <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <Field icon={User} label="Name" value={result.name} />
                    <Field icon={ShieldCheck} label="Status" value="Active" />
                    <Field icon={Building2} label="Department" value={result.department} />
                    <Field icon={CalendarClock} label="Validity" value={result.validity} />
                  </dl>
                </div>
              )}
              {result?.status === "invalid" && (
                <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-5 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-destructive">No matching record found</p>
                    <p className="text-muted-foreground mt-1">Please check the ID and try again.</p>
                  </div>
                </div>
              )}
              {!result && !loading && (
                <p className="text-xs text-muted-foreground text-center pt-12">
                  Results appear here after verification.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function Field({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-semibold truncate">{value}</dd>
      </div>
    </div>
  );
}
