import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, Search, CheckCircle2, XCircle, Loader2,
  User, Building2, FileText, ClipboardList, CreditCard,
  Tag, MapPin, Banknote, Hash, ExternalLink, BadgeCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  paid: "text-emerald-600",
  unpaid: "text-rose-600",
  partial: "text-amber-600",
  completed: "text-emerald-600",
  solved: "text-sky-600",
  in_progress: "text-blue-600",
  active: "text-emerald-600",
  inactive: "text-slate-400",
  registered: "text-slate-600",
};

const typeLabels: Record<string, string> = {
  invoice: "Invoice",
  complaint: "Complaint",
  staff: "Employee / Technician",
  branch: "Branch Office",
  salary_slip: "Salary Slip",
};

const typeIcons: Record<string, React.ReactNode> = {
  invoice: <FileText className="h-5 w-5 text-blue-600" />,
  complaint: <ClipboardList className="h-5 w-5 text-orange-600" />,
  staff: <User className="h-5 w-5 text-violet-600" />,
  branch: <Building2 className="h-5 w-5 text-emerald-600" />,
  salary_slip: <CreditCard className="h-5 w-5 text-indigo-600" />,
};

const getResultFields = (result: any) => {
  const d = result.data;
  const fmt = (v: string) => { try { return format(new Date(v), "dd MMM yyyy"); } catch { return v; } };
  switch (result.type) {
    case "invoice":
      return [
        { icon: Hash, label: "Invoice No.", value: d.number },
        { icon: User, label: "Client", value: d.customer },
        { icon: Banknote, label: "Amount", value: `Rs. ${Number(d.amount).toLocaleString()}` },
        { icon: Tag, label: "Status", value: d.status },
        { icon: MapPin, label: "Branch", value: d.branch || "Head Office" },
        { icon: FileText, label: "Issue Date", value: d.date ? fmt(d.date) : "—" },
      ];
    case "complaint":
      return [
        { icon: Hash, label: "Complaint No.", value: d.number },
        { icon: User, label: "Complainant", value: d.customer },
        { icon: Tag, label: "Status", value: d.status },
        { icon: MapPin, label: "Branch", value: d.branch },
        { icon: MapPin, label: "City", value: d.city },
        { icon: FileText, label: "Registered", value: d.date ? fmt(d.date) : "—" },
      ];
    case "staff":
      return [
        { icon: User, label: "Employee Name", value: d.name },
        { icon: Hash, label: "Employee ID", value: d.number },
        { icon: Tag, label: "Designation", value: d.designation },
        { icon: Tag, label: "Status", value: d.status },
        { icon: Building2, label: "Branch", value: d.branch },
        { icon: FileText, label: "Joined", value: d.date ? fmt(d.date) : "—" },
      ];
    case "branch":
      return [
        { icon: Building2, label: "Branch Name", value: d.name },
        { icon: Hash, label: "Branch Code", value: d.number },
        { icon: Tag, label: "Status", value: d.status },
        { icon: MapPin, label: "City", value: d.city },
        { icon: MapPin, label: "Address", value: d.address },
        { icon: FileText, label: "Phone", value: d.phone },
      ];
    case "salary_slip":
      return [
        { icon: User, label: "Employee", value: d.staff },
        { icon: Hash, label: "Employee ID", value: d.employee_id },
        { icon: Tag, label: "Designation", value: d.designation },
        { icon: Banknote, label: "Net Salary", value: `Rs. ${Number(d.amount).toLocaleString()}` },
        { icon: Tag, label: "Status", value: d.status },
        { icon: MapPin, label: "Branch", value: d.branch },
      ];
    default:
      return [];
  }
};

export function Verification() {
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${API_URL}/api/public/verify/${id.trim().toUpperCase()}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("no_match");
    } finally {
      setLoading(false);
    }
  };

  const fields = result ? getResultFields(result) : [];

  return (
    <section id="verification" className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh opacity-30 pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left info */}
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
              directly from the ECS Digital Management System in real time.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {["Technicians & employees", "Branch offices", "Invoices & complaints", "Salary slips"].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {x}
                </li>
              ))}
            </ul>
          </div>

          {/* Right form + result */}
          <form onSubmit={onVerify} className="rounded-3xl bg-card border border-border shadow-card-soft p-6 sm:p-8">
            <label className="block text-sm font-semibold mb-2">
              Employee / Branch / Invoice ID
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                value={id}
                onChange={(e) => setId(e.target.value.toUpperCase())}
                placeholder="e.g. EMP-101, INV-2034, CMP-102"
                className="h-12 uppercase tracking-wide"
              />
              <Button type="submit" variant="hero" size="lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <Search />} Verify
              </Button>
            </div>

            <div className="mt-6 min-h-[200px]">
              {/* Loading */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium animate-pulse">Scanning database…</p>
                </div>
              )}

              {/* Verified result */}
              {!loading && result && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 animate-in fade-in slide-in-from-bottom-2">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-lg border border-emerald-100 shadow-sm">
                        {typeIcons[result.type]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
                          <BadgeCheck className="h-4 w-4" /> Verified Authentic
                        </div>
                        <p className="text-xs text-emerald-600/70 font-medium">{typeLabels[result.type]}</p>
                      </div>
                    </div>
                  </div>

                  {/* Fields grid */}
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {fields.map((f, i) => (
                      <div key={i} className="flex gap-2">
                        <f.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">{f.label}</dt>
                          <dd className={`font-semibold truncate capitalize ${statusColors[f.value?.toLowerCase()] || "text-foreground"}`}>
                            {f.value || "—"}
                          </dd>
                        </div>
                      </div>
                    ))}
                  </dl>

                  {/* Full report link */}
                  <div className="mt-4 pt-4 border-t border-emerald-200">
                    <Button
                      type="button"
                      variant="hero"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => navigate(`/verify?id=${id.trim().toUpperCase()}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Detailed Report & Download PDF
                    </Button>
                  </div>
                </div>
              )}

              {/* Error */}
              {!loading && error === "no_match" && (
                <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-5 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-destructive">No matching record found</p>
                    <p className="text-muted-foreground mt-1">
                      We couldn't find any document matching "<strong>{id}</strong>". Please check the ID and try again.
                    </p>
                  </div>
                </div>
              )}

              {/* Placeholder */}
              {!loading && !result && !error && (
                <p className="text-xs text-muted-foreground text-center pt-16">
                  Enter a valid ID above and click Verify to see real-time results.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
