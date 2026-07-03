import {
  Zap, Wrench, Hammer, Snowflake, Sun, Paintbrush, PartyPopper, Fuel, Droplets, Wind,
} from "lucide-react";

export const SERVICES = [
  { slug: "electrical", title: "Electrical Services", icon: Zap, desc: "Wiring, installations, fault finding and electrical safety audits for every property." },
  { slug: "maintenance", title: "Maintenance Services", icon: Wrench, desc: "Scheduled and on-demand preventive maintenance to keep operations running smoothly." },
  { slug: "repairing", title: "Repairing Services", icon: Hammer, desc: "Fast, reliable repairs by certified technicians — minimal downtime, guaranteed work." },
  { slug: "refrigeration", title: "Refrigeration Services", icon: Snowflake, desc: "Industrial and commercial cooling systems installed, serviced and repaired." },
  { slug: "solar", title: "Solar Systems", icon: Sun, desc: "End-to-end solar design, installation, monitoring and maintenance solutions." },
  { slug: "renovation", title: "Renovation Services", icon: Paintbrush, desc: "Interior and exterior renovations delivered by experienced project teams." },
  { slug: "events", title: "Event Management", icon: PartyPopper, desc: "Power, lighting and technical event support for any scale of occasion." },
  { slug: "generators", title: "Generators Maintenance", icon: Fuel, desc: "Generator servicing, load testing and emergency response across Pakistan." },
  { slug: "plumbing", title: "Plumbing Services", icon: Droplets, desc: "Leak detection, pipe repair and full plumbing system installations." },
  { slug: "hvac", title: "HVAC Services", icon: Wind, desc: "Heating, ventilation and AC servicing for homes, offices and industrial sites." },
] as const;