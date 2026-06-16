import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-4 mt-4">
        <div className="flex items-center justify-between h-14 px-5 rounded-2xl glass-dark">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="ECS Logo" className="h-8 w-auto" />
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-medium text-primary-foreground/50 hover:text-primary-foreground transition-colors">Features</a>
            <a href="#modules" className="text-xs font-medium text-primary-foreground/50 hover:text-primary-foreground transition-colors">Modules</a>
            <Link to="/verify" className="text-xs font-medium text-primary-foreground/50 hover:text-primary-foreground transition-colors">Verify Invoice</Link>
            <Link to="/login" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all glow-blue">
              Login
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden text-primary-foreground">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden mx-4 mt-2"
        >
          <div className="glass-dark rounded-2xl p-4 flex flex-col gap-2">
            <a href="#features" onClick={() => setOpen(false)} className="text-sm font-medium text-primary-foreground/60 py-2 px-3 rounded-xl hover:bg-primary/10 transition-colors">Features</a>
            <a href="#modules" onClick={() => setOpen(false)} className="text-sm font-medium text-primary-foreground/60 py-2 px-3 rounded-xl hover:bg-primary/10 transition-colors">Modules</a>
            <Link to="/verify" onClick={() => setOpen(false)} className="text-sm font-medium text-primary-foreground/60 py-2 px-3 rounded-xl hover:bg-primary/10 transition-colors">Verify Invoice</Link>
            <Link to="/login" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground mt-1">Login</Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
