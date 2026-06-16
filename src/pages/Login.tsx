import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, ArrowRight, ShieldCheck, Search,
  AlertCircle, FileText, ClipboardList, LogIn, ScanLine,
  Building2, Globe, Phone, User, BadgeCheck, Wrench
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

type DocType = "invoice" | "complaint" | "staff" | "branch";

type VerificationResult = {
  type: DocType;
  number: string;
  customerName: string;
  status: string;
  branch: string;
  date: string;
  amount?: string;
  designation?: string;
  cnic?: string;
  // branch-specific
  address?: string;
  city?: string;
  phone?: string;
};

const statusStyle: Record<string, string> = {
  paid: "text-emerald-700 bg-emerald-50 border-emerald-200",
  unpaid: "text-red-600 bg-red-50 border-red-200",
  partial: "text-amber-600 bg-amber-50 border-amber-200",
  completed: "text-emerald-700 bg-emerald-50 border-emerald-200",
  solved: "text-sky-600 bg-sky-50 border-sky-200",
  in_progress: "text-blue-600 bg-blue-50 border-blue-200",
  assigned: "text-violet-600 bg-violet-50 border-violet-200",
  registered: "text-gray-500 bg-gray-100 border-gray-200",
  closed: "text-gray-500 bg-gray-100 border-gray-200",
  dismissed: "text-red-600 bg-red-50 border-red-200",
  invoice_generated: "text-blue-600 bg-blue-50 border-blue-200",
  active: "text-emerald-700 bg-emerald-50 border-emerald-200",
  inactive: "text-gray-500 bg-gray-100 border-gray-200",
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { signIn, maintenanceMode } = useAuth();
  const navigate = useNavigate();

  const [verifyInput, setVerifyInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast({ title: "Credentials required", variant: "destructive" }); return; }
    setLoading(true);
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
      toast({ 
        title: isNetworkError ? "Connection Error" : "Access Denied", 
        description: err.message || "Invalid credentials.", 
        variant: "destructive" 
      });
    } finally { setLoading(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;
    setSearching(true); setResult(null); setVerifyError(null);
    const input = verifyInput.trim().toUpperCase();

    try {
      // Redirect to the dedicated verification hub
      navigate(`/verify?id=${input}`);
    } catch (err: any) {
      setVerifyError("An error occurred during verification. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const getResultIcon = (type: DocType) => {
    if (type === "invoice") return <FileText className="w-4 h-4 text-emerald-600" />;
    if (type === "complaint") return <ClipboardList className="w-4 h-4 text-emerald-600" />;
    if (type === "branch") return <Building2 className="w-4 h-4 text-emerald-600" />;
    return <User className="w-4 h-4 text-emerald-600" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5 flex flex-col relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute top-[-120px] left-[-120px] w-[500px] h-[500px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[450px] h-[450px] bg-violet-400/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/3 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: `radial-gradient(circle at 1.5px 1.5px, #1e40af 1px, transparent 0)`, backgroundSize: '28px 28px' }} />

      {/* Top Logo */}
      <div className="flex flex-col items-center pt-10 pb-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-white shadow-xl shadow-primary/10 border border-primary/10 flex items-center justify-center mb-3 hover:shadow-primary/25 hover:scale-105 transition-all duration-300">
            <img src={logo} alt="ECS" className="h-12 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">ECS ERP Software</h1>
          <p className="text-sm text-slate-400 font-medium mt-0.5">Enterprise Resource Planning System</p>
        </motion.div>
      </div>

      {/* Main Split Panel */}
      <div className="flex-1 flex items-start justify-center px-4 pb-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl shadow-slate-200/80 border border-slate-100 overflow-hidden flex flex-col lg:flex-row">

          {/* LEFT: Verification */}
          <div className="flex-1 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-100 bg-gradient-to-br from-slate-50/80 to-white">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold uppercase tracking-widest mb-6">
              <ScanLine className="w-3 h-3" /> Public Verification Hub
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-1">Verify Document</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Instantly verify <span className="font-semibold text-slate-600">invoices</span>, <span className="font-semibold text-slate-600">complaints</span>, or <span className="font-semibold text-slate-600">staff/employee</span> records by their ID.
            </p>

            {/* Supported types info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
              {[
                { icon: FileText, label: "Invoice", hint: "8-digit ID", color: "text-blue-600 bg-blue-50 border-blue-200" },
                { icon: ClipboardList, label: "Complaint", hint: "CMP-001", color: "text-orange-600 bg-orange-50 border-orange-200" },
                { icon: User, label: "Employee", hint: "EMP-001", color: "text-violet-600 bg-violet-50 border-violet-200" },
                { icon: Building2, label: "Branch", hint: "BR-101", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
              ].map((t, i) => (
                <div key={i} className={`rounded-xl border px-2 py-2.5 text-center hover:scale-105 transition-transform cursor-default ${t.color}`}>
                  <t.icon className="w-4 h-4 mx-auto mb-1 opacity-70" />
                  <p className="text-[9px] font-bold uppercase tracking-wider">{t.label}</p>
                  <p className="text-[8px] opacity-60 mt-0.5 font-mono">{t.hint}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleVerify} className="space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  placeholder="Enter Invoice # / Complaint # / Employee ID"
                  className="w-full h-12 bg-white border border-slate-200 rounded-xl pl-11 pr-4 text-sm text-slate-700 uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 hover:border-slate-300 transition-all shadow-sm placeholder:normal-case placeholder:text-slate-300"
                />
              </div>
              <button type="submit" disabled={searching || !verifyInput.trim()}
                className="w-full h-12 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-200 hover:bg-emerald-500 hover:shadow-emerald-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40 transition-all duration-200 flex items-center justify-center gap-2">
                {searching
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><ScanLine className="w-4 h-4" /> Verify Now</>}
              </button>
            </form>

            {/* Result / Error */}
            <AnimatePresence mode="wait">
              {result && (
                <motion.div key="res" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-emerald-200 shadow-sm flex items-center justify-center">
                        {getResultIcon(result.type)}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 capitalize">
                          Authenticated {result.type}
                        </p>
                        <p className="text-sm font-bold text-slate-800">{result.number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-200">
                      <BadgeCheck className="w-3 h-3 text-emerald-600" />
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Verified</span>
                    </div>
                  </div>

                  {/* Result grid — adapts for staff vs document vs branch */}
                  <div className="grid grid-cols-2 gap-px bg-emerald-100/50">
                    {(result.type === "staff"
                      ? [
                        { label: "Full Name", value: result.customerName },
                        { label: "Status", value: result.status, isStatus: true },
                        { label: "Designation", value: result.designation || "—" },
                        { label: "Branch", value: result.branch },
                        { label: "Phone", value: result.phone || "—" },
                        { label: "Joined", value: result.date },
                        { label: "CNIC", value: result.cnic || "—" },
                      ]
                      : result.type === "branch"
                        ? [
                          { label: "Branch Name", value: result.customerName },
                          { label: "Status", value: result.status, isStatus: true },
                          { label: "Phone", value: result.phone || "—" },
                          { label: "City", value: result.city || "—" },
                          { label: "Address", value: result.address || "—" },
                        ]
                        : result.type === "complaint"
                          ? [
                            { label: "Client", value: result.customerName },
                            { label: "Status", value: result.status, isStatus: true },
                            { label: "Branch", value: result.branch },
                            { label: "Date", value: result.date },
                            { label: "Summary", value: result.address || "—", fullWidth: true },
                          ]
                          : [
                            { label: "Client", value: result.customerName },
                            { label: "Status", value: result.status, isStatus: true },
                            { label: "Branch", value: result.branch },
                            { label: "Amount", value: result.amount },
                            { label: "Date", value: result.date },
                          ]
                    ).map((item, i) => (
                      <div key={i} className={`bg-white/70 px-5 py-3 ${item.fullWidth || item.label === 'Address' ? 'col-span-2' : ''}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{item.label}</p>
                        {item.isStatus
                          ? <span className={`text-xs font-bold capitalize px-2 py-0.5 rounded border ${statusStyle[result.status.replace(/ /g, "_")] || "text-slate-600 bg-slate-100 border-slate-200"}`}>{item.value}</span>
                          : <p className="text-sm text-slate-700 font-semibold">{item.value}</p>}
                      </div>
                    ))}
                  </div>

                  <div className="px-5 py-2.5 flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 italic flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" /> ECS Verified Record
                    </p>
                    <Building2 className="w-3 h-3 text-slate-300" />
                  </div>
                </motion.div>
              )}
              {verifyError && (
                <motion.div key="err" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                  <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-600">Not Found</p>
                    <p className="text-xs text-slate-500 mt-0.5">{verifyError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Staff Login */}
          <div className="flex-1 p-8 lg:p-10 flex flex-col justify-between">
            <div>
              {maintenanceMode && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 p-4 rounded-2xl bg-destructive/5 border border-destructive/20 flex items-center gap-3"
                >
                  <div className="p-2 rounded-xl bg-destructive/10 text-destructive animate-pulse">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-destructive uppercase tracking-tighter">System Maintenance Active</h4>
                    <p className="text-[10px] text-muted-foreground font-medium italic">Only authorized developers can sign in at this time.</p>
                  </div>
                </motion.div>
              )}

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-primary text-[11px] font-bold uppercase tracking-widest mb-6">
                <LogIn className="w-3 h-3" /> Personnel Access
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-1">Staff Login</h2>
              <p className="text-sm text-slate-400 mb-8">Enter your credentials to access the ECS ERP management portal.</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@ecs.com"
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-slate-300 transition-all shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                      className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 pr-12 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-slate-300 transition-all shadow-sm" />
                    <button type="button" onClick={() => setShowPwd(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 mt-2">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><span>Login to System</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  { icon: ShieldCheck },
                  { icon: ShieldCheck },
                  { icon: ShieldCheck },
                ].map((b, i) => (
                  <div key={i} className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:bg-primary/3 transition-all cursor-default group">
                    <b.icon className="w-5 h-5 text-primary/40 group-hover:text-primary/70 mx-auto transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-5 px-4 border-t border-slate-100 bg-white/60 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-1.5">
          <p className="text-[11px] font-bold text-slate-600 text-center">
            Developed by <span className="text-primary">DEVIONIC (PRIVATE) LIMITED</span>
          </p>
          <p className="text-[10px] text-slate-400 text-center">
            All Rights Reserved &copy; ECS &amp; DEVIONIC (PRIVATE) LIMITED
          </p>
          <div className="flex items-center gap-4 mt-1">
            <a href="https://devionic.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-primary transition-colors font-medium">
              <Globe className="w-3 h-3" /> devionic.com
            </a>
            <span className="w-px h-3 bg-slate-200" />
            <a href="tel:+923177121841"
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-primary transition-colors font-medium">
              <Phone className="w-3 h-3" /> +92-317-7121841
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
