import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Zap, Shield, QrCode, ArrowRight, CheckCircle2, Star, 
  ClipboardList, Building2, Users, Wallet, Package, FileText, BarChart3,
  Menu, X, Search, ShieldCheck
} from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";

const modules = [
  { icon: ClipboardList, title: "Complaint Management", desc: "Auto-generated IDs, priority tracking, photo upload, GPS, and real-time status updates.", gradient: "from-primary to-secondary" },
  { icon: Building2, title: "Branch Administration", desc: "Multi-branch management with attendance, daily operations, and branch-level analytics.", gradient: "from-secondary to-primary" },
  { icon: Users, title: "Staff & HR", desc: "Employee management with auto IDs, CNIC, designation, salary, attendance tracking.", gradient: "from-info to-primary" },
  { icon: Wallet, title: "Financial Module", desc: "Income & expense tracking, cash/bank ledger, profit/loss, and auto balance calculation.", gradient: "from-accent to-warning" },
  { icon: Package, title: "Inventory", desc: "Auto-ID items, stock in/out, assigned technicians, remaining stock auto-calculation.", gradient: "from-success to-info" },
  { icon: FileText, title: "Invoices & Quotations", desc: "Auto-generated invoices with QR codes, line items, PDF download, and verification.", gradient: "from-primary to-info" },
  { icon: BarChart3, title: "Analytics & Reports", desc: "Revenue graphs, technician performance, complaint resolution, exportable reports.", gradient: "from-accent to-success" },
  { icon: Shield, title: "Security & Audit", desc: "Role-based access, login history, activity logs, IP tracking, and audit trail.", gradient: "from-destructive to-secondary" },
];

