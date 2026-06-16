import { motion } from "framer-motion";
import {
  ClipboardList,
  Users,
  BarChart3,
  Package,
  FileText,
  Shield,
  Building2,
  Wallet,
} from "lucide-react";

const modules = [
  {
    icon: ClipboardList,
    title: "Complaint Management",
    desc: "Auto-generated complaint numbers, priority tracking, photo upload, GPS pinning, and real-time status updates.",
    gradient: "from-primary/10 to-secondary/10",
    iconColor: "text-primary",
  },
  {
    icon: Building2,
    title: "Branch Administration",
    desc: "Multi-branch management with attendance, daily operations, and branch-level analytics.",
    gradient: "from-secondary/10 to-primary/10",
    iconColor: "text-secondary",
  },
  {
    icon: Users,
    title: "Staff Management",
    desc: "Complete HR module with profiles, contracts, salary, commission rules, and payroll generation.",
    gradient: "from-info/10 to-primary/10",
    iconColor: "text-info",
  },
  {
    icon: Wallet,
    title: "Financial Module",
    desc: "Income & expense tracking, profit/loss reports, payment status management, and cash/bank ledger.",
    gradient: "from-accent/10 to-warning/10",
    iconColor: "text-accent",
  },
  {
    icon: Package,
    title: "Inventory Management",
    desc: "SKU & barcode system, stock in/out, low stock alerts, supplier management, and purchase orders.",
    gradient: "from-success/10 to-info/10",
    iconColor: "text-success",
  },
  {
    icon: FileText,
    title: "Invoice & Quotation",
    desc: "Auto-generated invoices with QR codes, GST calculation, PDF download, and email/WhatsApp sharing.",
    gradient: "from-primary/10 to-info/10",
    iconColor: "text-primary",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    desc: "Revenue graphs, technician performance, complaint resolution time, and exportable reports (PDF/Excel/CSV).",
    gradient: "from-accent/10 to-success/10",
    iconColor: "text-accent",
  },
  {
    icon: Shield,
    title: "Security & Audit",
    desc: "Role-based access, login history, activity logs, IP tracking, and complete audit trail system.",
    gradient: "from-destructive/10 to-secondary/10",
    iconColor: "text-destructive",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-28 bg-background relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(hsl(230 75% 55%) 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }} />

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
            Powerful Modules
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold font-display text-foreground mt-3">
            Everything You Need to{" "}
            <span className="text-gradient-brand">Manage</span>
          </h2>
          <p className="text-muted-foreground mt-5 max-w-xl mx-auto text-base">
            A complete ERP system built for electric service companies with multi-branch support.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          id="modules"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {modules.map((mod) => (
            <motion.div
              key={mod.title}
              variants={item}
              className={`group rounded-2xl border border-border bg-gradient-to-br ${mod.gradient} p-6 hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 hover:border-primary/20`}
            >
              <div className="w-11 h-11 rounded-xl bg-card shadow-sm flex items-center justify-center mb-4">
                <mod.icon className={`w-5 h-5 ${mod.iconColor}`} />
              </div>
              <h3 className="text-base font-semibold font-display text-card-foreground mb-2">{mod.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{mod.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
