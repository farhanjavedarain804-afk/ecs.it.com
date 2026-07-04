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

const maskPhone = (val?: string) => val ? val.replace(/.(?=.{4})/g, '*') : '—';
const maskCNIC = (val?: string) => {
  if (!val) return '—';
  const parts = val.split('-');
  if (parts.length === 3) return `${parts[0]}-*******-${parts[2]}`;
  return val.substring(0, 4) + '*******' + val.substring(val.length - 2);
};
const maskAmount = (val?: string | number) => val ? 'Rs. ***,***' : '—';
const maskEmail = (val?: string) => {
  if (!val) return '—';
  const [name, domain] = val.split('@');
  if (!domain) return val.replace(/.(?=.{4})/g, '*');
  return `${name.substring(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
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
        { icon: <Phone className="w-4 h-4" />, label: "Phone", value: maskPhone(d.phone) },
        { icon: <Tag className="w-4 h-4" />, label: "Status", value: d.status, isStatus: true },
      ];
    case "salary_slip":
      return [
        { icon: <User className="w-4 h-4" />, label: "Employee", value: d.staff },
        { icon: <Hash className="w-4 h-4" />, label: "Employee ID", value: d.employee_id },
        { icon: <Banknote className="w-4 h-4" />, label: "Net Salary", value: maskAmount(d.amount) },
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
        ...(d.email ? [{ label: "Client Email", value: maskEmail(d.email) }] : []),
        ...(d.phone ? [{ label: "Client Phone", value: maskPhone(d.phone) }] : []),
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
        ...(d.email ? [{ label: "Complainant Email", value: maskEmail(d.email) }] : []),
        ...(d.phone ? [{ label: "Complainant Phone", value: maskPhone(d.phone) }] : []),
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
        { label: "CNIC", value: maskCNIC(d.cnic) },
        { label: "Contact Number", value: maskPhone(d.phone) },
        ...(d.email ? [{ label: "Email Address", value: maskEmail(d.email) }] : []),
        { label: "Organization", value: "Electric Complaint Solutions (ECS)" },
        { label: "Authenticated By", value: authLabel },
      ];
    case "branch":
      return [
        { label: "Branch Name", value: d.name },
        { label: "Branch Code", value: d.number },
        { label: "Status", value: d.status, isStatus: true },
        { label: "Primary City", value: d.city },
        { label: "Contact Phone", value: maskPhone(d.phone) },
        ...(d.email ? [{ label: "Branch Email", value: maskEmail(d.email) }] : []),
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
        { label: "Net Salary", value: maskAmount(d.amount) },
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

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, 260, "F");

  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, 24, "F");

  try {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect((pageW - 22) / 2, 1, 22, 22, 3, 3, "F");
    doc.addImage(ECS_LOGO_BASE64, "PNG", (pageW - 18) / 2, 3, 18, 18);
  } catch (e) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ECS", pageW / 2, 14, { align: "center" });
  }
  y = 28;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ECS VERIFICATION SLIP", pageW / 2, y, { align: "center" });
  y += 5;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Electric Complaint Solutions - Official Document", pageW / 2, y, { align: "center" });
  y += 4;
  doc.text(`Issued: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, pageW / 2, y, { align: "center" });
  y += 4;
  doc.text(`Ref ID: ${verifiedId}`, pageW / 2, y, { align: "center" });
  y += 6;

  doc.setDrawColor(200, 200, 200);
  doc.setLineDash([1.5, 1.5], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDash([], 0);
  y += 5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129); // emerald
  doc.text("** RECORD VERIFIED **", pageW / 2, y, { align: "center" });
  y += 5;

  // â”€â”€ Green Verified STAMP image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Second dashed divider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setDrawColor(200, 200, 200);
  doc.setLineDash([1.5, 1.5], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDash([], 0);
  y += 5;

  // â”€â”€ Record Details â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    const val = String(field.value || "â€”");
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

  // â”€â”€ Bottom dashed divider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setDrawColor(180, 180, 180);
  doc.setLineDash([1.5, 1.5], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDash([], 0);
  y += 5;

  // â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    {value || "â€”"}
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md font-sans">
      {/* Modal Sheet */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="relative w-full sm:max-w-4xl max-h-[96vh] sm:max-h-[90vh] overflow-hidden sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col"
        style={{ background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)" }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-emerald-400 to-teal-500 shrink-0" />

        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <img src={logo} alt="ECS" className="h-8 w-auto" />
            <div>
              <p className="text-sm font-black text-slate-800 leading-none">ECS <span className="text-primary">Verify</span></p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Secure Authenticity Check</p>
            </div>
          </div>
          <button
            onClick={() => { if (onClose) onClose(); else navigate('/'); }}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors group"
          >
            <X className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-colors" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 sm:p-8 space-y-6">

            {/* Search bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <ScanLine className="w-5 h-5 text-slate-400" />
              </div>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value.toUpperCase())}
                  placeholder="Enter Document ID  (e.g. EMP-101, INV-2034, CMP-102)"
                  className="flex-1 h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300 uppercase tracking-wide"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="h-14 px-7 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shrink-0"
                >
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Search className="w-4 h-4" /> Verify</>
                  }
                </button>
              </form>
            </div>

            {/* States */}
            <AnimatePresence mode="wait">

              {/* Loading */}
              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                    <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Scanning Records</p>
                    <p className="text-xs text-slate-400 mt-1">Querying secure ECS databaseâ€¦</p>
                  </div>
                </motion.div>
              )}

              {/* Error / Not found */}
              {!loading && error && (
                <motion.div key="error" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center text-center py-10 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">No Record Found</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs">
                      No document matching <span className="font-bold text-slate-700">"{input}"</span> was found. Check the ID and try again.
                    </p>
                  </div>
                  <button
                    onClick={() => { setInput(""); setError(null); }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 transition-colors"
                  >
                    Clear & Try Again
                  </button>
                </motion.div>
              )}

              {/* Result */}
              {!loading && result && (
                <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-5">

                  {/* Verified badge strip */}
                  <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1/2 bg-white/5 rounded-l-full blur-2xl" />
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                      <BadgeCheck className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 relative z-10">
                      <p className="text-xs font-black uppercase tracking-widest text-emerald-100">Verified Authentic Record</p>
                      <p className="text-lg font-black truncate mt-0.5">{result.data.number || result.data.name}</p>
                      <p className="text-xs text-white/70 font-semibold">{typeLabels[result.type]}</p>
                    </div>
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center relative z-10">
                      {typeIcons[result.type]}
                    </div>
                  </div>

                  {/* Summary fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {getSummaryFields(result).map((f, i) => (
                      <div key={i} className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          {f.icon}
                          <span className="text-[9px] font-bold uppercase tracking-wider">{f.label}</span>
                        </div>
                        {(f as any).isStatus
                          ? <StatusBadge value={f.value} />
                          : <span className="text-sm font-black text-slate-800 truncate leading-tight">{f.value || "â€”"}</span>
                        }
                      </div>
                    ))}
                  </div>

                  {/* Toggle: Summary â†” Details */}
                  <AnimatePresence mode="wait">
                    {!showDetail ? (
                      <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex justify-center pt-2">
                        <button
                          onClick={() => setShowDetail(true)}
                          className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 hover:bg-primary text-white rounded-2xl font-bold text-sm uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-95"
                        >
                          <FileText className="w-4 h-4" />
                          View Detailed Report
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div key="detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="space-y-4">
                        {/* Detail header */}
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Complete Record</h4>
                          <button
                            onClick={() => setShowDetail(false)}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-primary transition-colors"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" /> Summary
                          </button>
                        </div>

                        {/* Detail grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {getDetailFields(result).map((field, i) => (
                            <div key={i} className="flex flex-col gap-1 bg-slate-50 hover:bg-white rounded-xl p-4 transition-colors">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{field.label}</span>
                              {(field as any).isStatus
                                ? <StatusBadge value={field.value} />
                                : <span className="text-sm font-bold text-slate-800 leading-snug">{field.value || "â€”"}</span>
                              }
                            </div>
                          ))}
                        </div>

                        {/* Download button */}
                        <button
                          onClick={() => downloadVerificationPDF(result, verifiedId)}
                          className="w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.99] hover:shadow-emerald-500/40"
                        >
                          <Download className="w-5 h-5" />
                          Download Thermal PDF Report
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Digital seal footer */}
                  <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                        <BadgeCheck className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Digitally Verified</p>
                        <p className="text-[10px] text-emerald-600/70 font-medium">by Electric Complaint Solutions (ECS)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Globe className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-700">www.ecs.it.com</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Idle / empty state */}
              {!loading && !result && !error && (
                <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-6">
                  <p className="text-center text-xs text-slate-400 font-semibold uppercase tracking-widest">What can be verified?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon: FileText, color: "bg-blue-50 text-blue-500", title: "Invoices & Complaints", desc: "Verify any ECS issued invoice or registered complaint record." },
                      { icon: User, color: "bg-violet-50 text-violet-500", title: "Technicians & Staff", desc: "Confirm employee credentials and active employment status." },
                      { icon: Building2, color: "bg-emerald-50 text-emerald-500", title: "Branch Offices", desc: "Verify authenticity of any ECS branch office." },
                    ].map((f, i) => (
                      <div key={i} className="flex flex-col gap-3 p-5 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-md transition-all group">
                        <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center`}>
                          <f.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 mb-1">{f.title}</p>
                          <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Trust badges */}
                  <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
                    {[
                      { icon: ShieldCheck, label: "SSL Secured" },
                      { icon: BadgeCheck, label: "Real-time Check" },
                      { icon: Globe, label: "www.ecs.it.com" },
                    ].map((b, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-slate-400">
                        <b.icon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{b.label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3 border-t border-slate-100 flex items-center justify-between gap-3 bg-white">
          <p className="text-[10px] text-slate-400 font-medium">
            Developed by <span className="font-bold text-slate-600">Devionic (Private) Limited</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium hidden sm:block">+92-317-7121841 | www.devionic.com</p>
        </div>
      </motion.div>
    </div>
  );
};

export default PublicVerify;
