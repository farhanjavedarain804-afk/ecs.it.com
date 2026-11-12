import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Building2, UserPlus, Mail, Phone, MapPin, Navigation, ShieldCheck, Lock, Globe, Locate, Trash2, BarChart3, TrendingUp, TrendingDown, DollarSign, Users2, AlertCircle, X } from "lucide-react";

const Branches = () => {
  const { roles, hasRole, isDeveloper } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const emptyForm = {
    name: "",
    branch_admin_name: "",
    city: "",
    phone: "",
    email: "",
    address: "",
    username: "",
    password: "",
    branch_code: "",
    is_active: true
  };
  const [form, setForm] = useState(emptyForm);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [resettingPwd, setResettingPwd] = useState<{ userId: string; name: string } | null>(null);
  const [resettingEmail, setResettingEmail] = useState<{ userId: string; name: string; currentEmail: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const handleAdminPasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_update_user_password' as any, {
        target_user_id: resettingPwd?.userId,
        new_password: newPassword
      });

      if (error) throw error;

      toast({ title: "Password updated successfully" });
      setResettingPwd(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Error updating password", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchBranches = async () => {
    const { data } = await supabase.from("branches").select("*, profiles(*)").order("created_at", { ascending: false });
    setBranches(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (hasRole("super_admin")) {
      fetchBranches();
    } else {
      setLoading(false);
    }
  }, [roles]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm(
      "âš ï¸ Are you sure you want to delete this branch?\n\nThis will:\nâ€¢ Unlink all staff, profiles, complaints, invoices, inventory, and financial records from this branch.\nâ€¢ The branch and its admin account will be permanently removed.\n\nThis action cannot be undone."
    )) return;

    try {
      // Step 1: Nullify branch_id across all related tables to satisfy FK constraints
      await Promise.all([
        supabase.from("profiles").update({ branch_id: null }).eq("branch_id", id),
        supabase.from("staff").update({ branch_id: null }).eq("branch_id", id),
        supabase.from("inventory_items").update({ branch_id: null } as any).eq("branch_id", id),
        supabase.from("complaints").update({ branch_id: null }).eq("branch_id", id),
        supabase.from("invoices").update({ branch_id: null }).eq("branch_id", id),
        supabase.from("financial_entries").update({ branch_id: null }).eq("branch_id", id),
      ]);

      // Step 2: Now safely delete the branch
      const { error } = await supabase.from("branches").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Branch deleted successfully" });
      fetchBranches();
    } catch (error: any) {
      toast({ title: "Error deleting branch", description: error.message, variant: "destructive" });
    }
  };

  const fetchBranchStats = async (branch: any) => {
    setSelectedBranch(branch);
    setLoadingStats(true);
    setStats(null);

    try {
      const [invoices, complaints, staff, financials] = await Promise.all([
        supabase.from("invoices").select("total_amount, payment_status").eq("branch_id", branch.id),
        supabase.from("complaints").select("id, status").eq("branch_id", branch.id),
        supabase.from("staff").select("id, salary").eq("branch_id", branch.id),
        supabase.from("financial_entries").select("amount, entry_type").eq("branch_id", branch.id)
      ]);

      const invData = invoices.data || [];
      const compData = complaints.data || [];
      const staffData = staff.data || [];
      const finData = financials.data || [];

      const totalPaidInvoices = invData.filter(i => i.payment_status === 'paid').reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
      const otherIncome = finData.filter((e: any) => e.entry_type === "income" || e.entry_type === "Credit").reduce((s: any, e: any) => s + Number(e.amount), 0);
      const otherExpenses = finData.filter((e: any) => e.entry_type === "expense" || e.entry_type === "Debit").reduce((s: any, e: any) => s + Number(e.amount), 0);

      const totalRevenue = totalPaidInvoices + otherIncome;
      const unpaidRevenue = invData.filter(i => i.payment_status !== 'paid').reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
      const totalSalaries = staffData.reduce((sum, s) => sum + (Number(s.salary) || 0), 0);

      const resolvedCount = compData.filter(c => ['completed', 'invoice_generated', 'closed'].includes(c.status)).length;
      const resolveRatio = compData.length > 0 ? (resolvedCount / compData.length) * 100 : 0;

      setStats({
        totalInvoices: invData.length,
        revenue: totalRevenue,
        unpaidInvoices: invData.filter(i => i.payment_status !== 'paid').length,
        unpaidRevenue,
        totalComplaints: compData.length,
        resolvedComplaints: resolvedCount,
        resolveRatio,
        totalStaff: staffData.length,
        totalSalaries,
        expenses: otherExpenses,
        profitLoss: totalRevenue - otherExpenses // Salaries are paid solely by Head Office, not deducted from branch balance
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.username || (!editingId && !form.password)) {
      toast({ title: "Please fill required fields (Name, Username, Password)", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const LPAD = (str: string, length: number, char: string) => str.padStart(length, char);

      const branchPayload = {
        name: form.name,
        address: form.address || null,
        city: form.city || null,
        phone: form.phone || null,
        email: form.email || null,
        is_active: form.is_active,
        branch_code: form.branch_code || `BR-${LPAD((branches.length + 1).toString(), 3, '0')}`
      };


      if (editingId) {
        const { error } = await supabase.from("branches").update(branchPayload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Branch updated successfully" });
      } else {
        const { data: branch, error: branchErr } = await supabase.from("branches").insert({ ...branchPayload, is_active: true }).select().single();
        if (branchErr) throw branchErr;

        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: form.username,
          password: form.password,
          options: { data: { full_name: form.branch_admin_name } }
        });

        if (authErr) throw authErr;
        if (!authData.user) throw new Error("Failed to create user");

        const userId = authData.user.id;
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { error: profileErr } = await supabase.from("profiles")
          .update({ branch_id: branch.id, full_name: form.branch_admin_name })
          .eq("user_id", userId);

        if (profileErr) throw profileErr;

        await supabase.from("user_roles").insert({ user_id: userId, role: "branch_admin" });
        toast({ title: "Branch and Admin User created successfully!" });
      }

      resetForm();
      fetchBranches();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (b: any) => {
    setForm({
      name: b.name,
      address: b.address || "",
      city: b.city || "",
      phone: b.phone || "",
      email: b.email || "",
      branch_admin_name: "",
      username: "",
      password: "",
      branch_code: b.branch_code || "",
      is_active: b.is_active
    });
    setEditingId(b.id);
    setSelectedBranch(b); // Store full branch object for admin management
    setShowForm(true);
  };

  const handleResetAdminPassword = async (email: string) => {
    if (!email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard/settings`,
      });
      if (error) throw error;
      toast({ title: "Reset link sent", description: `A password reset link has been sent to ${email}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const removeAdmin = async (profileId: string) => {
    if (!window.confirm("Are you sure you want to unlink this administrator from this branch?")) return;
    try {
      const { error } = await supabase.from("profiles").update({ branch_id: null }).eq("id", profileId);
      if (error) throw error;
      toast({ title: "Admin unlinked" });
      fetchBranches();
      // Update selectedBranch locally to reflect change
      if (selectedBranch) {
        setSelectedBranch({
          ...selectedBranch,
          profiles: selectedBranch.profiles.filter((p: any) => p.id !== profileId)
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAdminEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.includes("@")) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_update_user_email' as any, {
        target_user_id: resettingEmail?.userId,
        new_email: newEmail
      });

      if (error) throw error;

      toast({ title: "Email updated successfully" });
      setResettingEmail(null);
      setNewEmail("");
      fetchBranches();
    } catch (err: any) {
      toast({ title: "Error updating email", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasRole("super_admin") && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border text-center px-4">
        <ShieldCheck className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
        <h2 className="text-xl font-bold text-foreground mb-2">Access Restricted</h2>
        <p className="text-muted-foreground max-w-sm">Only Super Admins can manage system-wide branches and administrative users.</p>
      </div>
    );
  }

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";
  const labelCls = "text-sm font-medium text-card-foreground mb-1 block";

  const activeBranches = branches.filter(b => b.is_active).length;
  const inactiveBranches = branches.filter(b => !b.is_active).length;
  const uniqueCities = new Set(branches.filter(b => b.city).map(b => b.city)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Branch Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Configure system branches and assign administrators.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Add Branch
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Building2 className="w-4 h-4 text-primary" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Branches</p><p className="text-2xl font-bold text-foreground mt-0.5">{branches.length}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-success/10"><ShieldCheck className="w-4 h-4 text-success" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active</p><p className="text-2xl font-bold text-foreground mt-0.5">{activeBranches}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted"><Lock className="w-4 h-4 text-muted-foreground" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Inactive</p><p className="text-2xl font-bold text-foreground mt-0.5">{inactiveBranches}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-info/10"><MapPin className="w-4 h-4 text-info" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cities</p><p className="text-2xl font-bold text-foreground mt-0.5">{uniqueCities}</p></div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-2xl bg-card border border-border p-6 shadow-elevated max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold font-display text-card-foreground mb-6">
              {editingId ? "Edit Branch" : "Register New Branch"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Branch Info Section */}
                <div className="md:col-span-1 space-y-4">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-3 h-3" /> Basic Details
                  </h4>
                  <div>
                    <label className={labelCls}>Branch Name *</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>City</label>
                    <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Full Address</label>
                  <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={5} className={inputCls + " resize-none"} />
                </div>

                {/* Admin Auth Section */}
                <div className="md:col-span-1 space-y-4">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <UserPlus className="w-3 h-3" /> Administrator & Verification
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Branch Code (Public ID)</label>
                      <input
                        value={form.branch_code}
                        onChange={(e) => setForm({ ...form, branch_code: e.target.value.toUpperCase() })}
                        placeholder="e.g. BR-001"
                        className={inputCls}
                      />
                    </div>
                  </div>
                  {editingId ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className={labelCls}>Branch Status</label>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-input text-primary h-4 w-4" />
                          <label htmlFor="is_active" className="text-sm font-medium text-foreground">Active</label>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-muted/30 border border-border">
                        <label className={labelCls}>Administrative Accounts</label>
                        <div className="space-y-2 mt-2">
                          {selectedBranch?.profiles?.length > 0 ? (
                            selectedBranch.profiles.map((p: any) => (
                              <div key={p.id} className="flex flex-col p-2.5 rounded-lg bg-card border border-border shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{p.full_name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{p.email || "No email linked"}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {(!isDeveloper && p.email === "farhanjaved357@gmail.com") ? (
                                      <div className="p-1 px-2 rounded bg-muted text-[10px] font-bold text-muted-foreground border border-border">System Restricted</div>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setResettingPwd({ userId: p.user_id, name: p.full_name })}
                                          className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors"
                                          title="Change Password"
                                        >
                                          <Lock className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setResettingEmail({ userId: p.user_id, name: p.full_name, currentEmail: p.email })}
                                          className="p-1.5 rounded-md hover:bg-info/10 text-info transition-colors"
                                          title="Update Email"
                                        >
                                          <Mail className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleResetAdminPassword(p.email)}
                                          className="p-1.5 rounded-md hover:bg-success/10 text-success transition-colors"
                                          title="Send Reset Link"
                                        >
                                          <Globe className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeAdmin(p.id)}
                                          className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                                          title="Remove Admin"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-muted-foreground text-center py-2 italic font-medium">No admins linked to this branch.</p>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-[10px] font-bold text-primary uppercase mb-2">Add New Admin</p>
                          <div className="space-y-2">
                            <input value={form.branch_admin_name} onChange={(e) => setForm({ ...form, branch_admin_name: e.target.value })} placeholder="Full Name" className={inputCls + " py-1.5 text-xs"} />
                            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Email address" className={inputCls + " py-1.5 text-xs"} />
                            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" className={inputCls + " py-1.5 text-xs"} />
                            <button
                              type="button"
                              onClick={async () => {
                                if (!form.username || !form.password || !form.branch_admin_name) {
                                  toast({ title: "Fill all admin fields", variant: "destructive" });
                                  return;
                                }
                                try {
                                  const { data: authData, error: authErr } = await supabase.auth.signUp({
                                    email: form.username,
                                    password: form.password,
                                    options: { data: { full_name: form.branch_admin_name } }
                                  });
                                  if (authErr) throw authErr;
                                  const userId = authData.user?.id;
                                  if (!userId) throw new Error("Failed to create auth user");
                                  await new Promise(r => setTimeout(r, 1000));
                                  await supabase.from("profiles").update({ branch_id: editingId, full_name: form.branch_admin_name }).eq("user_id", userId);
                                  await supabase.from("user_roles").insert({ user_id: userId, role: "branch_admin" });
                                  toast({ title: "New administrator added" });
                                  setForm({ ...form, username: "", password: "", branch_admin_name: "" });
                                  fetchBranches();
                                } catch (err: any) {
                                  toast({ title: "Error", description: err.message, variant: "destructive" });
                                }
                              }}
                              className="w-full py-2 rounded-lg bg-foreground text-background text-[10px] font-bold shadow-md hover:bg-foreground/90 transition-all uppercase tracking-widest"
                            >
                              Add Representative
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <input required value={form.branch_admin_name} onChange={(e) => setForm({ ...form, branch_admin_name: e.target.value })} placeholder="Admin Full Name" className={inputCls} />
                      <input required type="email" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Admin Email (Login)" className={inputCls} />
                      <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" className={inputCls} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={isSubmitting} className="flex-1 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md transition-all disabled:opacity-50 active:scale-95">
                  {isSubmitting ? "Processing..." : (editingId ? "Update Branch" : "Create Branch & Admin")}
                </button>
                <button type="button" onClick={resetForm} className="flex-1 rounded-lg border border-border py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors active:scale-95">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" /><p className="text-sm text-muted-foreground animate-pulse">Loading branches...</p></div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-2xl border border-dashed border-border text-center"><Building2 className="w-12 h-12 text-muted-foreground mb-4 opacity-20" /><h3 className="text-lg font-semibold text-foreground">No branches found</h3></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((b) => (
            <div key={b.id} className="group relative rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-elevated hover:border-primary/20 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors"><Building2 className="w-6 h-6" /></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-card-foreground group-hover:text-primary transition-colors truncate">{b.name}</h4>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 tracking-tighter">{b.branch_code || 'NO-CODE'}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${b.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{b.is_active ? "Active" : "Inactive"}</span>
                      </div>
                      
                      {/* Administrators List */}
                      <div className="mt-2 space-y-1">
                        {b.profiles && b.profiles.length > 0 ? (
                          <>
                            {b.profiles.slice(0, 2).map((p: any) => (
                              <div key={p.id} className="text-[10px] font-semibold text-muted-foreground bg-muted/30 px-2 py-1 rounded-lg flex items-center gap-2 border border-border/50">
                                <Users2 className="w-3 h-3 text-primary" />
                                <span className="truncate">{p.full_name}</span>
                              </div>
                            ))}
                            {b.profiles.length > 2 && (
                              <div className="text-[9px] font-bold text-primary pl-2 tracking-wider">
                                + {b.profiles.length - 2} more Administrators
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-[10px] font-semibold text-muted-foreground bg-muted/30 px-2 py-1 rounded-lg flex items-center gap-2 border border-border/50 italic">
                            <Users2 className="w-3 h-3 text-muted-foreground/50" />
                            <span>No admin assigned</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); startEdit(b); }} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={(e) => handleDelete(e, b.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 cursor-pointer" onClick={() => fetchBranchStats(b)}>
                <div className="pt-3 border-t border-border flex items-center justify-between text-primary font-bold text-xs uppercase tracking-widest group-hover:px-1 transition-all">
                  View Analytics <BarChart3 className="w-3 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Modal */}
      {selectedBranch && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
          <div className="w-full max-w-2xl rounded-3xl bg-card border border-border shadow-2xl overflow-hidden">
            <div className="p-6 bg-primary text-primary-foreground flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold font-display">{selectedBranch.name} Analytics</h3>
                <p className="text-sm opacity-80">{selectedBranch.city || 'Regional Center'}</p>
              </div>
              <button onClick={() => setSelectedBranch(null)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8">
              {loadingStats ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground">Calculating metrics...</p>
                </div>
              ) : stats ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {/* Revenue */}
                  <div className="p-4 rounded-2xl bg-success/5 border border-success/10">
                    <div className="flex items-center gap-2 mb-2 text-success">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Revenue</span>
                    </div>
                    <div className="text-xl font-bold">Rs. {stats.revenue.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">Paid Invoices</div>
                  </div>

                  {/* Staff */}
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                      <Users2 className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Total Staff</span>
                    </div>
                    <div className="text-xl font-bold">{stats.totalStaff}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">Active Employees</div>
                  </div>

                  {/* Complaints */}
                  <div className="p-4 rounded-2xl bg-warning/5 border border-warning/10">
                    <div className="flex items-center gap-2 mb-2 text-warning">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Resolve Ratio</span>
                    </div>
                    <div className="text-xl font-bold">{stats.resolveRatio.toFixed(1)}%</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{stats.resolvedComplaints}/{stats.totalComplaints} Solved</div>
                  </div>

                  {/* Unpaid */}
                  <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/10">
                    <div className="flex items-center gap-2 mb-2 text-destructive">
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Pending</span>
                    </div>
                    <div className="text-xl font-bold">Rs. {stats.unpaidRevenue.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{stats.unpaidInvoices} Unpaid Invoices</div>
                  </div>

                  {/* Profit/Loss */}
                  <div className={`p-4 rounded-2xl border ${stats.profitLoss >= 0 ? "bg-success/5 border-success/10" : "bg-destructive/5 border-destructive/10"}`}>
                    <div className={`flex items-center gap-2 mb-2 ${stats.profitLoss >= 0 ? "text-success" : "text-destructive"}`}>
                      {stats.profitLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span className="text-[10px] font-bold uppercase tracking-wider">Profit / Loss</span>
                    </div>
                    <div className={`text-xl font-bold ${stats.profitLoss >= 0 ? "text-success" : "text-destructive"}`}>
                      Rs. {stats.profitLoss.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">Branch Profit (Salaries Paid by HO)</div>
                  </div>

                  {/* Activity */}
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                    <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                      <BarChart3 className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Activity</span>
                    </div>
                    <div className="text-xl font-bold">{stats.totalInvoices}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">Total Bookings</div>
                  </div>
                </div>
              ) : null}

              <div className="mt-8 flex justify-center">
                <button onClick={() => setSelectedBranch(null)} className="px-8 py-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold transition-all">
                  Close Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Password Reset Modal */}
      {resettingPwd && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold font-display text-card-foreground">Change Password</h3>
              <button onClick={() => setResettingPwd(null)} className="p-2 rounded-full hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 mb-6">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Administrator</p>
              <p className="font-bold text-primary">{resettingPwd.name}</p>
            </div>
            <form onSubmit={handleAdminPasswordUpdate} className="space-y-4">
              <div>
                <label className={labelCls}>New Password</label>
                <input required type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" />
              </div>
              <div>
                <label className={labelCls}>Confirm New Password</label>
                <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md transition-all active:scale-95">
                  {isSubmitting ? "Updating..." : "Update Password"}
                </button>
                <button type="button" onClick={() => setResettingPwd(null)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors active:scale-95">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Email Reset Modal */}
      {resettingEmail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold font-display text-card-foreground">Update Email Address</h3>
              <button onClick={() => setResettingEmail(null)} className="p-2 rounded-full hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 bg-info/5 rounded-xl border border-info/10 mb-6">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Administrator</p>
              <p className="font-bold text-info">{resettingEmail.name}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Current: {resettingEmail.currentEmail}</p>
            </div>
            <form onSubmit={handleAdminEmailUpdate} className="space-y-4">
              <div>
                <label className={labelCls}>New Email Address</label>
                <input required type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputCls} placeholder="new-email@example.com" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="flex-1 rounded-lg bg-info py-2.5 text-sm font-semibold text-white hover:bg-info/90 shadow-md transition-all active:scale-95">
                  {isSubmitting ? "Updating..." : "Update Email"}
                </button>
                <button type="button" onClick={() => setResettingEmail(null)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors active:scale-95">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Branches;

