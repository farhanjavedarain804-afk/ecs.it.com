import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Users, Edit2, Trash2, FileDown, Locate, Globe, Lock, UserCheck, UserX, BadgeDollarSign, Calendar, FileText, Award } from "lucide-react";
import { generatePDF, exportTableToPDF } from "@/utils/pdfGenerator";
import { logActivity } from "@/utils/logger";
import { generateAppointmentLetter } from "@/utils/appointmentLetterGenerator";
import { generateExperienceLetter } from "@/utils/experienceLetterGenerator";

const API_URL = import.meta.env.VITE_API_URL ?? '';

const Staff = () => {
  const { user, profile, hasRole, isDeveloper } = useAuth();
  const isAdminOrDev = hasRole("super_admin") || isDeveloper;
  const [staff, setStaff] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const isEditable = (createdAt: string) => {
    if (!createdAt) return true;
    if (isAdminOrDev) return true;
    
    // For Branch Admin: only editable within 2 hours
    const hoursSinceCreation = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation <= 2;
  };

  const emptyForm = {
    employee_id: "", full_name: "", father_name: "", cnic: "", designation: "",
    branch_id: "", status: "active", joining_date: new Date().toISOString().split("T")[0],
    salary: "", contact_1: "", contact_2: "", address: ""
  };
  const [form, setForm] = useState(emptyForm);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("ecs_token");
      const staffRes = await fetch(`${API_URL}/api/staff`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const staffData = await staffRes.json();
      setStaff(Array.isArray(staffData) ? staffData : []);

      // Fetch Branches
      const branchRes = await fetch(`${API_URL}/api/branches`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const branchData = await branchRes.json();
      setBranches(Array.isArray(branchData) ? branchData : []);

      // Pre-select branch if not super_admin
      if (!hasRole("super_admin") && profile?.branch_id) {
        setForm(prev => ({ ...prev, branch_id: profile.branch_id }));
      }
    } catch (err) {
      console.error("Fetch All Error:", err);
      toast({ title: "Error", description: "Failed to sync staff data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) fetchAll();
  }, [profile]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.branch_id) {
      toast({ title: "Name and branch required", variant: "destructive" });
      return;
    }

    const payload = {
      ...form,
      employee_id: form.employee_id || undefined,
      salary: parseFloat(form.salary) || 0
    };

    try {
      const token = localStorage.getItem("ecs_token");
      let res;
      if (editingId) {
        res = await fetch(`${API_URL}/api/staff/${editingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_URL}/api/staff`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operation failed");

      toast({ title: editingId ? "Staff updated!" : "Staff added successfully!" });
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm, branch_id: hasRole("super_admin") ? "" : (profile?.branch_id || "") });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEdit = (s: any) => {
    if (!isEditable(s.created_at)) {
      toast({ title: "Edit restricted", description: "Records older than 2 hours are locked for security.", variant: "destructive" });
      return;
    }
    setForm({
      employee_id: s.employee_id || "", full_name: s.full_name, father_name: s.father_name || "",
      cnic: s.cnic || "", designation: s.designation || "", branch_id: String(s.branch_id || ""),
      status: s.status, joining_date: s.joining_date ? new Date(s.joining_date).toISOString().split("T")[0] : "",
      salary: String(s.salary || ""), contact_1: s.contact_1 || "", contact_2: s.contact_2 || "", address: s.address || ""
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, createdAt: string) => {
    if (!isEditable(createdAt)) {
      toast({ title: "Delete restricted", description: "Records older than 2 hours are locked for security.", variant: "destructive" });
      return;
    }

    if (!confirm("Are you sure you want to delete this staff member?")) return;

    try {
      const res = await fetch(`${API_URL}/api/staff/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
      });
      if (!res.ok) throw new Error("Deletion failed");

      toast({ title: "Staff deleted successfully" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filtered = staff.filter((s) =>
    s.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    s.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const activeStaff = staff.filter(s => s.status === 'active');
  const inactiveStaff = staff.filter(s => s.status !== 'active');
  const totalSalary = staff.reduce((sum, s) => sum + (Number(s.salary) || 0), 0);
  const thisMonthStaff = staff.filter(s => {
    const d = new Date(s.joining_date || s.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const handleDownloadReport = () => {
    const isSuperAdmin = isAdminOrDev;
    const headers = ["ID", "Name", "Designation", "Branch", "Status", "Contact"];
    if (isSuperAdmin) headers.push("Salary");

    const rows = filtered.map(s => {
      const row = [
        s.employee_id || "—",
        s.full_name || "—",
        s.designation || "—",
        s.branches?.name || "—",
        s.status || "—",
        s.contact_1 || "—"
      ];
      if (isSuperAdmin) row.push(`Rs. ${Number(s.salary).toLocaleString()}`);
      return row;
    });
    exportTableToPDF("Staff Report", headers, rows, "staff_report");
  };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Staff Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage employee records, attendance, and payroll</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadReport} className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted shadow-sm transition-all active:scale-95">
            <FileDown className="w-4 h-4" /> Download Report
          </button>
          {isAdminOrDev && (
            <button
              onClick={() => {
                const bId = (!hasRole("super_admin") && profile?.branch_id) ? profile.branch_id : "";
                setEditingId(null);
                setForm({ ...emptyForm, branch_id: bId });
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Staff
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Users className="w-4 h-4 text-primary" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Staff</p><p className="text-2xl font-bold text-foreground mt-0.5">{staff.length}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-success/10"><UserCheck className="w-4 h-4 text-success" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active</p><p className="text-2xl font-bold text-foreground mt-0.5">{activeStaff.length}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><UserX className="w-4 h-4 text-destructive" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Inactive</p><p className="text-2xl font-bold text-foreground mt-0.5">{inactiveStaff.length}</p></div>
        </div>
        {isAdminOrDev && (
          <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><BadgeDollarSign className="w-4 h-4 text-warning" /></div>
            <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Monthly Bill</p><p className="text-xl font-bold text-foreground mt-0.5">Rs. {totalSalary.toLocaleString()}</p></div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by Employee ID or name..." className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-2xl bg-card border border-border p-6 shadow-elevated max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold font-display text-card-foreground mb-1">{editingId ? "Edit" : "Add"} Staff Member</h3>
            <p className="text-xs text-muted-foreground mb-5">{editingId ? "Update staff information below." : "Fill in details to register a new employee."}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Employee ID</label><input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} placeholder="Auto-assigned" className={inputCls} /></div>
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Full Name *</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls} /></div>
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Father Name</label><input value={form.father_name} onChange={(e) => setForm({ ...form, father_name: e.target.value })} className={inputCls} /></div>
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">CNIC</label><input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} className={inputCls} /></div>
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Designation</label><input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className={inputCls} /></div>
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Branch *</label>
                  <select
                    value={form.branch_id}
                    onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                    className={inputCls}
                    disabled={!hasRole('super_admin')}
                  >
                    <option value="">Select</option>
                    {branches
                      .filter(b => !hasRole("branch_admin") || hasRole("super_admin") || b.id === profile?.branch_id)
                      .map((b) => <option key={b.id} value={b.id}>{b.name}</option>)
                    }
                  </select>
                </div>
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                    <option value="active">Active</option><option value="inactive">Inactive</option><option value="terminated">Terminated</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Joining Date</label><input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} className={inputCls} /></div>
                {isAdminOrDev && (
                  <div>
                    <label className="text-sm font-medium text-card-foreground mb-1 block">Salary</label>
                    <input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className={inputCls} />
                  </div>
                )}

                <div className="lg:col-span-3 p-4 bg-muted/30 rounded-xl border border-border">
                  <label className="text-sm font-medium text-card-foreground mb-1 block">Permanent Address</label>
                  <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} className={inputCls + " resize-none"} />
                </div>

                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Contact 1</label><input value={form.contact_1} onChange={(e) => setForm({ ...form, contact_1: e.target.value })} className={inputCls} /></div>
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Contact 2</label><input value={form.contact_2} onChange={(e) => setForm({ ...form, contact_2: e.target.value })} className={inputCls} /></div>


              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md">
                  {editingId ? "Update" : "Add Staff"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-muted">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No staff found.</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different search or add new staff.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border shadow-card">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="text-left px-4 py-3">Employee</th>
              <th className="text-left px-4 py-3">CNIC</th>
              <th className="text-left px-4 py-3">Designation</th>
              <th className="text-left px-4 py-3">Contact</th>
              <th className="text-left px-4 py-3">Joining</th>
              {isAdminOrDev && <th className="text-left px-4 py-3">Salary</th>}
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{getInitials(s.full_name)}</div>
                      <div>
                        <p className="font-medium text-foreground">{s.full_name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">{s.employee_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[120px]">{s.cnic || "—"}</td>
                  <td className="px-4 py-3">
                    <p className="text-foreground text-xs">{s.designation || "—"}</p>
                    <p className="text-[10px] text-primary/70 font-bold uppercase">{s.branches?.name || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.contact_1 || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.joining_date ? new Date(s.joining_date).toLocaleDateString() : "—"}</td>
                  {isAdminOrDev && <td className="px-4 py-3 font-semibold text-primary text-sm">Rs. {Number(s.salary).toLocaleString()}</td>}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide w-fit ${s.status === 'active' ? 'bg-success/10 text-success' :
                        s.status === 'terminated' ? 'bg-destructive/10 text-destructive' :
                          'bg-muted-foreground/10 text-muted-foreground'
                        }`}>{s.status}</span>
                      {s.status !== 'active' && (s.status_changed_at || s.updated_at || s.created_at) && (
                        <p className="text-[9px] text-muted-foreground font-medium leading-none">
                          {new Date(s.status_changed_at || s.updated_at || s.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {isAdminOrDev && (
                        <>
                          <button 
                            onClick={() => generateAppointmentLetter(s)} 
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-success transition-colors" 
                            title="Download Appointment Letter"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => generateExperienceLetter(s)} 
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors" 
                            title="Download Experience Letter"
                          >
                            <Award className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {isEditable(s.created_at) ? (
                        <>
                          <button onClick={() => handleEdit(s)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(s.id, s.created_at)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <div className="p-1.5 text-muted-foreground/30" title="Locked (2+ hours old)"><Lock className="w-4 h-4" /></div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Staff;
