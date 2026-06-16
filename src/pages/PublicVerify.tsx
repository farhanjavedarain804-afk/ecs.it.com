import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { 
  ShieldCheck, Search, ScanLine, FileText, ClipboardList, 
  User, Building2, BadgeCheck, AlertCircle, ArrowLeft,
  Calendar, MapPin, BadgeDollarSign, CreditCard, ChevronRight,
  Printer, Share2, Globe, Phone, CheckCircle2
} from "lucide-react";
import { useParams } from "react-router-dom";
import logo from "@/assets/logo.png";
import { format } from "date-fns";

type VerificationType = "invoice" | "complaint" | "staff" | "branch" | "salary_slip";

const statusColors: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  unpaid: "bg-rose-100 text-rose-700 border-rose-200",
  partial: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-emerald-500 text-white border-emerald-600",
  solved: "bg-sky-100 text-sky-700 border-sky-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200",
};

const PublicVerify = () => {
  const [searchParams] = useSearchParams();
  const { id: pathId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(pathId || searchParams.get("id") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const performVerification = async (verifyId: string) => {
    if (!verifyId.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const API_URL = import.meta.env.VITE_API_URL ?? '';
    try {
      const res = await fetch(`${API_URL}/api/public/verify/${verifyId.trim()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Verification failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = pathId || searchParams.get("id");
    if (id) {
      setInput(id);
      performVerification(id);
    }
  }, [pathId, searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      navigate(`/verify?id=${input.trim().toUpperCase()}`);
    }
  };

  const getIcon = (type: VerificationType) => {
    switch (type) {
      case "invoice": return <FileText className="w-6 h-6 text-blue-600" />;
      case "complaint": return <ClipboardList className="w-6 h-6 text-orange-600" />;
      case "staff": return <User className="w-6 h-6 text-violet-600" />;
      case "branch": return <Building2 className="w-6 h-6 text-emerald-600" />;
      case "salary_slip": return <CreditCard className="w-6 h-6 text-indigo-600" />;
      default: return <ShieldCheck className="w-6 h-6 text-primary" />;
    }
  };

  const renderDataRow = (label: string, value: any, fullWidth = false, isStatus = false) => (
    <div className={`px-6 py-4 flex flex-col gap-1 ${fullWidth ? "col-span-full" : ""}`}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      {isStatus ? (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase w-fit ${statusColors[value?.toLowerCase()] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
          {value === 'paid' || value === 'solved' || value === 'active' || value === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : null}
          {value || "—"}
        </div>
      ) : (
        <span className="text-sm font-semibold text-slate-700">{value || "—"}</span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-800 font-sans selection:bg-primary/10">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-emerald-400/5 rounded-full blur-[80px]" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `radial-gradient(#1e40af 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-24">
        {/* Navbar-ish Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <Link to="/login" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-premium border border-slate-100 flex items-center justify-center transition-transform group-hover:scale-110">
              <img src={logo} alt="ECS Logo" className="h-7 w-auto" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">ECS <span className="text-primary">Verify</span></h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Authenticity Guaranteed</p>
            </div>
          </Link>

          <Link to="/login" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Portal
          </Link>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[11px] font-black uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4" /> SECURE DOCUMENT VERIFICATION SYSTEM
          </motion.div>
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight leading-tight">
            Trust but <span className="text-primary">Verify</span>.
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto leading-relaxed font-medium">
            Enter the verification ID printed on your document or scan the QR code to confirm its authenticity in our global database.
          </p>
        </div>

        {/* Search Implementation */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto mb-12">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 group-focus-within:bg-primary/5 group-focus-within:border-primary/20 group-focus-within:text-primary transition-all">
              <ScanLine className="w-5 h-5" />
            </div>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter Document ID (e.g. CMP-102, INV-2034)"
              className="w-full h-20 pl-20 pr-32 bg-white border-2 border-slate-100 rounded-[2rem] text-lg font-bold text-slate-800 shadow-premium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-slate-300 placeholder:font-medium uppercase tracking-wide"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-3 top-3 bottom-3 px-8 bg-primary text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Verify"}
            </button>
          </form>
        </motion.div>

        {/* Results Component */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-12">
              <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Scanning Database...</p>
            </motion.div>
          ) : result ? (
            <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto rounded-[2.5rem] bg-white border border-slate-100 shadow-elevated overflow-hidden">
              {/* Result Header */}
              <div className="bg-emerald-500 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 bg-white/10 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center p-3 animate-pulse">
                      {getIcon(result.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <BadgeCheck className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Verified Authentic Record</span>
                      </div>
                      <h3 className="text-3xl font-black tracking-tight">{result.data.number}</h3>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-4">
                     <button onClick={() => window.print()} className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all backdrop-blur-sm"><Printer className="w-5 h-5" /></button>
                     <button className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all backdrop-blur-sm"><Share2 className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>

              {/* Result Body */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-100">
                {result.type === 'invoice' && (
                  <>
                    {renderDataRow("Client Name", result.data.customer, true)}
                    {renderDataRow("Total Amount", `Rs. ${Number(result.data.amount).toLocaleString()}`)}
                    {renderDataRow("Payment Status", result.data.status, false, true)}
                    {renderDataRow("Issue Date", format(new Date(result.data.date), 'dd MMMM yyyy'))}
                    {renderDataRow("Location (City)", result.data.city)}
                    {renderDataRow("Branch Origin", result.data.branch || "Head Office")}
                    {renderDataRow("Verification", "RECORD SEALED & AUTHENTIC", true)}
                  </>
                )}

                {result.type === 'complaint' && (
                  <>
                    {renderDataRow("Complainant", result.data.customer, true)}
                    {renderDataRow("Current Status", result.data.status, false, true)}
                    {renderDataRow("Registration Date", format(new Date(result.data.date), 'dd MMMM yyyy'))}
                    {renderDataRow("Handling Branch", result.data.branch)}
                    {renderDataRow("Location (City)", result.data.city)}
                    {renderDataRow("Case Summary", result.data.description, true)}
                  </>
                )}

                {result.type === 'staff' && (
                  <>
                    {renderDataRow("Employee Name", result.data.name, true)}
                    {renderDataRow("Designation", result.data.designation)}
                    {renderDataRow("Current Status", result.data.status, false, true)}
                    {renderDataRow("Joining Date", result.data.date ? format(new Date(result.data.date), 'dd MMMM yyyy') : "—")}
                    {renderDataRow("Assigned Branch", result.data.branch)}
                    {renderDataRow("CNIC (Partial)", result.data.cnic)}
                    {renderDataRow("Contact Number", result.data.phone)}
                  </>
                )}

                {result.type === 'branch' && (
                  <>
                    {renderDataRow("Branch Name", result.data.name, true)}
                    {renderDataRow("Operational Status", result.data.status, false, true)}
                    {renderDataRow("Primary City", result.data.city)}
                    {renderDataRow("Contact Phone", result.data.phone)}
                    {renderDataRow("Official Address", result.data.address, true)}
                  </>
                )}

                {result.type === 'salary_slip' && (
                  <>
                    {renderDataRow("Employee Name", result.data.staff, true)}
                    {renderDataRow("Employee ID", result.data.employee_id)}
                    {renderDataRow("Designation", result.data.designation)}
                    {renderDataRow("Period", `${result.data.month} ${result.data.year}`)}
                    {renderDataRow("Net Salary", `Rs. ${Number(result.data.amount).toLocaleString()}`)}
                    {renderDataRow("Verification ID", result.data.number)}
                    {renderDataRow("Assigned Branch", result.data.branch)}
                    {renderDataRow("Location (City)", result.data.city)}
                    {renderDataRow("Payment Status", result.data.status, false, true)}
                    {renderDataRow("Paid On", result.data.paid_at ? format(new Date(result.data.paid_at), 'dd MMM yyyy') : "—")}
                    {renderDataRow("Organization", "Electric Complaint Solutions", true)}
                  </>
                )}
              </div>

              {/* Result Footer */}
              <div className="bg-slate-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Public Authenticated Record</p>
                </div>
                <div className="flex items-center gap-6">
                   <div className="flex flex-col items-end">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Stamp</p>
                      <p className="text-xs font-black text-slate-700">ECS-SYSTEM-SECURE</p>
                   </div>
                   <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                      <BadgeCheck className="w-6 h-6" />
                   </div>
                </div>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto p-8 rounded-[2rem] bg-rose-50 border border-rose-100 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-premium border border-rose-100 flex items-center justify-center mx-auto mb-6 text-rose-500">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-rose-700 mb-2 tracking-tight">Record Not Found</h3>
              <p className="text-sm font-medium text-rose-600/70 mb-8 leading-relaxed">
                We couldn't find any documents matching "<strong>{input}</strong>". Please double check the ID and try again.
              </p>
              <button 
                onClick={() => { setInput(""); setError(null); }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-rose-200 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-100 transition-all active:scale-95"
              >
                Clear Search
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Feature Grid help */}
        {!result && !loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            {[
              { title: "Official Documentation", desc: "Verify any ECS issued invoice or business document instantly.", icon: FileText },
              { title: "Personnel Trust", desc: "Confirm employee credentials and official status with the organization.", icon: User },
              { title: "24/7 Availability", desc: "Public verification portal is always online for third-party validation.", icon: Globe },
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-[2rem] bg-white border border-slate-100 hover:border-primary/20 hover:shadow-premium transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all mb-6">
                  <f.icon className="w-6 h-6" />
                </div>
                <h4 className="font-black text-slate-800 mb-2">{f.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="relative mt-auto py-12 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Official Platform</p>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Electric Complaint Solutions</h3>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
              <Phone className="w-4 h-4" /> +92-317-7121841
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
              <Globe className="w-4 h-4" /> devionic.com
            </div>
          </div>

          <div className="w-full max-w-xs h-px bg-slate-100" />
          
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center leading-relaxed">
            &copy; 2026 ECS & DEVIONIC (PRIVATE) LIMITED. <br/> 
            All documentation verified through this platform is proprietary.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicVerify;
