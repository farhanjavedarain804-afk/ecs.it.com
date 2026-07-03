import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter } from "lucide-react";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="relative mt-24 bg-gradient-hero text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh opacity-40 pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo invert />
            <p className="mt-4 text-sm text-white/70 leading-relaxed">
              One solution for all technical services. Verified professionals delivering trusted
              maintenance across Pakistan.
            </p>
            <div className="mt-5 flex gap-3">
              {[Facebook, Instagram, Linkedin, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/20"
                  aria-label="Social"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Quick Links</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li><Link to="/" className="hover:text-white">Home</Link></li>
              <li><Link to="/services" className="hover:text-white">Services</Link></li>
              <li><Link to="/about" className="hover:text-white">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Portals</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li><Link to="/verification" className="hover:text-white">Verification Portal</Link></li>
              <li><Link to="/login" className="hover:text-white">Login Portal</Link></li>
              <li><Link to="/services" className="hover:text-white">All Services</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li className="flex gap-2"><Phone className="h-4 w-4 mt-0.5 shrink-0" /> +92 310 1111 327</li>
              <li className="flex gap-2"><Mail className="h-4 w-4 mt-0.5 shrink-0" /> ecs.isbpak@gmail.com</li>
              <li className="flex gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /> 1st Floor, Zain Plaza, Islamabad</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <p>© {new Date().getFullYear()} Electric Complaint Solutions. All rights reserved.</p>
          <p>Developed By Devionic (Private) Limited | +92-317-7121841 Whatsapp | <a href="https://www.devionic.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">www.devionic.com</a> | info@devionic.com</p>
        </div>
      </div>
    </footer>
  );
}
