import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  User,
  Calendar,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  Clock3,
  Activity,
  Users,
  History,
  FileText,
  FileDown,
  Eye,
  X,
  Loader2
} from "lucide-react";
import { exportTableToPDF } from "@/utils/pdfGenerator";
import { format } from "date-fns";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a "YYYY-MM-DD HH:mm:ss" / "YYYY-MM-DDTHH:mm:ss" string AS PKT without re-converting. */
const parsePKT = (s: string | null) => {
  if (!s) return null;
  const d = new Date(s.replace("T", " ").replace(/Z$/, ""));
  return isNaN(d.getTime()) ? null : d;
};

/** Format a PKT datetime string → "HH:MM AM/PM" */
const fmtTime = (s: string | null) => {
  const d = parsePKT(s);
  if (!d) return "—";
  let h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

/** Format a PKT date string → "12 Mar 2026" */
const fmtDate = (s: string | null) => {
  if (!s) return "—";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const p = s.substring(0, 10).split("-");
  return p.length === 3 ? `${p[2]} ${months[+p[1]-1]} ${p[0]}` : s.substring(0, 10);
};

/** Calculate working time from two PKT strings */
const workTime = (checkIn: string | null, checkOut: string | null) => {
  const a = parsePKT(checkIn), b = parsePKT(checkOut);
  if (!a || !b) return "—";
  const mins = Math.floor((b.getTime() - a.getTime()) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

/** Pakistan Standard Time: YYYY-MM-DD */
const pktToday = () => {
  const s = new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" });
  const d = new Date(s);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};


// ── Main Component ────────────────────────────────────────────────────────────

const Attendance = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selBranch, setSelBranch] = useState("");
  const [selStaff, setSelStaff] = useState("");
  const [customDateTime, setCustomDateTime] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState<{ staff_id: string; staff_name: string; time: string } | null>(null);

  // PKT clock
  const [nowPKT, setNowPKT] = useState(new Date());
  useEffect(() => {
    const tick = () => {
      const s = new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" });
      setNowPKT(new Date(s));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const [activeTab, setActiveTab] = useState<"daily" | "report">("daily");
  const [selMonth, setSelMonth] = useState(new Date().getMonth() + 1);
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [branchFilter, setBranchFilter] = useState("");
  const [historyModal, setHistoryModal] = useState<any | null>(null);

  const { hasRole, profile, isDeveloper } = useAuth();
  const { toast } = useToast();
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const token = localStorage.getItem("ecs_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, sRes, aRes] = await Promise.all([
        fetch(`${API}/api/branches`, { headers }),
        fetch(`${API}/api/staff?status=active`, { headers }),
        fetch(`${API}/api/attendance${branchFilter ? `?branch_id=${branchFilter}` : ""}`, { headers }),
      ]);
      if (bRes.ok) setBranches(await bRes.json());
      if (sRes.ok) setAllStaff(await sRes.json());
      if (aRes.ok) setRecords(await aRes.json());

      // Auto-select branch for branch admins
      if (hasRole("branch_admin") && !hasRole("super_admin") && profile?.branch_id) {
        setSelBranch(profile.branch_id);
      }
    } catch (e: any) {
      toast({ title: "Load Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [branchFilter, profile?.branch_id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Is an employee already checked in TODAY?
  const isAlreadyInToday = useCallback((staffId: string) => {
    const today = pktToday();
    return records.some(r => r.staff_id === staffId && r.attendance_date === today);
  }, [records]);

  // Staff in selected branch (for mark-attendance form)
  const branchStaff = allStaff.filter(s => !selBranch || s.branch_id === selBranch);

  // Filter out staff who already checked in today
  const availableStaff = branchStaff.filter(s => {
    const today = pktToday();
    return !isAlreadyInToday(s.id);
  });

  // Active sessions (checked in but not out)
  const activeSessions = records.filter(r => !r.check_out);


  // Completed sessions
  const completedSessions = records.filter(r => !!r.check_out);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const canMarkAttendance = hasRole(["super_admin", "branch_admin"]) || isDeveloper;

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selBranch || !selStaff) {
      toast({ title: "Missing fields", description: "Please select branch and staff member", variant: "destructive" });
      return;
    }
    setIsCheckingIn(true);
    try {
      const res = await fetch(`${API}/api/attendance/check-in`, {
        method: "POST", headers,
        body: JSON.stringify({ 
          staff_id: selStaff, 
          branch_id: selBranch,
          custom_datetime: customDateTime || undefined
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "✅ Checked In", description: `Attendance marked for ${pktToday()} at ${fmtTime(data.check_in || new Date().toISOString())}` });
        setSelStaff("");
        setCustomDateTime("");
        fetchAll();
      } else {
        toast({ title: "Failed", description: data.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async (staffId: string, staffName: string, customTime?: string) => {
    setIsCheckingOut(true);
    try {
      const res = await fetch(`${API}/api/attendance/check-out`, {
        method: "POST", headers,
        body: JSON.stringify({ staff_id: staffId, custom_checkout_time: customTime }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "✅ Checked Out", description: `${staffName} checked out successfully` });
        setCheckoutModal(null);
        fetchAll();
      } else {
        toast({ title: "Failed", description: data.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isDeveloper) {
      toast({ title: "Access Denied", description: "Only developers can delete records", variant: "destructive" }); return;
    }
    if (!confirm("Delete this attendance record?")) return;
    try {
      await fetch(`${API}/api/attendance/${id}`, { method: "DELETE", headers });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Attendance Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Pakistan Standard Time (PKT, UTC+5)</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="bg-primary/5 border border-primary/10 px-4 py-2 rounded-lg text-xs font-bold text-primary">
            {format(nowPKT, "dd MMM yyyy")} &nbsp;·&nbsp; {format(nowPKT, "hh:mm:ss aa")} PKT
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-2xl w-fit border border-border">
        {["daily", "report"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}>
            {tab === "daily" ? "Daily Attendance" : "Monthly Report"}
          </button>
        ))}
      </div>

      {/* Branch Filter (for Both Tabs) */}
      {hasRole("super_admin") && (
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold cursor-pointer">
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {activeTab === "daily" ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* ── Mark Attendance Form ── */}
          <div className="xl:col-span-1">
            <div className="sticky top-8 bg-card border border-border rounded-[2rem] p-6 shadow-elevated">
              <h3 className="text-lg font-bold font-display mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" /> Mark Attendance
              </h3>
              <form onSubmit={handleCheckIn} className="space-y-5">
                {!canMarkAttendance && (
                  <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
                    <X className="w-4 h-4" /> Management actions only
                  </div>
                )}
                {/* Branch */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Branch</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select value={selBranch}
                      onChange={e => { setSelBranch(e.target.value); setSelStaff(""); }}
                      disabled={hasRole("branch_admin") && !hasRole("super_admin")}
                      className="w-full rounded-2xl border border-input bg-background pl-12 pr-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer disabled:opacity-70">
                      <option value="">Select Branch</option>
                      {branches
                        .filter(b => !hasRole("branch_admin") || hasRole("super_admin") || b.id === profile?.branch_id)
                        .map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                      }
                    </select>
                  </div>
                </div>

                {/* Staff — shows all staff in branch */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                    Employee ({availableStaff.length} available)
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select value={selStaff} onChange={e => setSelStaff(e.target.value)}
                      disabled={!selBranch}
                      className="w-full rounded-2xl border border-input bg-background pl-12 pr-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer disabled:opacity-70">
                      <option value="">{selBranch ? (availableStaff.length === 0 ? "All staff checked in" : "Select Employee") : "Select branch first"}</option>
                      {availableStaff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                  </div>
                  {selBranch && branchStaff.length > availableStaff.length && (
                    <p className="text-[10px] text-muted-foreground pl-2">
                      {branchStaff.length - availableStaff.length} staff already checked in today
                    </p>
                  )}
                </div>

                {/* Clock */}
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pakistan Time</span>
                    <div className="flex items-center gap-2 text-primary">
                      <Clock className="w-4 h-4 animate-pulse" />
                      <span className="text-lg font-black tabular-nums">{format(nowPKT, "hh:mm:ss aa")}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-right font-semibold">{format(nowPKT, "EEEE, dd MMMM yyyy")}</p>
                </div>

                {/* Custom Date/Time for Developers Only */}
                {isDeveloper && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Custom Date & Time (Optional)</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="datetime-local" 
                        value={customDateTime}
                        onChange={e => setCustomDateTime(e.target.value)}
                        className="w-full rounded-2xl border border-input bg-background pl-12 pr-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                )}

                <button type="submit" disabled={isCheckingIn || !selBranch || !selStaff || !canMarkAttendance}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 mt-4 disabled:opacity-50">
                  {isCheckingIn ? "Marking..." : "✅ Mark Check-In"}
                </button>
              </form>
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="xl:col-span-3 space-y-8">
            {/* Active Staff */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold font-display text-primary flex items-center gap-2 px-2">
                <Clock3 className="w-5 h-5" /> Active Staff
                <span className="ml-auto text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-lg">{activeSessions.length} checked in</span>
              </h3>
              <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm border-l-4 border-l-primary">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase text-[10px]">Employee</th>
                        <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase text-[10px]">Branch</th>
                        <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase text-[10px]">Check-In Time</th>
                        <th className="text-right font-bold text-muted-foreground px-6 py-5 uppercase text-[10px]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loading ? (
                        <tr><td colSpan={4} className="py-10 text-center text-muted-foreground animate-pulse">Loading...</td></tr>
                      ) : activeSessions.length === 0 ? (
                        <tr><td colSpan={4} className="py-10 text-center text-muted-foreground italic">No active check-ins right now.</td></tr>
                      ) : activeSessions.map(r => (
                        <tr key={r.id} className="hover:bg-muted/5 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {(r.staff_full_name || "?").charAt(0).toUpperCase()}
                              </div>
                              <p className="font-bold text-foreground">{r.staff_full_name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-muted-foreground font-medium">{r.branch_name || "—"}</td>
                          <td className="px-6 py-5 font-bold text-success">{fmtTime(r.check_in)}</td>
                           <td className="px-6 py-5 text-right">
                            {r.attendance_date !== pktToday() && !isDeveloper ? (
                                <span className="text-[10px] font-black uppercase text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg border border-destructive/20">Session Expired</span>
                            ) : (
                              <button onClick={() => {
                                  if (isDeveloper) {
                                    setCheckoutModal({ staff_id: r.staff_id, staff_name: r.staff_full_name, time: new Date().toISOString().substring(0, 16) });
                                  } else {
                                    handleCheckOut(r.staff_id, r.staff_full_name);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-100 text-orange-600 text-xs font-bold hover:bg-orange-200 transition-colors border border-orange-200 shadow-sm">
                                <Clock className="w-4 h-4" /> Check Out
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Recent Completed Attendance */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold font-display text-success flex items-center gap-2 px-2">
                <CheckCircle2 className="w-5 h-5" /> Recent Completed Attendance
                <span className="ml-auto text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-lg">{completedSessions.length} records</span>
              </h3>
              <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm border-l-4 border-l-success">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase text-[10px]">Employee</th>
                        <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase text-[10px]">Date</th>
                        <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase text-[10px]">Check-In</th>
                        <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase text-[10px]">Check-Out</th>
                        <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase text-[10px]">Duration</th>
                        <th className="text-right font-bold text-muted-foreground px-6 py-5 uppercase text-[10px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {completedSessions.length === 0 ? (
                        <tr><td colSpan={6} className="py-10 text-center text-muted-foreground italic">No completed attendance records.</td></tr>
                      ) : completedSessions.slice(0, 20).map(r => (
                        <tr key={r.id} className="hover:bg-muted/5 transition-colors">
                          <td className="px-6 py-5 font-bold">{r.staff_full_name}</td>
                          <td className="px-6 py-5 text-muted-foreground">{fmtDate(r.attendance_date)}</td>
                          <td className="px-6 py-5 text-success font-medium">{fmtTime(r.check_in)}</td>
                          <td className="px-6 py-5 text-destructive font-medium">{fmtTime(r.check_out)}</td>
                          <td className="px-6 py-5 font-bold">{workTime(r.check_in, r.check_out)}</td>
                          <td className="px-6 py-5 text-right">
                            {isDeveloper && (
                              <button onClick={() => handleDelete(r.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <AttendanceReports
          API={API} token={token} branches={branches}
          currentMonth={selMonth} currentYear={selYear}
          setCurrentMonth={setSelMonth} setCurrentYear={setSelYear}
          branchFilter={branchFilter}
          onViewHistory={setHistoryModal}
        />
      )}

      {/* History Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {historyModal.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{historyModal.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Attendance Logs — {format(new Date(historyModal._year, historyModal._month - 1), "MMMM yyyy")}
                  </p>
                </div>
              </div>
              <button onClick={() => setHistoryModal(null)} className="p-2 hover:bg-muted rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr className="bg-muted/50">
                    <th className="px-4 py-4 text-left font-black uppercase text-[10px] tracking-widest text-muted-foreground">Date</th>
                    <th className="px-4 py-4 text-left font-black uppercase text-[10px] tracking-widest text-success">Check-In</th>
                    <th className="px-4 py-4 text-left font-black uppercase text-[10px] tracking-widest text-destructive">Check-Out</th>
                    <th className="px-4 py-4 text-right font-black uppercase text-[10px] tracking-widest text-muted-foreground">Duration</th>
                    {isDeveloper && <th className="px-4 py-4 text-right font-black uppercase text-[10px] tracking-widest text-primary">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyModal.history?.length === 0 ? (
                    <tr><td colSpan={isDeveloper ? 5 : 4} className="py-8 text-center text-muted-foreground italic">No attendance records this month.</td></tr>
                  ) : historyModal.history?.map((h: any) => (
                    <tr key={h.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-semibold">{fmtDate(h.attendance_date)}</td>
                      <td className="px-4 py-3 text-success font-medium">{fmtTime(h.check_in)}</td>
                      <td className="px-4 py-3 text-destructive font-medium">{fmtTime(h.check_out)}</td>
                      <td className="px-4 py-3 text-right font-bold">{workTime(h.check_in, h.check_out)}</td>
                      {isDeveloper && (
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={async () => {
                              await handleDelete(h.id);
                              // Refilter local history to update UI immediately
                              setHistoryModal({
                                ...historyModal,
                                history: historyModal.history.filter((rec: any) => rec.id !== h.id)
                              });
                            }} 
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => {
                const headers = ["Date", "Check-In", "Check-Out", "Duration"];
                const rows = historyModal.history?.map((h: any) => [
                  fmtDate(h.attendance_date), fmtTime(h.check_in), fmtTime(h.check_out), workTime(h.check_in, h.check_out)
                ]);
                exportTableToPDF(`${historyModal.full_name} — Attendance`, headers, rows, "employee_attendance");
              }}
              className="w-full mt-6 py-4 bg-primary text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all">
              <FileDown className="w-5 h-5" /> Download PDF
            </button>
          </div>
        </div>
      )}

      {/* Check-Out Confirmation Modal */}
      {checkoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black font-display mb-2 text-foreground tracking-tight">Confirm Check-Out</h3>
            <p className="text-sm text-muted-foreground mb-8 font-medium">Checking out for <span className="font-bold text-primary">{checkoutModal.staff_name}</span></p>

            <div className="space-y-4 mb-10">
              <div className="p-6 bg-muted/30 rounded-[1.5rem] border border-border">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">Departure Time</p>
                {isDeveloper ? (
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <input 
                      type="datetime-local" 
                      value={checkoutModal.time}
                      onChange={e => setCheckoutModal({ ...checkoutModal, time: e.target.value })}
                      className="w-full rounded-xl border border-input bg-background pl-12 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-primary">
                    <Clock className="w-5 h-5 animate-pulse" />
                    <p className="text-2xl font-black tabular-nums">{format(nowPKT, "hh:mm:ss aa")}</p>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-4 font-bold italic opacity-60">* {isDeveloper ? "You have developer override privileges" : "Only Developers can edit checkout time"}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setCheckoutModal(null)}
                className="flex-1 py-4 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-[1.5rem] transition-all active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleCheckOut(checkoutModal.staff_id, checkoutModal.staff_name, isDeveloper ? checkoutModal.time : undefined)}
                disabled={isCheckingOut}
                className="flex-[2] py-4 bg-primary text-primary-foreground font-bold rounded-[1.5rem] shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Confirm Check-Out</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Monthly Report Sub-component ──────────────────────────────────────────────

const AttendanceReports = ({ API, token, branches, currentMonth, currentYear, setCurrentMonth, setCurrentYear, branchFilter, onViewHistory }: any) => {
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };

  const fetchSummary = useCallback(async () => {
    setIsFetching(true);
    try {
      const url = `${API}/api/attendance/summary?month=${currentMonth}&year=${currentYear}${branchFilter ? `&branch_id=${branchFilter}` : ""}`;
      const res = await fetch(url, { headers });
      if (res.ok) setSummaryData(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsFetching(false); }
  }, [currentMonth, currentYear, branchFilter]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  return (
    <div className="space-y-6">
      <div className="p-8 bg-card border border-border rounded-[2.5rem] shadow-card">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 mb-8">
          <div className="flex gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl"><FileText className="w-6 h-6 text-primary" /></div>
            <div>
              <h3 className="text-2xl font-bold font-display">Monthly Performance</h3>
              <p className="text-sm text-muted-foreground">Present = check-in & check-out completed. Absent = remaining days.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <select value={currentMonth} onChange={e => setCurrentMonth(+e.target.value)} className="rounded-xl border border-input px-4 py-2 text-sm font-bold bg-background cursor-pointer">
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i + 1}>{format(new Date(2026, i), "MMMM")}</option>
              ))}
            </select>
            <select value={currentYear} onChange={e => setCurrentYear(+e.target.value)} className="rounded-xl border border-input px-4 py-2 text-sm font-bold bg-background cursor-pointer">
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-5 text-left font-bold text-muted-foreground uppercase text-[10px]">Employee</th>
                <th className="px-6 py-5 text-center font-bold text-muted-foreground uppercase text-[10px]">Presents</th>
                <th className="px-6 py-5 text-center font-bold text-muted-foreground uppercase text-[10px]">Absents</th>
                <th className="px-6 py-5 text-center font-bold text-muted-foreground uppercase text-[10px]">Total Hours</th>
                <th className="px-6 py-5 text-right font-bold text-muted-foreground uppercase text-[10px]">Logs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isFetching ? (
                <tr><td colSpan={5} className="py-20 text-center text-muted-foreground animate-pulse">Loading report...</td></tr>
              ) : summaryData.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-muted-foreground">No staff data for this period.</td></tr>
              ) : summaryData.map(s => (
                <tr key={s.id} className="hover:bg-muted/5 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs group-hover:scale-110 transition-transform">
                        {s.full_name.charAt(0)}
                      </div>
                      <span className="font-bold">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-3 py-1 bg-success/10 text-success rounded-lg font-bold">{s.presents}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-3 py-1 bg-destructive/10 text-destructive rounded-lg font-bold">{s.absents}</span>
                  </td>
                  <td className="px-6 py-5 text-center font-bold tabular-nums">
                    {Math.floor(s.totalMinutes / 60)}h {s.totalMinutes % 60}m
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button onClick={() => onViewHistory({ ...s, _month: currentMonth, _year: currentYear })}
                      className="p-2.5 bg-card hover:bg-muted border border-border rounded-xl shadow-sm group/btn transition-all">
                      <Eye className="w-4 h-4 text-primary group-hover/btn:scale-110 transition-transform" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={() => {
          const hdrs = ["Employee", "Presents", "Absents", "Total Hours"];
          const rows = summaryData.map(s => [
            s.full_name, s.presents, s.absents,
            `${Math.floor(s.totalMinutes / 60)}h ${s.totalMinutes % 60}m`
          ]);
          exportTableToPDF(`Attendance Report — ${format(new Date(currentYear, currentMonth - 1), "MMMM yyyy")}`, hdrs, rows, "monthly_attendance");
        }}
        className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
        <FileDown className="w-5 h-5" /> Download Monthly PDF
      </button>
    </div>
  );
};

export default Attendance;
