import { Wrench, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const MaintenanceOverlay = () => {
  const { signOut, isDeveloper, maintenanceMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isPublicPage = location.pathname === "/login" || location.pathname.startsWith("/verify");

  if (!maintenanceMode || isDeveloper || isPublicPage) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6 animate-pulse">
        <Wrench className="w-12 h-12 text-destructive" />
      </div>
      <h2 className="text-3xl font-display font-bold text-foreground mb-4">Maintenance in Progress</h2>
      <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
        The system is currently undergoing scheduled maintenance to improve our services.
        <span className="block mt-2 font-bold text-foreground">Access will be restored shortly. Please check back later.</span>
      </p>
      <div className="mt-12 flex items-center gap-3 px-4 py-2 rounded-full border border-border bg-muted/30">
        <div className="w-2 h-2 rounded-full bg-destructive animate-ping" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">System Locked by Developer</span>
      </div>
      <button
        onClick={() => signOut().then(() => navigate("/login"))}
        className="mt-8 px-6 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-bold hover:bg-destructive/90 transition-all flex items-center gap-2"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
};

export default MaintenanceOverlay;
