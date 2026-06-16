import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Edit2, Trash2, Lock, Users, MapPin, Calendar, Building2, Eye, X, FileText, ClipboardList, DollarSign, AlertCircle, FileDown } from "lucide-react";
import { logActivity } from "@/utils/logger";
import { exportTableToPDF } from "@/utils/pdfGenerator";

const API_URL = import.meta.env.VITE_API_URL ?? '';

const Customers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "customer_id">("created_at");
  const { user, session, hasRole, profile, isDeveloper } = useAuth();
  const { toast } = useToast();

  // --- Customer History Preview ---
  const [previewCustomer, setPreviewCustomer] = useState<any | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState<"invoices" | "complaints">("invoices");
  const [custInvoices, setCustInvoices] = useState<any[]>([]);
  const [custComplaints, setCustComplaints] = useState<any[]>([]);

  const openPreview = async (c: any) => {
    setPreviewCustomer(c);
    setHistoryLoading(true);
    setCustInvoices([]);
    setCustComplaints([]);
    setHistoryTab("invoices");

    const [invRes, compRes] = await Promise.all([
      supabase.from("invoices").select("invoice_number, total_amount, payment_status, issued_at, branches(name)")
        .eq("customer_id", c.id).order("issued_at", { ascending: false }),
      supabase.from("complaints").select("complaint_number, subject, status, created_at, branches(name)")
        .eq("customer_id", c.id).order("created_at", { ascending: false }),
    ]);
    setCustInvoices(invRes.data || []);
    setCustComplaints(compRes.data || []);
    setHistoryLoading(false);
  };

  const closePreview = () => setPreviewCustomer(null);

  const isEditable = (createdAt: string) => {
    if (!createdAt) return true;
    if (isDeveloper || hasRole("super_admin")) return true;
    if (!hasRole("branch_admin")) return false;

    const created = new Date(createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return diffInHours < 2;
  };

  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", branch_id: "" });

  const loadData = async () => {
    setLoading(true);
    const isBranchAdmin = hasRole("branch_admin") && !hasRole("super_admin");
    const branchId = profile?.branch_id;

    let customersQuery = supabase.from("customers").select("*, branches(id, name, city)");
    let branchesQuery = supabase.from("branches").select("id, name, city");

    if (isBranchAdmin && branchId) {
      customersQuery = customersQuery.eq("branch_id", branchId);
      branchesQuery = branchesQuery.eq("id", branchId);
    }

    const [c, b] = await Promise.all([
      customersQuery.order(sortBy, { ascending: false }),
      branchesQuery,
    ]);

    setCustomers(c.data || []);
    setBranches(b.data || []);

    if (isBranchAdmin && branchId) {
      setForm(prev => ({ ...prev, branch_id: branchId }));
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [sortBy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.branch_id) { toast({ title: "Name, phone and branch are required", variant: "destructive" }); return; }

    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      branch_id: form.branch_id
    };

    if (editingId) {
      // Update goes through backend API
      const res = await fetch(`${API_URL}/api/customers/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ecs_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error || "Update failed", variant: "destructive" });
        return;
      }
      toast({ title: "Customer updated" });
      await logActivity({
        userId: user?.id!,
        userEmail: user?.email!,
        activityType: "CUSTOMER_UPDATED",
        branchId: form.branch_id,
        metadata: { customerId: editingId, customerName: form.name }
      });
    } else {
      // Create goes through backend API - triggers duplicate check
      const res = await fetch(`${API_URL}/api/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ecs_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 409) {
        // Duplicate detected — show informative popup
        const err = await res.json();
        toast({
          title: "⚠️ Customer Already Registered",
          description: `A customer with this phone number already exists in this branch.\nExisting ID: ${err.existing_customer_id} - ${err.existing_name}`,
          variant: "destructive"
        });
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error || "Failed to add customer", variant: "destructive" });
        return;
      }

      const newCust = await res.json();
      toast({ title: "Customer added!", description: `Customer ID: ${newCust.customer_id}` });
      await logActivity({
        userId: user?.id!,
        userEmail: user?.email!,
        activityType: "CUSTOMER_ADDED",
        branchId: form.branch_id,
        metadata: { customerId: newCust.id, customerName: newCust.name }
      });
    }
    resetForm(); loadData();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    const isBranchAdmin = hasRole("branch_admin") && !hasRole("super_admin");
    setForm({
      name: "", phone: "", email: "", address: "", city: "",
      branch_id: isBranchAdmin ? (profile?.branch_id || "") : ""
    });
  };

  const startEdit = (c: any) => {
    if (!isEditable(c.created_at)) {
      toast({ title: "Edit restricted", description: "Branch admins can only edit customer records within 2 hours of creation.", variant: "destructive" });
      return;
    }
    setForm({ name: c.name, phone: c.phone, email: c.email || "", address: c.address || "", city: c.city || "", branch_id: c.branch_id || "" });
    setEditingId(c.id); setShowForm(true);
  };

  const deleteCustomer = async (id: string, createdAt: string) => {
    if (!isEditable(createdAt)) {
      toast({ title: "Delete restricted", description: "Records older than 2 hours are locked for security.", variant: "destructive" });
      return;
    }

    // Optimistic UI update: Remove from local state first for immediate feedback
    const originalCustomers = [...customers];
    setCustomers(prev => prev.filter(c => c.id !== id));

    const { error, count } = await supabase.from("customers").delete().eq("id", id);

    if (error) {
      console.error("Deletion error:", error);
      setCustomers(originalCustomers); // Rollback
      if (error.code === "23503") {
        toast({ title: "Restricted Deletion", description: "This customer has active complaints or invoices. Please remove those first.", variant: "destructive" });
      } else {
        toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
      }
      return;
    }

    if (count === 0) {
      console.warn("No rows deleted. Likely RLS policy issue.");
      setCustomers(originalCustomers); // Rollback
      toast({
        title: "Deletion Blocked",
        description: "The database refused to delete this record. Please ensure the 'fix_customer_deletion' SQL script has been run in your Supabase SQL Editor.",
        variant: "destructive"
      });
      return;
    }

    // Success notification
    await logActivity({
      userId: user?.id!,
      userEmail: user?.email!,
      activityType: "CUSTOMER_DELETED",
      branchId: null,
      metadata: { customerId: id }
    });

    toast({ title: "Customer Deleted Immediately", description: "The record has been permanently removed." });
    loadData(); // Final background sync
  };

  const filtered = customers.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.customer_id?.toLowerCase().includes(search.toLowerCase())
  );

  const thisMonth = customers.filter(c => {
    const d = new Date(c.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const withBranch = customers.filter(c => c.branch_id).length;
  const uniqueCities = new Set(customers.filter(c => c.city).map(c => c.city)).size;

  const handleDownloadReport = () => {
    const headers = ["Name", "Phone", "Email", "City", "Branch"];
    const rows = filtered.map(c => [
      c.name || "",
      c.phone || "",
      c.email || "",
      c.city || (Array.isArray(c.branches) ? c.branches[0]?.city : c.branches?.city) || "",
      c.branches?.name || ""
    ]);
    exportTableToPDF("Customers Report", headers, rows, "customers_report");
  };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Customers</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your customer database across all branches</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadReport} className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted shadow-sm transition-all active:scale-95">
            <FileDown className="w-4 h-4" /> Download Report
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Users className="w-4 h-4 text-primary" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Customers</p><p className="text-2xl font-bold text-foreground mt-0.5">{customers.length}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-success/10"><Calendar className="w-4 h-4 text-success" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">New This Month</p><p className="text-2xl font-bold text-foreground mt-0.5">{thisMonth.length}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-info/10"><Building2 className="w-4 h-4 text-info" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Branch Linked</p><p className="text-2xl font-bold text-foreground mt-0.5">{withBranch}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/10"><MapPin className="w-4 h-4 text-warning" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Unique Cities</p><p className="text-2xl font-bold text-foreground mt-0.5">{uniqueCities}</p></div>
        </div>
      </div>

      {/* Search Bar & Sort */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, name or phone number..." className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
        </div>
        <div className="flex items-center gap-2 p-1 bg-muted rounded-xl w-full md:w-auto">
          <button
            onClick={() => setSortBy("customer_id")}
            className={`flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === "customer_id" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ClipboardList className="w-3.5 h-3.5" /> ID Wise
          </button>
          <button
            onClick={() => setSortBy("created_at")}
            className={`flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === "created_at" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Calendar className="w-3.5 h-3.5" /> Registration Wise
          </button>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-elevated">
            <h3 className="text-xl font-bold font-display text-card-foreground mb-1">{editingId ? "Edit" : "Add"} Customer</h3>
            <p className="text-xs text-muted-foreground mb-5">{editingId ? "Update this customer's information below." : "Fill in the details to register a new customer."}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Full Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Phone *</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
              <div><label className="text-sm font-medium text-card-foreground mb-1 block">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-sm font-medium text-card-foreground mb-1 block">Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-card-foreground mb-1 block">City</label>
                  <input 
                    value={form.city} 
                    onChange={(e) => setForm({ ...form, city: e.target.value })} 
                    placeholder={branches.find(b => b.id === form.branch_id)?.city ? `Branch City: ${branches.find(b => b.id === form.branch_id)?.city}` : "Enter city..."}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
                  />
                </div>
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Branch *</label>
                  <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" disabled={hasRole("branch_admin") && !hasRole("super_admin")}>
                    <option value="">None</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="text-sm font-medium text-card-foreground mb-1 block">Registration Date (Auto)</label><input value={editingId ? (customers.find(c => c.id === editingId)?.created_at ? new Date(customers.find(c => c.id === editingId).created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')) : new Date().toLocaleDateString('en-GB')} className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2.5 text-sm cursor-not-allowed" disabled /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">{editingId ? "Update Customer" : "Add Customer"}</button>
                <button type="button" onClick={resetForm} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No customers found.</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different search or add a new customer.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border shadow-card">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Phone</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">City</th>
              <th className="text-left px-4 py-3">Branch</th>
              <th className="text-left px-4 py-3">Registered</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{getInitials(c.name)}</div>
                      <div>
                        <span className="font-medium text-foreground block">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{c.customer_id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{c.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email || ""}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {c.city || (Array.isArray(c.branches) ? c.branches[0]?.city : c.branches?.city) || ""}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.branches?.name ? <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">{c.branches.name}</span> : ""}
                  </td>
                  <td className="px-4 py-3 text-[10px] text-muted-foreground whitespace-nowrap">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openPreview(c)} className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="View History"><Eye className="w-4 h-4" /></button>
                      {isEditable(c.created_at) ? (
                        <>
                          <button onClick={() => startEdit(c)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteCustomer(c.id, c.created_at)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
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

      {/* --- Customer History Preview Modal --- */}
      {previewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={closePreview}>
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-elevated overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {previewCustomer.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{previewCustomer.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {previewCustomer.created_at ? `${new Date(previewCustomer.created_at).toLocaleDateString('en-GB')} | ` : ''}
                    {previewCustomer.phone}
                    {(previewCustomer.city || (Array.isArray(previewCustomer.branches) ? previewCustomer.branches[0]?.city : previewCustomer.branches?.city)) ? ` | ${previewCustomer.city || (Array.isArray(previewCustomer.branches) ? previewCustomer.branches[0]?.city : previewCustomer.branches?.city)}` : ''}
                    {previewCustomer.branches?.name ? ` | ${previewCustomer.branches.name}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={closePreview} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {/* Summary Stats */}
            {!historyLoading && (
              <div className="grid grid-cols-4 gap-px bg-border border-b border-border">
                {[
                  { icon: FileText, label: "Total Invoices", value: custInvoices.length, color: "text-primary" },
                  { icon: DollarSign, label: "Total Paid", value: `Rs. ${custInvoices.filter(i => i.payment_status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0).toLocaleString()}`, color: "text-emerald-600" },
                  { icon: AlertCircle, label: "Dues / Unpaid", value: `Rs. ${custInvoices.filter(i => i.payment_status !== 'paid').reduce((s, i) => s + Number(i.total_amount), 0).toLocaleString()}`, color: "text-red-500" },
                  { icon: ClipboardList, label: "Complaints", value: custComplaints.length, color: "text-warning" },
                ].map((stat, i) => (
                  <div key={i} className="bg-card px-4 py-3 flex items-center gap-2">
                    <stat.icon className={`w-4 h-4 ${stat.color} shrink-0`} />
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                      <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-border">
              {(["invoices", "complaints"] as const).map(tab => (
                <button key={tab} onClick={() => setHistoryTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold capitalize transition-colors relative
                    ${historyTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tab === "invoices" ? <FileText className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                  {tab} {tab === "invoices" ? `(${custInvoices.length})` : `(${custComplaints.length})`}
                  {historyTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {historyLoading ? (
                <div className="flex justify-center py-12"><div className="w-7 h-7 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin" /></div>
              ) : historyTab === "invoices" ? (
                custInvoices.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">No invoices found for this customer.</div>
                ) : (
                  <div className="space-y-2">
                    {custInvoices.map((inv: any) => (
                      <div key={inv.invoice_number} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-primary/60 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-foreground">{inv.invoice_number}</p>
                            <p className="text-xs text-muted-foreground">{new Date(inv.issued_at).toLocaleDateString()} | {inv.branches?.name || ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold text-foreground">Rs. {Number(inv.total_amount).toLocaleString()}</p>
                          <span className={`text-[10px] font-bold capitalize px-2 py-0.5 rounded border ${inv.payment_status === 'paid' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : inv.payment_status === 'partial' ? 'text-amber-600 bg-amber-50 border-amber-200'
                              : 'text-red-600 bg-red-50 border-red-200'
                            }`}>{inv.payment_status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                custComplaints.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">No complaints found for this customer.</div>
                ) : (
                  <div className="space-y-2">
                    {custComplaints.map((comp: any) => (
                      <div key={comp.complaint_number} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <ClipboardList className="w-4 h-4 text-warning/70 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-foreground">{comp.complaint_number}</p>
                            <p className="text-xs text-muted-foreground">{comp.subject || ''} | {new Date(comp.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold capitalize px-2 py-0.5 rounded border ${comp.status === 'resolved' || comp.status === 'closed' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : comp.status === 'dismissed' ? 'text-gray-500 bg-gray-100 border-gray-200'
                            : comp.status === 'in_progress' ? 'text-blue-600 bg-blue-50 border-blue-200'
                              : 'text-amber-600 bg-amber-50 border-amber-200'
                          }`}>{comp.status.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;

