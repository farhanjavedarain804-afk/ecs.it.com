import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck, Search, ScanLine, FileText, ClipboardList,
  User, Building2, BadgeCheck, AlertCircle, ArrowLeft, X,
  Globe, Phone, CheckCircle2, Download, ChevronDown, ChevronUp,
  CreditCard, Calendar, MapPin, Hash, Banknote, Tag
} from "lucide-react";
import { useParams } from "react-router-dom";
import logo from "@/assets/logo.png";
import { ECS_LOGO_BASE64 } from "@/assets/logoBase64";
import { ECS_STAMP_BASE64 } from "@/assets/stampBase64";
import { format } from "date-fns";
import jsPDF from "jspdf";

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
  registered: "bg-slate-100 text-slate-600 border-slate-200",
};

const typeLabels: Record<string, string> = {
  invoice: "Invoice Verification",
  complaint: "Complaint Record",
  staff: "Employee / Technician",
  branch: "Branch Office",
  salary_slip: "Salary Slip",
};

const typeIcons: Record<string, React.ReactNode> = {
  invoice: <FileText className="w-7 h-7 text-blue-600" />,
  complaint: <ClipboardList className="w-7 h-7 text-orange-600" />,
  staff: <User className="w-7 h-7 text-violet-600" />,
  branch: <Building2 className="w-7 h-7 text-emerald-600" />,
  salary_slip: <CreditCard className="w-7 h-7 text-indigo-600" />,
};

const getSummaryFields = (result: any) => {
  const d = result.data;
  switch (result.type) {
    case "invoice":
      return [
        { icon: <Hash className="w-4 h-4" />, label: "Invoice No.", value: d.number },
        { icon: <User className="w-4 h-4" />, label: "Client", value: d.customer },
        { icon: <Banknote className="w-4 h-4" />, label: "Amount", value: `Rs. ${Number(d.amount).toLocaleString()}` },
        { icon: <Tag className="w-4 h-4" />, label: "Status", value: d.status, isStatus: true },
      ];
    case "complaint":
      return [
        { icon: <Hash className="w-4 h-4" />, label: "Complaint No.", value: d.number },
        { icon: <User className="w-4 h-4" />, label: "Complainant", value: d.customer },
        { icon: <MapPin className="w-4 h-4" />, label: "Branch", value: d.branch },
        { icon: <Tag className="w-4 h-4" />, label: "Status", value: d.status, isStatus: true },
      ];
    case "staff":
      return [
        { icon: <User className="w-4 h-4" />, label: "Employee Name", value: d.name },
        { icon: <Tag className="w-4 h-4" />, label: "Designation", value: d.designation },
        { icon: <Building2 className="w-4 h-4" />, label: "Branch", value: d.branch },
        { icon: <CheckCircle2 className="w-4 h-4" />, label: "Status", value: d.status, isStatus: true },
      ];
    case "branch":
      return [
        { icon: <Building2 className="w-4 h-4" />, label: "Branch Name", value: d.name },
        { icon: <MapPin className="w-4 h-4" />, label: "City", value: d.city },
        { icon: <Phone className="w-4 h-4" />, label: "Phone", value: d.phone },
        { icon: <Tag className="w-4 h-4" />, label: "Status", value: d.status, isStatus: true },
      ];
    case "salary_slip":
      return [
        { icon: <User className="w-4 h-4" />, label: "Employee", value: d.staff },
        { icon: <Hash className="w-4 h-4" />, label: "Employee ID", value: d.employee_id },
        { icon: <Banknote className="w-4 h-4" />, label: "Net Salary", value: `Rs. ${Number(d.amount).toLocaleString()}` },
        { icon: <Tag className="w-4 h-4" />, label: "Status", value: d.status, isStatus: true },
      ];
    default:
      return [];
  }
};

