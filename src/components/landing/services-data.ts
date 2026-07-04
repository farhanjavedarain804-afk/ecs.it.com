import {
  Zap, Wrench, Hammer, Snowflake, Sun, Paintbrush, PartyPopper, Fuel, Droplets, Wind, Camera, ShieldCheck,
} from "lucide-react";

export const SERVICES = [
  { slug: "electrical", title: "Electrical Services", icon: Zap, color: "from-yellow-500 to-amber-600", desc: "Wiring, installations, fault finding and electrical safety audits for every property." },
  { slug: "hvac", title: "HVAC Services", icon: Wind, color: "from-sky-500 to-blue-600", desc: "Heating, ventilation and AC servicing for homes, offices and industrial sites." },
  { slug: "plumbing", title: "Plumbing Services", icon: Droplets, color: "from-blue-500 to-cyan-600", desc: "Leak detection, pipe repair and full plumbing system installations." },
  { slug: "refrigeration", title: "Refrigeration Services", icon: Snowflake, color: "from-cyan-400 to-sky-600", desc: "Industrial and commercial cooling systems installed, serviced and repaired." },
  { slug: "solar", title: "Solar Systems", icon: Sun, color: "from-orange-400 to-yellow-500", desc: "End-to-end solar design, installation, monitoring and maintenance solutions." },
  { slug: "generators", title: "Generators Maintenance", icon: Fuel, color: "from-gray-600 to-slate-700", desc: "Generator servicing, load testing and emergency response across Pakistan." },
  { slug: "maintenance", title: "Maintenance Services", icon: Wrench, color: "from-indigo-500 to-violet-600", desc: "Scheduled and on-demand preventive maintenance to keep operations running smoothly." },
  { slug: "repairing", title: "Repairing Services", icon: Hammer, color: "from-rose-500 to-red-600", desc: "Fast, reliable repairs by certified technicians — minimal downtime, guaranteed work." },
  { slug: "renovation", title: "Renovation Services", icon: Paintbrush, color: "from-pink-500 to-fuchsia-600", desc: "Interior and exterior renovations delivered by experienced project teams." },
  { slug: "events", title: "Event Management", icon: PartyPopper, color: "from-purple-500 to-violet-600", desc: "Power, lighting and technical event support for any scale of occasion." },
  { slug: "cctv", title: "CCTV & Security", icon: Camera, color: "from-slate-600 to-gray-700", desc: "Professional CCTV installation, monitoring systems and access control setup." },
  { slug: "facility", title: "Facility Management", icon: ShieldCheck, color: "from-emerald-500 to-green-600", desc: "Comprehensive facility management services — keeping your premises safe, clean and operational." },
] as const;

