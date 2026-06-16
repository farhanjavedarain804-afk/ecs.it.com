import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import {
  ClipboardList, Users, Building2, FileText, CheckCircle2, Clock,
  ArrowUpRight, ArrowDownRight, Package, Wallet, TrendingUp, AlertTriangle, Settings, Wrench, LayoutDashboard
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Dashboard = () => {
  const { profile, roles, hasRole } = useAuth();
  const [stats, setStats] = useState({
    complaints: 0, customers: 0, branches: 0, invoices: 0,
    pendingComplaints: 0, overdueComplaints: 0, criticalComplaints: 0,
    resolvedComplaints: 0, dismissedComplaints: 0,
    completedComplaints: 0,
    totalRevenue: 0, unpaidAmount: 0, inventoryItems: 0, lowStockItems: 0,
    staff: 0, services: 0,
    otherIncome: 0, expenses: 0, salaries: 0,
  });
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('ecs_token');
      const isSuperAdmin = roles.includes('super_admin');
      const branchId = profile?.branch_id;

      try {
        const url = (!isSuperAdmin && branchId)
          ? `${API_URL}/api/analytics?branch_id=${branchId}`
          : `${API_URL}/api/analytics`;

        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const data = await res.json();

        setStats({
          complaints: data.total_complaints || 0,
          customers: data.total_customers || 0,
          branches: data.total_branches || 0,
          invoices: data.total_invoices || 0,
          pendingComplaints: data.pending_complaints || 0,
          overdueComplaints: data.overdue_complaints || 0,
          criticalComplaints: data.critical_complaints || 0,
          resolvedComplaints: data.resolved_complaints || 0,
          dismissedComplaints: data.dismissed_complaints || 0,
          completedComplaints: data.resolved_complaints || 0,
          totalRevenue: data.total_revenue || 0,
          unpaidAmount: data.unpaid_amount || 0,
          inventoryItems: data.total_inventory || 0,
          lowStockItems: data.low_stock_items || 0,
          staff: data.total_staff || 0,
          services: data.total_services || 0,
          otherIncome: data.other_income || 0,
          expenses: data.total_expenses || 0,
          salaries: data.total_salaries || 0,
        });

        setRecentComplaints(data.recent_complaints || []);
        setRecentInvoices(data.recent_invoices || []);
        setMonthlyData(data.monthly_data || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        // Important: If you see this error in the console, check if VITE_API_URL is correctly set.
      }
    };

    if (roles.length > 0 || profile !== undefined) {
      fetchStats();
    }
  }, [roles, profile]);

  const metricCards = [
    { label: "Total Complaints", value: stats.complaints, icon: ClipboardList, gradient: "from-primary to-secondary", sub: `${stats.pendingComplaints} pending` },
    { label: "Customers", value: stats.customers, icon: Users, gradient: "from-secondary to-primary", sub: "All branches" },
    { label: "Revenue (Paid)", value: `Rs. ${stats.totalRevenue.toLocaleString()}`, icon: Wallet, gradient: "from-success to-info", sub: `${stats.invoices} invoices` },
    { label: "Unpaid Amount", value: `Rs. ${stats.unpaidAmount.toLocaleString()}`, icon: AlertTriangle, gradient: "from-accent to-warning", sub: "Outstanding" },
    { label: "Inventory Items", value: stats.inventoryItems, icon: Package, gradient: "from-info to-primary", sub: `${stats.lowStockItems} low stock` },
    { label: "Branches", value: stats.branches, icon: Building2, gradient: "from-primary to-info", sub: "Active", role: "super_admin" },
    { label: "Total Staff", value: stats.staff, icon: Users, gradient: "from-secondary to-primary", sub: "Global team", role: "super_admin" },
    { label: "Services", value: stats.services, icon: Wrench, gradient: "from-success to-info", sub: "Operational", role: "super_admin" },
  ];

  const total = stats.complaints || 1;
  const pieData = [
    { name: "Pending", value: stats.pendingComplaints, color: "hsl(230, 75%, 55%)" },
    { name: "Overdue", value: stats.overdueComplaints, color: "hsl(38, 92%, 50%)" },
    { name: "Critical", value: stats.criticalComplaints, color: "hsl(0, 84%, 60%)" },
    { name: "Resolved", value: stats.resolvedComplaints, color: "hsl(142, 71%, 45%)" },
    { name: "Dismissed", value: stats.dismissedComplaints, color: "hsl(0, 0%, 45%)" },
  ].filter(d => d.value > 0);

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    return (
      <g>
        <text x={cx} y={cy} dy={-10} textAnchor="middle" fill={fill} className="text-xl font-bold font-display">
          {payload.name}
        </text>
        <text x={cx} y={cy} dy={15} textAnchor="middle" fill="#64748b" className="text-xs font-medium">
          {value} ({(percent * 100).toFixed(0)}%)
        </text>
        <Pie
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          dataKey="value"
        />
      </g>
    );
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      registered: "bg-info/10 text-info", assigned: "bg-accent/10 text-accent-foreground",
      in_progress: "bg-warning/10 text-warning-foreground", completed: "bg-success/10 text-success",
      closed: "bg-muted text-muted-foreground", invoice_generated: "bg-secondary/10 text-secondary",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  const priorityBadge = (priority: string) => {
    const map: Record<string, string> = {
      low: "bg-muted text-muted-foreground", medium: "bg-accent/10 text-accent-foreground",
      high: "bg-destructive/10 text-destructive", emergency: "bg-destructive text-destructive-foreground",
    };
    return map[priority] || "bg-muted text-muted-foreground";
  };

  const paymentBadge = (status: string) => {
    const map: Record<string, string> = { paid: "bg-success/10 text-success", unpaid: "bg-destructive/10 text-destructive", partial: "bg-accent/10 text-accent-foreground" };
    return map[status] || "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-display text-foreground">Welcome, {profile?.full_name || "User"}! 👋</h2>
        <p className="text-muted-foreground text-sm mt-1">Here's an overview of your operations today.</p>
      </div>

      {/* Metric Cards - Restricted visibility */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {metricCards
          .filter(c => !c.role || hasRole(c.role as any))
          .filter(c => {
             return true;
          })
          .map((card) => (
          <div key={card.label} className="relative rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all duration-300 overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} opacity-80`} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <p className="text-xl font-bold font-display text-card-foreground mt-1">{card.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{card.sub}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm`}>
                <card.icon className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold font-display text-card-foreground">Complaint Analytics</h3>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Complaints</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" /> Resolved</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(230, 75%, 55%)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(230, 75%, 55%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(220, 10%, 45%)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(220, 10%, 45%)' }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 15%, 90%)', borderRadius: '12px', boxShadow: '0 4px 20px -4px hsl(222, 47%, 11%, 0.1)', fontSize: '12px' }} />
              <Area type="monotone" dataKey="complaints" stroke="hsl(230, 75%, 55%)" strokeWidth={2.5} fill="url(#colorComplaints)" />
              <Area type="monotone" dataKey="resolved" stroke="hsl(142, 71%, 45%)" strokeWidth={2.5} fill="url(#colorResolved)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-base font-semibold font-display text-card-foreground mb-1">Status Breakdown</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Overall Distribution</p>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  strokeWidth={0}
                  activeShape={renderActiveShape}
                  activeIndex={undefined}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 15%, 90%)', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                  formatter={(value, name) => [`${value} (${((Number(value) / total) * 100).toFixed(0)}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span>{Math.round((d.value / total) * 100)}% {d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Complaints + Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold font-display text-card-foreground">Recent Complaints</h3>
            <a href="/dashboard/complaints" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">View All</a>
          </div>
          {recentComplaints.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                    <th className="text-left py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-left py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {recentComplaints.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 text-xs font-medium text-foreground">{c.complaint_number}</td>
                      <td className="py-3 px-2 text-xs capitalize text-muted-foreground">{c.complaint_type}</td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${statusBadge(c.status)}`}>
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${priorityBadge(c.priority)}`}>
                          {c.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-sm text-muted-foreground">No complaints yet</div>
          )}
        </div>

        {(hasRole("super_admin") || hasRole("branch_admin")) && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold font-display text-card-foreground">Recent Invoices</h3>
              <a href="/dashboard/invoices" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">View All</a>
            </div>
            {recentInvoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Invoice #</th>
                      <th className="text-left py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                      <th className="text-left py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="text-left py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((inv: any) => (
                      <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 text-xs font-medium text-foreground">{inv.invoice_number}</td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">{inv.customers?.name || "—"}</td>
                        <td className="py-3 px-2 text-xs font-semibold text-foreground">Rs. {Number(inv.total_amount).toLocaleString()}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${paymentBadge(inv.payment_status)}`}>
                            {inv.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-sm text-muted-foreground">No invoices yet</div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions - Curated 6 High-Priority Modules */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold font-display text-card-foreground">Quick Service Actions</h3>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Priority Workflow</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Register Complaint", icon: ClipboardList, href: "/dashboard/complaints", gradient: "from-primary/10 to-primary/5", color: "text-primary", roles: ["super_admin", "branch_admin", "view_only"] },
            { label: "Billing & Invoices", icon: FileText, href: "/dashboard/invoices", gradient: "from-secondary/10 to-secondary/5", color: "text-secondary", roles: ["super_admin", "branch_admin"] },
            { label: "Staff Attendance", icon: Clock, href: "/dashboard/attendance", gradient: "from-success/10 to-success/5", color: "text-success", roles: ["super_admin", "branch_admin", "staff"] },
            { label: "Financial Data", icon: Wallet, href: "/dashboard/financial", gradient: "from-info/10 to-info/5", color: "text-info", roles: ["super_admin", "branch_admin"] },
            { label: "Inventory Control", icon: Package, href: "/dashboard/inventory", gradient: "from-info/10 to-info/5", color: "text-info", roles: ["super_admin", "branch_admin"] },
            { label: "Customer CRM", icon: Users, href: "/dashboard/customers", gradient: "from-warning/10 to-warning/5", color: "text-warning-foreground", roles: ["super_admin", "branch_admin"] },
          ].filter(action => !action.roles || action.roles.some(r => hasRole(r as any))).map((action) => (
            <a key={action.label} href={action.href}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl border border-border bg-gradient-to-br ${action.gradient} hover:shadow-elevated hover:-translate-y-1 transition-all duration-300 text-center group`}>
              <div className="w-12 h-12 rounded-2xl bg-card shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <action.icon className={`w-6 h-6 ${action.color} group-hover:animate-pulse`} />
              </div>
              <span className="text-xs font-bold text-foreground leading-tight">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