const getDetailFields = (result: any) => {
  const d = result.data;
  const fmt = (v: string) => { try { return format(new Date(v), "dd MMMM yyyy"); } catch { return v; } };
  const authLabel = "Digitally Verified by Electric Complaint Solutions (ECS)";
  switch (result.type) {
    case "invoice":
      return [
        { label: "Invoice Number", value: d.number },
        { label: "Client Name", value: d.customer },
        { label: "Total Amount", value: `Rs. ${Number(d.amount).toLocaleString()}` },
        { label: "Payment Status", value: d.status, isStatus: true },
        { label: "Issue Date", value: d.date ? fmt(d.date) : "—" },
        { label: "Branch", value: d.branch || "Head Office" },
        { label: "Location / City", value: d.city || "—" },
        { label: "Organization", value: "Electric Complaint Solutions (ECS)" },
        { label: "Authenticated By", value: authLabel },
      ];
    case "complaint":
      return [
        { label: "Complaint Number", value: d.number },
        { label: "Complainant", value: d.customer },
        { label: "Status", value: d.status, isStatus: true },
        { label: "Registration Date", value: d.date ? fmt(d.date) : "—" },
        { label: "Handling Branch", value: d.branch },
        { label: "Location / City", value: d.city || "—" },
        { label: "Case Description", value: d.description || "—" },
        { label: "Organization", value: "Electric Complaint Solutions (ECS)" },
      ];
    case "staff":
      return [
        { label: "Employee Name", value: d.name },
        { label: "Employee ID", value: d.number },
        { label: "Designation", value: d.designation },
        { label: "Employment Status", value: d.status, isStatus: true },
        { label: "Joining Date", value: d.date ? fmt(d.date) : "—" },
        { label: "Assigned Branch", value: d.branch },
        { label: "CNIC (Partial)", value: d.cnic || "—" },
        { label: "Contact Number", value: d.phone || "—" },
        { label: "Organization", value: "Electric Complaint Solutions (ECS)" },
        { label: "Authenticated By", value: authLabel },
      ];
    case "branch":
      return [
        { label: "Branch Name", value: d.name },
        { label: "Branch Code", value: d.number },
        { label: "Status", value: d.status, isStatus: true },
        { label: "Primary City", value: d.city },
        { label: "Contact Phone", value: d.phone },
        { label: "Official Address", value: d.address },
        { label: "Organization", value: "Electric Complaint Solutions (ECS)" },
        { label: "Authenticated By", value: authLabel },
      ];
    case "salary_slip":
      return [
        { label: "Slip Number", value: d.number },
        { label: "Employee Name", value: d.staff },
        { label: "Employee ID", value: d.employee_id },
        { label: "Designation", value: d.designation },
        { label: "Period", value: `${d.month} ${d.year}` },
        { label: "Net Salary", value: `Rs. ${Number(d.amount).toLocaleString()}` },
        { label: "Payment Status", value: d.status, isStatus: true },
        { label: "Paid On", value: d.paid_at ? fmt(d.paid_at) : "—" },
        { label: "Assigned Branch", value: d.branch },
        { label: "Location / City", value: d.city || "—" },
        { label: "Organization", value: "Electric Complaint Solutions (ECS)" },
        { label: "Authenticated By", value: authLabel },
      ];
    default:
      return [];
  }
};

