import ecsLogo from "@/assets/ecs-logo.png.asset.json";
import { Link } from "@tanstack/react-router";

export function Logo({ className = "", invert = false }: { className?: string; invert?: boolean }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={ecsLogo.url}
        alt="ECS — Electric Complaint Solutions"
        className={`h-10 w-auto ${invert ? "brightness-0 invert" : ""}`}
        loading="eager"
      />
    </Link>
  );
}