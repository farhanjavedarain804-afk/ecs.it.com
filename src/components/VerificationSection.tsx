import { motion } from "framer-motion";
import { QrCode, Search, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const VerificationSection = () => {
  return (
    <section className="py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(hsl(230 75% 55% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(230 75% 55% / 0.3) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-secondary/5 blur-[100px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary/10 border border-secondary/20 px-4 py-1.5 text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider mb-4">
              Fraud Prevention
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold font-display text-primary-foreground mt-3">
              Invoice <span className="text-gradient-gold">Verification</span>
            </h2>
            <p className="text-primary-foreground/40 mt-5 max-w-xl mx-auto text-base">
              Every invoice includes a unique QR code for instant authenticity verification. Prevent fake invoices and duplicate billing.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12"
          >
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
            <Link
              to="/verify"
              className="group inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground hover:shadow-xl transition-all duration-300 glow-blue hover:-translate-y-0.5"
            >
              Verify an Invoice <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VerificationSection;