const downloadVerificationPDF = (result: any, verifiedId: string) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 260] });
  const pageW = 80;
  const margin = 5;
  let y = 0;

  // ── White background ─────────────────────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, 260, "F");

  // ── TOP green header bar ──────────────────────────────────────
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, pageW, 20, "F");

  // ── ECS Logo centered on the green bar ───────────────────────
  try {
    // white circle bg behind logo so it pops on green
    doc.setFillColor(255, 255, 255);
    doc.circle(pageW / 2, 10, 9, "F");
    doc.addImage(ECS_LOGO_BASE64, "PNG", (pageW - 14) / 2, 3, 14, 14);
  } catch (e) {
    // fallback: just text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ECS", pageW / 2, 12, { align: "center" });
  }
  y = 24;

  // ── Title ─────────────────────────────────────────────────────
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ECS VERIFICATION SLIP", pageW / 2, y, { align: "center" });
  y += 5;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Electric Complaint Solutions — Official Document", pageW / 2, y, { align: "center" });
  y += 4;
  doc.text(`Issued: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, pageW / 2, y, { align: "center" });
  y += 4;
  doc.text(`Ref ID: ${verifiedId}`, pageW / 2, y, { align: "center" });
  y += 5;

  // ── Dashed divider ────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.setLineDash([1.5, 1.5], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDash([], 0);
  y += 5;

  // ── RECORD VERIFIED label ─────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129); // emerald
  doc.text("** RECORD VERIFIED **", pageW / 2, y, { align: "center" });
  y += 5;

  // ── Green Verified STAMP image ────────────────────────────────
  try {
    const stampW = 30;
    const stampH = 30;
    doc.addImage(ECS_STAMP_BASE64, "PNG", (pageW - stampW) / 2, y, stampW, stampH);
    y += stampH + 3;
  } catch (e) {
    // Fallback drawn stamp
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(1.2);
    doc.circle(pageW / 2, y + 10, 10);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text("VERIFIED", pageW / 2, y + 9, { align: "center" });
    doc.text("ECS", pageW / 2, y + 13, { align: "center" });
    doc.setLineWidth(0.2);
    y += 23;
  }

  // ── Second dashed divider ─────────────────────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.setLineDash([1.5, 1.5], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDash([], 0);
  y += 5;

  // ── Record Details ────────────────────────────────────────────
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("RECORD DETAILS", pageW / 2, y, { align: "center" });
  y += 4;

  const fields = getDetailFields(result);
  fields.forEach((field) => {
    // Label
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(field.label.toUpperCase(), margin, y);
    y += 3.5;

    // Value
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const val = String(field.value || "—");
    const lines = doc.splitTextToSize(val, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += (lines.length * 3.8) + 1.5;

    // subtle line between fields
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.1);
    doc.line(margin, y, pageW - margin, y);
    doc.setLineWidth(0.2);
    y += 2;
  });

  y += 3;

  // ── Bottom dashed divider ─────────────────────────────────────
  doc.setDrawColor(180, 180, 180);
  doc.setLineDash([1.5, 1.5], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDash([], 0);
  y += 5;

  // ── Footer ────────────────────────────────────────────────────
  doc.setFillColor(16, 185, 129);
  doc.rect(0, y - 2, pageW, 0.5, "F"); // thin green top border on footer

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("Electric Complaint Solutions (ECS)", pageW / 2, y + 2, { align: "center" });
  y += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);

  // ASCII-safe footer lines (jsPDF only supports Latin-1 in built-in fonts)
  const footerLines: Array<{ text: string; bold?: boolean; divider?: boolean }> = [
    { text: "Address: 1st Floor, Zain Plaza, Islamabad" },
    { text: "Hotline: +92 310 1111 327" },
    { text: "Email: ecs.isbpak@gmail.com" },
    { text: "Web: www.ecs.it.com" },
    { text: "- - - - - - - - - - - - - - - - - - - -", divider: true },
    { text: "Digitally Verified by Electric Complaint Solutions (ECS)", bold: true },
    { text: "- - - - - - - - - - - - - - - - - - - -", divider: true },
    { text: "Developed By Devionic (Private) Limited" },
    { text: "WhatsApp: +92-317-7121841" },
    { text: "www.devionic.com | info@devionic.com" },
  ];
  footerLines.forEach(({ text, bold, divider }) => {
    doc.setFontSize(divider ? 5 : 6);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    if (bold) doc.setTextColor(15, 23, 42); else doc.setTextColor(100, 116, 139);
    const wrapped = doc.splitTextToSize(text, pageW - margin * 2);
    doc.text(wrapped, pageW / 2, y, { align: "center" });
    y += (wrapped.length * 3.5) + 0.5;
  });

  doc.save(`ECS-Verification-${verifiedId}-${Date.now()}.pdf`);
};

const StatusBadge = ({ value }: { value: string }) => (
  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase border ${statusColors[value?.toLowerCase()] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
    {["paid", "solved", "active", "completed"].includes(value?.toLowerCase()) && <CheckCircle2 className="w-3 h-3" />}
    {value || "—"}
  </span>
);

const PublicVerify = ({ onClose, overrideId }: { onClose?: () => void, overrideId?: string }) => {
  const [searchParams] = useSearchParams();
  const { id: pathId } = useParams();
  const navigate = useNavigate();
  const initialId = overrideId || pathId || searchParams.get("id") || "";
  const [input, setInput] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const performVerification = async (verifyId: string) => {
    if (!verifyId.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowDetail(false);

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
    const id = overrideId || pathId || searchParams.get("id");
    if (id) {
      setInput(id);
      performVerification(id);
    }
  }, [overrideId, pathId, searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      navigate(`/verify?id=${input.trim().toUpperCase()}`);
    }
  };

  const verifiedId = pathId || searchParams.get("id") || input;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans">
      <div className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto bg-[#FDFDFF] rounded-[2.5rem] shadow-2xl">
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-emerald-400/5 rounded-full blur-[80px]" />
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `radial-gradient(#1e40af 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative z-10 p-6 sm:p-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-10 gap-4">
            <Link to="/" onClick={(e) => { e.preventDefault(); if (onClose) onClose(); else navigate('/'); }} className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-md border border-slate-100 flex items-center justify-center transition-transform group-hover:scale-110">
                <img src={logo} alt="ECS Logo" className="h-7 w-auto" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">ECS <span className="text-primary">Verify</span></h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Authenticity Guaranteed</p>
              </div>
            </Link>
            <button onClick={() => { if (onClose) onClose(); else navigate('/'); }} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

        {/* Hero */}
        {!result && (
          <div className="text-center mb-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[11px] font-black uppercase tracking-wider mb-4">
              <ShieldCheck className="w-4 h-4" /> SECURE DOCUMENT VERIFICATION SYSTEM
            </motion.div>
            <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Trust but <span className="text-primary">Verify.</span></h2>
            <p className="text-slate-500 max-w-lg mx-auto leading-relaxed font-medium">
              Enter the verification ID printed on your document or scan the QR code to confirm its authenticity.
            </p>
          </div>
        )}

        {/* Search Box */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`max-w-2xl mx-auto ${result ? 'mb-6' : 'mb-10'}`}>
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 group-focus-within:bg-primary/5 group-focus-within:border-primary/20 group-focus-within:text-primary transition-all">
              <ScanLine className="w-5 h-5" />
            </div>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter ID (e.g. EMP-101, INV-2034, CMP-102)"
              className="w-full h-20 pl-20 pr-36 bg-white border-2 border-slate-100 rounded-[2rem] text-lg font-bold text-slate-800 shadow-md focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-slate-300 placeholder:font-medium uppercase tracking-wide"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-3 top-3 bottom-3 px-8 bg-primary text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Verify"}
            </button>
          </form>
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center py-16">
              <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Scanning Database...</p>
            </motion.div>
          )}

          {!loading && result && (
            <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto rounded-[2.5rem] bg-white border border-slate-100 shadow-2xl overflow-hidden">

              {/* Verified Header */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 h-48 w-48 bg-white/10 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center p-3 shrink-0">
                      {typeIcons[result.type]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <BadgeCheck className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Verified Authentic Record</span>
                      </div>
                      <p className="text-xs text-white/70 font-semibold mb-0.5">{typeLabels[result.type]}</p>
                      <h3 className="text-2xl font-black tracking-tight">{result.data.number || result.data.name}</h3>
                    </div>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Print
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ perspective: 1200 }}>
                <AnimatePresence mode="wait">
                  {!showDetail ? (
                    <motion.div
                      key="summary"
                      initial={{ rotateY: -90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={{ rotateY: 90, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      {/* Summary Card */}
                      <div className="p-8 grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-slate-100">
                        {getSummaryFields(result).map((f, i) => (
                          <div key={i} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-slate-400">
                              {f.icon}
                              <span className="text-[10px] font-bold uppercase tracking-wider">{f.label}</span>
                            </div>
                            {(f as any).isStatus
                              ? <StatusBadge value={f.value} />
                              : <span className="text-base font-bold text-slate-800 truncate">{f.value || "—"}</span>
                            }
                          </div>
                        ))}
                      </div>

                      <div className="p-10 flex flex-col items-center justify-center bg-slate-50/50">
                        <button
                          onClick={() => setShowDetail(true)}
                          className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-wider overflow-hidden hover:scale-105 transition-all shadow-lg hover:shadow-slate-900/20"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <span className="relative z-10">View Detailed Report</span>
                          <ChevronDown className="w-5 h-5 relative z-10 group-hover:translate-y-1 transition-transform" />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="detail"
                      initial={{ rotateY: -90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={{ rotateY: 90, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ transformStyle: "preserve-3d" }}
                      className="p-8 bg-slate-50/50"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-lg font-black text-slate-900 tracking-tight">Complete Record Details</h4>
                        <button
                          onClick={() => setShowDetail(false)}
                          className="text-sm font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4" /> Back to Summary
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getDetailFields(result).map((field, i) => (
                          <div
                            key={i}
                            className="group relative rounded-2xl bg-white p-5 hover:bg-emerald-50/50 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col gap-1.5"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 relative z-10">{field.label}</span>
                            <div className="relative z-10">
                              {(field as any).isStatus
                                ? <StatusBadge value={field.value} />
                                : <span className="text-sm font-bold text-slate-800 leading-tight">{field.value || "—"}</span>
                              }
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-10 flex flex-col sm:flex-row gap-4">
                        <button
                          onClick={() => downloadVerificationPDF(result, verifiedId)}
                          className="flex-1 group relative inline-flex items-center justify-center gap-2 px-8 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest overflow-hidden hover:scale-[1.02] transition-all shadow-xl shadow-emerald-500/20"
                        >
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                          <Download className="w-5 h-5 relative z-10 group-hover:-translate-y-1 transition-transform" />
                          <span className="relative z-10">Download Thermal PDF Report</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer stamp */}
              <div className="m-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-emerald-500 shrink-0" />
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Digitally Verified by Electric Complaint Solutions (ECS)</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 bg-white px-4 py-2 rounded-xl border border-emerald-100 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                    <BadgeCheck className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Digital Stamp</span>
                    <span className="text-xs font-black text-slate-700">ECS-SECURE</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {!loading && error && (
            <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto p-8 rounded-[2rem] bg-rose-50 border border-rose-100 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-md border border-rose-100 flex items-center justify-center mx-auto mb-6 text-rose-500">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-rose-700 mb-2">Record Not Found</h3>
              <p className="text-sm font-medium text-rose-600/70 mb-8 leading-relaxed">
                We couldn't find any documents matching "<strong>{input}</strong>". Please check the ID and try again.
              </p>
              <button
                onClick={() => { setInput(""); setError(null); }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-rose-200 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-100 transition-all"
              >
                Clear Search
              </button>
            </motion.div>
          )}

          {!loading && !result && !error && (
            <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-4">
              {[
                { icon: FileText, title: "Invoices & Complaints", desc: "Verify any ECS issued invoice or complaint record instantly." },
                { icon: User, title: "Technicians & Staff", desc: "Confirm employee credentials and official employment status." },
                { icon: Building2, title: "Branch Offices", desc: "Verify the authenticity of ECS branch office information." },
              ].map((f, i) => (
                <div key={i} className="p-7 rounded-[2rem] bg-white border border-slate-100 hover:border-primary/20 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all mb-5">
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-slate-800 mb-2">{f.title}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </div>
  );
};

export default PublicVerify;
