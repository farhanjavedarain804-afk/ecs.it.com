import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, ClipboardList, Users, Building2, Package, FileText,
  BarChart3, Settings, LogOut, Menu, X, Wallet, Clock, Search, Bell,
  Shield, Activity, Wrench, UserPlus, CheckCircle2, Banknote
} from "lucide-react";
import logo from "@/assets/logo.png";

const API_URL = import.meta.env.VITE_API_URL ?? '';

type NavItem = { label: string; icon: any; path: string; roles?: string[] };

const allNavItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", roles: ["super_admin", "branch_admin"] },
  { label: "Service Requests", icon: FileText, path: "/dashboard/service-requests", roles: ["super_admin", "branch_admin"] },
  { label: "Complaints", icon: ClipboardList, path: "/dashboard/complaints", roles: ["super_admin", "branch_admin"] },
  { label: "Customers", icon: Users, path: "/dashboard/customers", roles: ["super_admin", "branch_admin"] },
  { label: "Services & Parts", icon: Wrench, path: "/dashboard/services-products", roles: ["super_admin", "branch_admin"] },
  { label: "Staff", icon: Users, path: "/dashboard/staff", roles: ["super_admin", "branch_admin"] },
  { label: "Customer Reviews", icon: CheckCircle2, path: "/dashboard/customer-reviews", roles: ["super_admin", "branch_admin"] },
  { label: "Branches", icon: Building2, path: "/dashboard/branches", roles: ["super_admin"] },
  { label: "Invoices", icon: FileText, path: "/dashboard/invoices", roles: ["super_admin", "branch_admin"] },
  { label: "Attendance", icon: Clock, path: "/dashboard/attendance", roles: ["super_admin", "branch_admin", "staff"] },
  { label: "Inventory", icon: Package, path: "/dashboard/inventory", roles: ["super_admin", "branch_admin"] },
  { label: "Financial", icon: Wallet, path: "/dashboard/financial", roles: ["super_admin", "branch_admin"] },
  { label: "Payroll", icon: Banknote, path: "/dashboard/payroll", roles: ["super_admin", "manager"] },
  { label: "Payments", icon: Banknote, path: "/dashboard/payments", roles: ["super_admin", "branch_admin"] },
  { label: "Reports", icon: BarChart3, path: "/dashboard/reports", roles: ["super_admin"] },
  { label: "User Activity", icon: Activity, path: "/dashboard/user-activity", roles: ["super_admin"] },
  { label: "Settings", icon: Settings, path: "/dashboard/settings", roles: ["super_admin"] },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { profile, roles, signOut, hasRole, maintenanceMode, setMaintenanceMode, isDeveloper } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isRestricted = maintenanceMode && !isDeveloper;

  const [notifications, setNotifications] = useState<any[]>([]);
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const fetchNotifications = async () => {
    const token = localStorage.getItem('ecs_token');
    try {
      const res = await fetch(`${API_URL}/api/notifications?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
  };

  const markAsRead = async (id: string) => {
    const token = localStorage.getItem('ecs_token');
    try {
      await fetch(`${API_URL}/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true })
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* ignore */ }
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem('ecs_token');
    try {
      await fetch(`${API_URL}/api/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast({ title: "All notifications marked as read" });
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter nav items based on role
  const navItems = allNavItems.filter((item) => {
    if (isDeveloper) return true;
    if (!item.roles) return true;
    return item.roles.some((r) => hasRole(r as any));
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[250px] bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-5 h-16 border-b border-sidebar-border">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="bg-white rounded-lg p-1"><img src={logo} alt="ECS" className="h-7 w-auto" /></div>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-muted hover:text-sidebar-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 pt-6 pb-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-sidebar-muted">Menu</span>
          </div>

          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"}`}
                  style={isActive ? { boxShadow: '0 4px 15px -3px hsl(230 75% 55% / 0.4)' } : {}}>
                  <item.icon className="w-[18px] h-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-9 h-9 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sm font-bold text-sidebar-primary">
                {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name || "User"}</p>
                <p className="text-[11px] text-sidebar-muted truncate capitalize">{isDeveloper ? "Developer" : roles[0]?.replace("_", " ") || "Staff"}</p>
              </div>
            </div>
            <button onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-sidebar-muted hover:text-destructive hover:bg-destructive/10 transition-all">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" />}

      <div className="flex-1 lg:ml-[250px]">
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground"><Menu className="w-5 h-5" /></button>
            <h1 className="text-lg font-semibold font-display text-foreground hidden sm:block">
              {allNavItems.find((i) => i.path === location.pathname)?.label || "Dashboard"}
            </h1>

            {/* Developer Maintenance Toggle */}
            {isDeveloper && (
              <div className="flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
                <Shield className={`w-3.5 h-3.5 ${maintenanceMode ? "text-destructive" : "text-success"}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Maintenance</span>
                <button
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${maintenanceMode ? "bg-destructive" : "bg-success"}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${maintenanceMode ? "translate-x-5" : "translate-x-1"}`} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Functional Search */}
            <div className="relative">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-muted text-muted-foreground text-sm cursor-pointer hover:bg-muted/80 transition-all" onClick={() => setSearchOpen(!searchOpen)}>
                <Search className="w-4 h-4" /><span>Search...</span>
              </div>
              {searchOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-card border border-border rounded-2xl shadow-elevated p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input autoFocus type="text" placeholder="Search anything..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase px-1">Quick results</p>
                    <button onClick={() => { navigate("/dashboard/complaints"); setSearchOpen(false); }} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left">
                      <div className="p-1.5 bg-primary/10 rounded-md text-primary"><ClipboardList className="w-3.5 h-3.5" /></div>
                      <span className="text-sm font-medium">Complaints</span>
                    </button>
                    <button onClick={() => { navigate("/dashboard/invoices"); setSearchOpen(false); }} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left">
                      <div className="p-1.5 bg-success/10 rounded-md text-success"><FileText className="w-3.5 h-3.5" /></div>
                      <span className="text-sm font-medium">Invoices</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Functional Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`relative p-2 rounded-xl hover:bg-muted transition-colors ${notificationsOpen ? "bg-muted" : ""}`}
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {notifications.some(n => !n.is_read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-background animate-pulse" />
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-elevated overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                    <h4 className="font-bold text-sm">Notifications</h4>
                    <button onClick={markAllAsRead} className="text-[10px] text-primary hover:underline font-bold">Mark all read</button>
                  </div>
                  <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`p-4 hover:bg-muted/30 transition-colors cursor-pointer relative ${!n.is_read ? "bg-primary/5" : ""}`}
                        >
                          {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                          <div className="flex justify-between items-start gap-2">
                            <p className={`text-xs font-bold ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                            {n.is_read && <CheckCircle2 className="w-3 h-3 text-success/50" />}
                          </div>
                          <p className={`text-[11px] mt-0.5 line-clamp-2 ${!n.is_read ? "text-foreground/80" : "text-muted-foreground"}`}>{n.message}</p>
                          <p className="text-[9px] text-muted-foreground/60 font-bold mt-2 uppercase tracking-tighter">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-10 text-center">
                        <Bell className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground italic">No notifications yet</p>
                      </div>
                    )}
                  </div>
                  <button className="w-full p-2.5 text-center text-xs font-bold text-primary hover:bg-primary/5 transition-colors border-t border-border">System Activity Feed</button>
                </div>
              )}
            </div>

            {/* Functional Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"
              >
                {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </button>
              {profileOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-elevated p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-border/50 mb-1">
                    <p className="text-sm font-bold text-foreground truncate">{profile?.full_name || "User"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{roles[0]?.replace("_", " ")}</p>
                  </div>
                  <button onClick={() => { navigate("/dashboard/settings"); setProfileOpen(false); }} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left mb-1">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Settings</span>
                  </button>
                  {(hasRole("super_admin") || isDeveloper) && (
                    <button onClick={() => { navigate("/dashboard/branches"); setProfileOpen(false); }} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left mb-1">
                      <UserPlus className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Manage Admins</span>
                    </button>
                  )}
                  <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors text-left">
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="relative p-4 md:p-6">
          {children}

        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
