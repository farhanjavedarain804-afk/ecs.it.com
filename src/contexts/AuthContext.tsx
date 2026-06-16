import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export type AppRole = "super_admin" | "branch_admin" | "manager" | "accountant" | "technician" | "store_manager" | "developer" | "staff";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: { access_token: string; user: AuthUser } | null;
  loading: boolean;
  roles: AppRole[];
  profile: { full_name: string; branch_id: string | null } | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole | AppRole[]) => boolean;
  maintenanceMode: boolean;
  setMaintenanceMode: (val: boolean) => Promise<void>;
  isDeveloper: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<{ access_token: string; user: AuthUser } | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<{ full_name: string; branch_id: string | null } | null>(null);
  const { toast } = useToast();
  const [maintenanceMode, setMaintenanceModeState] = useState(false);
  const isDeveloper = user?.email === "farhanjaved357@gmail.com" || roles.includes("developer");

  const fetchUserData = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        // Token is invalid or expired — clear it
        localStorage.removeItem('ecs_token');
        setUser(null);
        setSession(null);
        setRoles([]);
        setProfile(null);
        setLoading(false);
        return;
      }
      const data = await res.json();

      const authUser: AuthUser = { id: data.id, email: data.email };
      setUser(authUser);
      setSession({ access_token: token, user: authUser });
      setRoles((data.roles || []) as AppRole[]);
      setProfile({ full_name: data.full_name || data.email, branch_id: data.branch_id || null });

      // Maintenance mode fetching moved to separate useEffect
    } catch (err) {
      console.error("Error restoring session:", err);
      localStorage.removeItem('ecs_token');
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  // On mount: Restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('ecs_token');
    if (token) {
      fetchUserData(token);
    } else {
      setLoading(false);
    }
  }, []);
  
  // Fetch maintenance mode regardless of auth
  useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/maintenance_mode`);
        if (res.ok) {
          const data = await res.json();
          setMaintenanceModeState(data.value === true || data.value === 'true');
        }
      } catch (_) { /* ignore */ }
    };
    fetchMaintenance();
    // Also poll every 30 seconds
    const interval = setInterval(fetchMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) return { error: new Error(data.error || 'Login failed') };

      localStorage.setItem('ecs_token', data.token);
      const authUser: AuthUser = { id: data.user.id, email: data.user.email };
      setUser(authUser);
      setSession({ access_token: data.token, user: authUser });
      setRoles((data.user.roles || []) as AppRole[]);
      setProfile({ full_name: data.user.full_name || email, branch_id: data.user.branch_id || null });
      return { error: null };
    } catch (err: any) {
      const error = (err instanceof TypeError && err.message === 'Failed to fetch')
        ? new Error('Server unreachable. Please ensure the backend is running and your internet is active.')
        : err;
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName })
      });
      const data = await res.json();
      if (!res.ok) return { error: new Error(data.error || 'Registration failed') };
      return { error: null };
    } catch (err: any) {
      const error = (err instanceof TypeError && err.message === 'Failed to fetch')
        ? new Error('Server unreachable. Please check your connectivity.')
        : err;
      return { error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('ecs_token');
    setUser(null);
    setSession(null);
    setRoles([]);
    setProfile(null);
  };

  const setMaintenanceMode = async (val: boolean) => {
    const token = localStorage.getItem('ecs_token');
    try {
      const res = await fetch(`${API_URL}/api/settings/maintenance_mode`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: val })
      });
      if (!res.ok) {
        const d = await res.json();
        toast({ title: "Update Failed", description: d.error, variant: "destructive" });
        return;
      }
      setMaintenanceModeState(val);
      toast({ title: `Maintenance mode: ${val ? "ON" : "OFF"}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const hasRole = (role: AppRole | AppRole[]) => {
    if (isDeveloper || roles.includes("developer")) return true;
    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.some(r => {
      if (roles.includes(r)) return true;
      if (roles.includes("super_admin") && r === "branch_admin") return true;
      return false;
    });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, profile, signIn, signUp, signOut, hasRole, maintenanceMode, setMaintenanceMode, isDeveloper }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
