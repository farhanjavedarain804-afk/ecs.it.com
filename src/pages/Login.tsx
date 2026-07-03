import { useState } from "react";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/landing/Logo";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().trim().min(3).max(255),
  password: z.string().min(6).max(128),
});

export default function Login() {
  const [show, setShow] = useState(false);
  const [state, setState] = useState<{ status: "idle" | "loading" | "error"; error?: string }>({ status: "idle" });

  const { signIn, maintenanceMode } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd));

    if (!parsed.success) {
      setState({ status: "error", error: "Please enter a valid email and password." });
      return;
    }

    setState({ status: "loading" });
    const { email, password } = parsed.data;

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;

      // Log login activity via backend
      try {
        const token = localStorage.getItem('ecs_token');
        const API_URL = import.meta.env.VITE_API_URL ?? '';
        await fetch(`${API_URL}/api/user_activity_logs`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ activity_type: 'login', user_agent: navigator.userAgent })
        });
      } catch { /* ignore logging errors */ }

      navigate("/dashboard");
    } catch (err: any) {
      const isNetworkError = err.message?.includes('Server unreachable');
      const msg = isNetworkError ? "Connection Error. Server unreachable." : (err.message || "Invalid credentials.");
      setState({ status: "error", error: msg });
      toast({
        title: isNetworkError ? "Connection Error" : "Access Denied",
        description: err.message || "Invalid credentials.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* LEFT — Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 bg-gradient-hero text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-70 pointer-events-none" />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-red/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-yellow/20 blur-3xl" />
        <Sparkles className="absolute top-24 right-24 h-6 w-6 text-brand-yellow/70 animate-ecs-spark" />

        <div className="relative">
          <Logo invert />
        </div>

        <div className="relative max-w-md">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-yellow" /> Secure DMS Access
          </div>
          <h1 className="mt-5 text-4xl xl:text-5xl font-extrabold leading-tight">
            Welcome back to the{" "}
            <span className="bg-gradient-to-r from-brand-yellow to-brand-red bg-clip-text text-transparent">
              ECS platform.
            </span>
          </h1>
          <p className="mt-4 text-white/80 leading-relaxed">
            Manage complaints, technicians, branches and verifications from one secure dashboard —
            built for the ECS team and trusted partners.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { v: "1000+", l: "Complaints" },
              { v: "500+", l: "Customers" },
              { v: "24/7", l: "Support" },
            ].map((s) => (
              <div key={s.l} className="glass rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-brand-yellow">{s.v}</div>
                <div className="text-[11px] text-white/70 uppercase tracking-wider mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-3 text-xs text-white/70">
          <Zap className="h-4 w-4 text-brand-yellow" />
          One Solution For All Technical Services
        </div>
      </aside>

      {/* RIGHT — Login form */}
      <main className="flex flex-col">
        <div className="flex items-center justify-between p-5">
          <div className="lg:hidden"><Logo /></div>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Back to website
          </Link>
        </div>

        <div className="flex-1 grid place-items-center p-6">
          <div className="w-full max-w-md">
            {maintenanceMode && (
              <div className="mb-6 p-4 rounded-2xl bg-destructive/5 border border-destructive/20 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-destructive/10 text-destructive animate-pulse">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-destructive uppercase tracking-tighter">System Maintenance Active</h4>
                  <p className="text-[10px] text-muted-foreground font-medium italic">Only authorized developers can sign in at this time.</p>
                </div>
              </div>
            )}

            <h2 className="text-3xl font-extrabold">Sign in to ECS</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your credentials to access the Digital Management System.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Email or Username</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input name="email" required maxLength={255} placeholder="you@ecs.com.pk" className="h-12 pl-10" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium">Password</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    name="password"
                    type={show ? "text" : "password"}
                    required
                    minLength={6}
                    maxLength={128}
                    placeholder="••••••••"
                    className="h-12 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
                <input type="checkbox" name="remember" className="h-4 w-4 rounded border-border" />
                Remember me on this device
              </label>

              {state.status === "error" && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}

              <Button type="submit" disabled={state.status === "loading"} className="w-full h-12 text-base font-bold">
                {state.status === "loading" ? <Loader2 className="animate-spin mr-2" /> : null}
                Login
              </Button>

              <p className="text-xs text-center text-muted-foreground pt-2">
                Protected by ECS — connections to our secure DMS are encrypted.
              </p>
            </form>
          </div>
        </div>

        <div className="p-5 text-center text-[10px] sm:text-xs text-muted-foreground/70">
          Developed By Devionic (Private) Limited | +92-317-7121841 Whatsapp | <a href="https://www.devionic.com" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">www.devionic.com</a> | info@devionic.com
        </div>
      </main>
    </div>
  );
}
