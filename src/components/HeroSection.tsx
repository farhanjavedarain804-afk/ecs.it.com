import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Zap, Shield, QrCode, ArrowRight, CheckCircle2, Star } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-hero-gradient">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.04] animate-grid"
          style={{
            backgroundImage: `linear-gradient(hsl(230 75% 55% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(230 75% 55% / 0.4) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* Floating orbs with purple/blue brand colors */}
      <div className="absolute top-[15%] left-[10%] w-[400px] h-[400px] rounded-full bg-primary/8 blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-[15%] right-[10%] w-[500px] h-[500px] rounded-full bg-secondary/8 blur-[150px] animate-pulse-slow" style={{ animationDelay: "2s" }} />
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[180px] animate-pulse-slow" style={{ animationDelay: "4s" }} />
      
      {/* Decorative shapes */}
      <motion.div 
        className="absolute top-[20%] right-[15%] w-20 h-20 border border-primary/20 rounded-2xl rotate-12"
        animate={{ rotate: [12, -12, 12], y: [0, -15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-[25%] left-[12%] w-16 h-16 border border-accent/20 rounded-full"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute top-[40%] left-[8%] w-3 h-3 bg-accent/40 rounded-full"
        animate={{ y: [0, -30, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute top-[30%] right-[25%] w-2 h-2 bg-primary/40 rounded-full"
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <div className="container relative z-10 mx-auto px-4 pt-28 pb-20">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 backdrop-blur-sm px-5 py-2 mb-8">
              <Star className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider">Multi-Branch ERP Platform</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-8xl font-bold font-display tracking-tight text-primary-foreground leading-[1.05]"
          >
            Electric Complaint
            <br />
            <span className="text-gradient-gold">Solutions</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base sm:text-lg text-primary-foreground/50 max-w-2xl mx-auto mt-8 mb-12 leading-relaxed"
          >
            Manage complaints, staff, branches, billing, inventory, and analytics — all from one powerful platform designed for electric service companies.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 glow-blue hover:-translate-y-0.5"
            >
              Get Started Free <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/verify"
              className="inline-flex items-center gap-2 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 backdrop-blur-sm px-8 py-4 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10 transition-all duration-300"
            >
              <QrCode className="w-4 h-4" /> Verify Invoice
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="flex items-center justify-center gap-6 mt-10 text-primary-foreground/30 text-xs"
          >
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Free Setup</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> 99.9% Uptime</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> 24/7 Support</span>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
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

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
