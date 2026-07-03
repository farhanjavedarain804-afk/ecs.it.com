import ecsLogo from "@/assets/logo.png";
import { Link } from "react-router-dom";

export function Logo({ className = "", invert = false }: { className?: string; invert?: boolean }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={ecsLogo}
        alt="ECS — Electric Complaint Solutions"
        className={`h-10 w-auto ${invert ? "brightness-0 invert" : ""}`}
        loading="eager"
      />
    </Link>
  );
}

