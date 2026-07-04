import { useState, useEffect } from "react";
import { z } from "zod";
import { Send, Phone, Mail, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SERVICES } from "./services-data";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  service: z.string().min(1),
  city: z.string().min(1),
  message: z.string().trim().max(1000).optional(),
});

export function Contact() {
  const [state, setState] = useState<{ status: "idle" | "submitting" | "done" | "error"; error?: string; id?: string }>({ status: "idle" });
  const [branches, setBranches] = useState<{id: string, name: string, city?: string}[]>([]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_URL}/api/service_requests/public/branches`);
        if (res.ok) {
          const data = await res.json();
          setBranches(data);
        }
      } catch (err) {
        console.error("Failed to load branches", err);
      }
    };
    fetchBranches();
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      setState({ status: "error", error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    setState({ status: "submitting" });
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/service_requests/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.data.name,
          phone: parsed.data.phone,
          email: parsed.data.email,
          service_required: parsed.data.service,
          city_branch: parsed.data.city,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to submit request");
      }
      const data = await res.json();
      setState({ status: "done", id: data.id });
    } catch (err: any) {
      setState({ status: "error", error: err.message || "Connection error. Please try again later." });
    }
  };

  return (
    <section id="contact" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Get in touch</span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold">
            Request a <span className="text-gradient-brand">service today.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Tell us what you need and our team will respond within working hours. For emergencies,
            call our 24/7 hotline.
          </p>
          <ul className="mt-8 space-y-4">
            <ContactRow icon={Phone} label="Hotline" value="+92 310 1111 327" />
            <ContactRow icon={Mail} label="Email" value="ecs.isbpak@gmail.com" />
            <ContactRow icon={MapPin} label="Head Office" value="1st Floor, Zain Plaza, Islamabad" />

          </ul>
        </div>

        <form onSubmit={onSubmit} className="lg:col-span-3 rounded-3xl bg-card border border-border shadow-card-soft p-6 sm:p-8 grid sm:grid-cols-2 gap-4">
          <Field label="Name"><Input name="name" required maxLength={100} placeholder="Your full name" /></Field>
          <Field label="Phone"><Input name="phone" required maxLength={20} placeholder="+92 ..." /></Field>
          <Field label="City / Branch" className="sm:col-span-2">
            <select name="city" required defaultValue="" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
              <option value="" disabled>Select your nearest branch</option>
              {branches.length > 0 ? (
                branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.city ? `(${b.city})` : ''}
                  </option>
                ))
              ) : (
                ["Fateh Jang", "B17", "Islamabad", "Bakhar"].map((city) => <option key={city} value={city}>{city}</option>)
              )}
            </select>
          </Field>
          <Field label="Email" className="sm:col-span-2"><Input name="email" type="email" required maxLength={255} placeholder="you@example.com" /></Field>

          <Field label="Service Required" className="sm:col-span-2">
            <select name="service" required defaultValue="" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
              <option value="" disabled>Select a service</option>
              {SERVICES.map((s) => <option key={s.slug} value={s.title}>{s.title}</option>)}
              <option value="Other Services">Other Services</option>
            </select>
          </Field>
          <Field label="Message" className="sm:col-span-2"><Textarea name="message" required maxLength={1000} rows={4} placeholder="Tell us about your request..." /></Field>

          {state.status === "error" && (
            <p className="sm:col-span-2 text-sm text-destructive">{state.error}</p>
          )}

          {state.status === "done" ? (
            <div className="sm:col-span-2 flex flex-col items-center justify-center p-8 text-center bg-primary/5 rounded-2xl border border-primary/10">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Request Submitted Successfully!</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                We've received your service request. Our team will contact you shortly. Please save your reference number below to track the status in the Verification tab.
              </p>
              <div className="bg-background border border-border shadow-sm rounded-xl px-6 py-3 font-mono text-xl font-bold tracking-wider text-primary">
                {state.id}
              </div>
              <Button type="button" variant="outline" className="mt-8" onClick={() => setState({ status: "idle" })}>
                Submit Another Request
              </Button>
            </div>
          ) : (
            <div className="sm:col-span-2 mt-2">
              <Button type="submit" variant="hero" size="xl" disabled={state.status === "submitting"} className="w-full sm:w-auto">
                {state.status === "submitting" ? <Loader2 className="animate-spin" /> : <Send />} Submit Request
              </Button>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function ContactRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </li>
  );
}