const Index = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <motion.nav initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-7xl px-4 mt-4">
          <div className="flex items-center justify-between h-14 px-5 rounded-2xl glass-dark">
            <Link to="/" className="flex items-center gap-3">
              <div className="bg-white rounded-lg p-1">
                <img src={logo} alt="ECS Logo" className="h-7 w-auto" />
              </div>
              <span className="text-sm font-bold text-primary-foreground font-display hidden sm:block">ECS</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-xs font-medium text-primary-foreground/50 hover:text-primary-foreground transition-colors">Features</a>
              <a href="#modules" className="text-xs font-medium text-primary-foreground/50 hover:text-primary-foreground transition-colors">Modules</a>
              <Link to="/verify" className="text-xs font-medium text-primary-foreground/50 hover:text-primary-foreground transition-colors">Verify Invoice</Link>
              <Link to="/login" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all glow-blue">
                Login
              </Link>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-primary-foreground">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden mx-4 mt-2">
            <div className="glass-dark rounded-2xl p-4 flex flex-col gap-2">
              <a href="#features" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-primary-foreground/60 py-2 px-3 rounded-xl hover:bg-primary/10 transition-colors">Features</a>
              <a href="#modules" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-primary-foreground/60 py-2 px-3 rounded-xl hover:bg-primary/10 transition-colors">Modules</a>
              <Link to="/verify" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-primary-foreground/60 py-2 px-3 rounded-xl hover:bg-primary/10 transition-colors">Verify Invoice</Link>
              <Link to="/login" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground mt-1">Login</Link>
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.04] animate-grid" style={{
            backgroundImage: `linear-gradient(hsl(230 75% 55% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(230 75% 55% / 0.4) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }} />
        </div>
        <div className="absolute top-[15%] left-[10%] w-[400px] h-[400px] rounded-full bg-primary/8 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[15%] right-[10%] w-[500px] h-[500px] rounded-full bg-secondary/8 blur-[150px] animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[180px] animate-pulse-slow" style={{ animationDelay: "4s" }} />
        
        <motion.div className="absolute top-[20%] right-[15%] w-20 h-20 border border-primary/20 rounded-2xl rotate-12"
          animate={{ rotate: [12, -12, 12], y: [0, -15, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute bottom-[25%] left-[12%] w-16 h-16 border border-accent/20 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute top-[40%] left-[8%] w-3 h-3 bg-accent/40 rounded-full"
          animate={{ y: [0, -30, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute top-[30%] right-[25%] w-2 h-2 bg-primary/40 rounded-full"
          animate={{ y: [0, 20, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} />

        <div className="container relative z-10 mx-auto px-4 pt-28 pb-20">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 backdrop-blur-sm px-5 py-2 mb-8">
                <Star className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider">Multi-Branch ERP Platform</span>
              </div>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-8xl font-bold font-display tracking-tight text-primary-foreground leading-[1.05]">
              Electric Complaint
              <br />
              <span className="text-gradient-gold">Solutions</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
              className="text-base sm:text-lg text-primary-foreground/50 max-w-2xl mx-auto mt-8 mb-12 leading-relaxed">
              Your satisfaction is our responsibility. Manage complaints, staff, branches, billing, inventory, and analytics — all from one powerful platform.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login" className="group inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 glow-blue hover:-translate-y-0.5">
                Get Started <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/verify" className="inline-flex items-center gap-2 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 backdrop-blur-sm px-8 py-4 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10 transition-all duration-300">
                <QrCode className="w-4 h-4" /> Verify Invoice
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.5 }}
              className="flex items-center justify-center gap-6 mt-10 text-primary-foreground/30 text-xs">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Free Setup</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Multi-Branch</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> QR Verification</span>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.6 }}
              className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { value: "50+", label: "Active Branches" },
                { value: "10K+", label: "Complaints Resolved" },
                { value: "99.9%", label: "System Uptime" },
                { value: "24/7", label: "Live Support" },
              ].map((stat) => (
                <div key={stat.label} className="glass-dark rounded-2xl p-5 text-center hover:border-primary/30 transition-colors">
                  <div className="text-2xl sm:text-3xl font-bold font-display text-accent">{stat.value}</div>
                  <div className="text-xs text-primary-foreground/40 mt-1.5 font-medium">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features Section */}
      <section id="features" className="py-28 bg-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(hsl(230 75% 55%) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }} />
        <div className="container mx-auto px-4 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
              Powerful Modules
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold font-display text-foreground mt-3">
              Everything You Need to <span className="text-gradient-brand">Manage</span>
            </h2>
            <p className="text-muted-foreground mt-5 max-w-xl mx-auto text-base">
              A complete ERP system built for electric service companies with multi-branch support.
            </p>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            id="modules" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {modules.map((mod) => (
              <motion.div key={mod.title} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
                className="group rounded-2xl border border-border bg-card p-6 hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 hover:border-primary/20">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center mb-4 shadow-sm`}>
                  <mod.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="text-base font-semibold font-display text-card-foreground mb-2">{mod.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{mod.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Verification Section */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(230 75% 55% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(230 75% 55% / 0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-secondary/5 blur-[100px]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary/10 border border-secondary/20 px-4 py-1.5 text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider mb-4">
                Fraud Prevention
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold font-display text-primary-foreground mt-3">
                Invoice <span className="text-gradient-gold">Verification</span>
              </h2>
              <p className="text-primary-foreground/40 mt-5 max-w-xl mx-auto text-base">
                Every invoice includes a unique QR code for instant authenticity verification.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
              {[
                { icon: QrCode, title: "Scan QR Code", desc: "Scan the QR code on any ECS invoice for instant verification" },
                { icon: Search, title: "Enter Invoice #", desc: "Type in the invoice number to check its authenticity" },
                { icon: ShieldCheck, title: "Real-Time Status", desc: "See payment status, amount, branch, and customer details" },
              ].map((step, i) => (
                <div key={step.title} className="glass-dark rounded-2xl p-6 text-center hover:border-primary/30 transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 text-accent text-[10px] font-bold mb-3">{i + 1}</div>
                  <h3 className="text-lg font-semibold font-display text-primary-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-primary-foreground/40">{step.desc}</p>
                </div>
              ))}
            </motion.div>

            <div className="text-center">
              <Link to="/verify" className="group inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground hover:shadow-xl transition-all duration-300 glow-blue hover:-translate-y-0.5">
                Verify an Invoice <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white rounded-lg p-1">
                  <img src={logo} alt="ECS" className="h-9 w-auto" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Your satisfaction is our responsibility. A complete ERP system built for electric service companies.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                1st Floor, Zain Plaza Lehtrar Road, Khanna Pull, Islamabad, Punjab, Pakistan
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tel: +923-10-1111-327 | Email: ecs.isbpak@gmail.com
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Quick Links</h4>
              <div className="flex flex-col gap-2.5">
                <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
                <a href="#modules" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Modules</a>
                <Link to="/verify" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Verify Invoice</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Access</h4>
              <div className="flex flex-col gap-2.5">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Login</Link>
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Register</Link>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">© 2026 Electric Complaint Solutions. All rights reserved.</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">Built with <Zap className="w-3 h-3 text-accent" /> ECS Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
