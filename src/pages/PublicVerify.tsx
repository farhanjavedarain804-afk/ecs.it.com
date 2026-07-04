import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck, Search, ScanLine, FileText, ClipboardList,
  User, Building2, BadgeCheck, AlertCircle, ArrowLeft,
  Globe, Phone, CheckCircle2, Download, ChevronDown, ChevronUp,
  CreditCard, Calendar, MapPin, Hash, Banknote, Tag
} from "lucide-react";
import { useParams } from "react-router-dom";
import logo from "@/assets/logo.png";
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

// --- Summary fields per type ---
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

// --- Detailed report fields per type ---
const getDetailFields = (result: any) => {
  const d = result.data;
  const fmt = (v: string) => { try { return format(new Date(v), "dd MMMM yyyy"); } catch { return v; } };
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
        { label: "Authenticated By", value: "ECS Secure Verification System" },
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
        { label: "Authenticated By", value: "ECS Secure Verification System" },
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
        { label: "Authenticated By", value: "ECS Secure Verification System" },
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
        { label: "Authenticated By", value: "ECS Secure Verification System" },
      ];
    default:
      return [];
  }
};

// --- PDF Generator ---
const downloadVerificationPDF = (result: any, verifiedId: string) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 0;

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, 297, "F");

  // Green header bar
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, 48, "F");

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("ECS VERIFICATION REPORT", margin, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Electric Complaint Solutions — Official Authenticity Record", margin, 28);
  doc.text(`Verified ID: ${verifiedId}`, margin, 36);
  doc.text(`Verification Date: ${format(new Date(), "dd MMMM yyyy, HH:mm")}`, margin, 43);

  y = 60;

  // Verified badge box
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(margin, y, pageW - margin * 2, 16, 3, 3, "FD");
  doc.setTextColor(5, 150, 105);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("✓  RECORD VERIFIED AUTHENTIC — SEALED BY ECS SECURE SYSTEM", margin + 4, y + 10.5);

  y += 26;

  // Record type heading
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(typeLabels[result.type] || "Document Record", margin, y);
  y += 8;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Detail fields
  const fields = getDetailFields(result);
  doc.setFontSize(9);
  fields.forEach((field) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(field.label.toUpperCase(), margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const val = String(field.value || "—");
    const lines = doc.splitTextToSize(val, pageW - margin * 2 - 50);
    doc.text(lines, pageW - margin, y, { align: "right" });
    y += 8;
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y - 1, pageW - margin, y - 1);
  });

  y += 10;

  // Footer
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, pageW - margin * 2, 30, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("This document is an official verification certificate issued by Electric Complaint Solutions.", margin + 4, y + 8);
  doc.text("Any tampering or alteration of this document is illegal and punishable by law.", margin + 4, y + 14);
  doc.text("Head Office: 1st Floor, Zain Plaza, Islamabad | Tel: +92 310 1111 327 | Email: ecs.isbpak@gmail.com", margin + 4, y + 20);
  doc.text("Developed By: Devionic (Private) Limited | www.devionic.com", margin + 4, y + 26);

  doc.save(`ECS-Verification-${verifiedId}-${Date.now()}.pdf`);
};

// --- Status Badge ---
const StatusBadge = ({ value }: { value: string }) => (
  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase border ${statusColors[value?.toLowerCase()] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
    {["paid", "solved", "active", "completed"].includes(value?.toLowerCase()) && <CheckCircle2 className="w-3 h-3" />}
    {value || "—"}
  </span>
);

const PublicVerify = () => {
  const [searchParams] = useSearchParams();
  const { id: pathId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(pathId || searchParams.get("id") || "");
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

  const verifiedId = pathId || searchParams.get("id") || input;

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-800 font-sans">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-emerald-400/5 rounded-full blur-[80px]" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `radial-gradient(#1e40af 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 gap-4">
          <Link to="/login" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-md border border-slate-100 flex items-center justify-center transition-transform group-hover:scale-110">
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

        {/* Hero */}
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

        {/* Search Box */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto mb-10">
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
              className="max-w-3xl mx-auto rounded-[2.5rem] bg-white border border-slate-100 shadow-xl overflow-hidden">

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
                      onClick={() => downloadVerificationPDF(result, verifiedId)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-700 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg hover:bg-emerald-50 transition-all"
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Print
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-100">
                {getSummaryFields(result).map((f, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      {f.icon}
                      <span className="text-[10px] font-bold uppercase tracking-wider">{f.label}</span>
                    </div>
                    {(f as any).isStatus
                      ? <StatusBadge value={f.value} />
                      : <span className="text-sm font-bold text-slate-800 truncate">{f.value || "—"}</span>
                    }
                  </div>
                ))}
              </div>

              {/* View Detailed Report Toggle */}
              <div className="px-6 py-4">
                <button
                  onClick={() => setShowDetail((v) => !v)}
                  className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl bg-slate-50 hover:bg-primary/5 border border-slate-100 hover:border-primary/20 transition-all group"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-primary">
                    {showDetail ? "Hide Detailed Report" : "View Detailed Report"}
                  </span>
                  <span className="text-slate-400 group-hover:text-primary transition-colors">
                    {showDetail ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </span>
                </button>

                <AnimatePresence>
                  {showDetail && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 rounded-xl border border-slate-100 overflow-hidden">
                        {getDetailFields(result).map((field, i) => (
                          <div
                            key={i}
                            className={`flex items-start justify-between gap-4 px-5 py-3.5 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}
                          >
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 shrink-0 pt-0.5">{field.label}</span>
                            {(field as any).isStatus
                              ? <StatusBadge value={field.value} />
                              : <span className="text-sm font-semibold text-slate-800 text-right">{field.value || "—"}</span>
                            }
                          </div>
                        ))}
                      </div>

                      {/* Download CTA at bottom */}
                      <button
                        onClick={() => downloadVerificationPDF(result, verifiedId)}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-black text-sm uppercase tracking-wider shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition-all"
                      >
                        <Download className="w-5 h-5" />
                        Download PDF Verification Report
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer stamp */}
              <div className="mx-6 mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Public Authenticated Record</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
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

      {/* Footer */}
      <footer className="relative mt-auto py-10 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <h3 className="text-base font-black text-slate-900 tracking-tight">Electric Complaint Solutions</h3>
          <div className="flex flex-wrap justify-center gap-6">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-400"><Phone className="w-4 h-4" /> +92 310 1111 327</span>
            <span className="flex items-center gap-2 text-sm font-bold text-slate-400"><Globe className="w-4 h-4" /> devionic.com</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
            © 2026 ECS & Devionic (Private) Limited. All documentation verified through this platform is proprietary.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicVerify;
