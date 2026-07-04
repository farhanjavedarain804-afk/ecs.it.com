import { useState } from "react";
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
  const [state, setState] = useState<{ status: "idle" | "submitting" | "done" | "error"; error?: string }>({ status: "idle" });

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
      setState({ status: "done" });
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
          <Field label="City" className="sm:col-span-2">
            <select name="city" required defaultValue="" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
              <option value="" disabled>Select your city/branch</option>
              {["Fateh Jang", "B17", "Islamabad", "Bakhar"].map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </Field>
          <Field label="Email" className="sm:col-span-2"><Input name="email" type="email" required maxLength={255} placeholder="you@example.com" /></Field>

          <Field label="Service Required" className="sm:col-span-2">
            <select name="service" required defaultValue="" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
              <option value="" disabled>Select a service</option>
              {SERVICES.map((s) => <option key={s.slug} value={s.title}>{s.title}</option>)}
            </select>
          </Field>
          <Field label="Message" className="sm:col-span-2"><Textarea name="message" required maxLength={1000} rows={4} placeholder="Tell us about your request..." /></Field>

          {state.status === "error" && (
            <p className="sm:col-span-2 text-sm text-destructive">{state.error}</p>
          )}
          {state.status === "done" && (
            <p className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-primary font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Request received — our team will be in touch.
            </p>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" variant="hero" size="xl" disabled={state.status === "submitting"} className="w-full sm:w-auto">
              {state.status === "submitting" ? <Loader2 className="animate-spin" /> : <Send />} Submit Request
            </Button>
          </div>
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
