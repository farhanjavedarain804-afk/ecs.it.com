import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="ECS" className="h-9 w-auto" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              A complete ERP system built for electric service companies. Manage complaints, staff, branches, billing, inventory, and analytics from one platform.
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
  );
};

export default Footer;
