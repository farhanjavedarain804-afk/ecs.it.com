import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingUp, TrendingDown, Wallet, History, Edit2, Trash2, FileText, FileDown, Lock } from "lucide-react";
import { logActivity } from "@/utils/logger";
import { exportTableToPDF } from "@/utils/pdfGenerator";

const Financial = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    total_credit: 0,
    total_debit: 0,
    total_cash: 0,
    total_bank: 0,
    net_balance: 0,
    month_activity: 0
  });
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const { user, hasRole, profile, isDeveloper } = useAuth();
  const isAdminOrDev = hasRole("super_admin") || isDeveloper;
  const { toast } = useToast();
  const isEditable = (createdAt: string) => {
    if (!createdAt) return true;
    if (isAdminOrDev) return true;
    if (!hasRole("branch_admin")) return false;

    const created = new Date(createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return diffInHours < 2;
  };

  const [form, setForm] = useState({
    branch_id: "",
    entry_type: "Credit",
    category: "Ledger",
    cash_amount: "",
    bank_amount: "",
    description: "",
    entry_date: new Date().toISOString().split('T')[0],
    entry_time: new Date().toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5)
  });

  const fetchData = async () => {
    const isBranchAdmin = hasRole("branch_admin") && !hasRole("super_admin");
    const branchId = profile?.branch_id;
    const API_URL = import.meta.env.VITE_API_URL ?? '';
    const token = localStorage.getItem("ecs_token");

    try {
      let url = `${API_URL}/api/financial_entries`;
      if (isBranchAdmin && branchId) {
        url += `?branch_id=${branchId}`;
        setForm(prev => ({ ...prev, branch_id: branchId }));
      }
      if (filterMonth !== "all") {
        const [y, m] = filterMonth.split("-");
        url += `${url.includes('?') ? '&' : '?'}month=${m}&year=${y}`;
      }

      const [entRes, brRes] = await Promise.all([
        fetch(url, { headers: { "Authorization": `Bearer ${token}` } }),
        supabase.from("branches").select("id, name") // Branches still fine from Supabase or can be from backend
      ]);

      if (!entRes.ok) throw new Error("Failed to fetch entries");
      
      const resData = await entRes.json();
      setEntries(resData.entries || []);
      setSummary(resData.summary || {
        total_credit: 0,
        total_debit: 0,
        total_cash: 0,
        total_bank: 0,
        net_balance: 0,
        month_activity: 0
      });
      setBranches(brRes.data || []);
    } catch (err: any) {
      toast({ title: "Fetch Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.branch_id || (!form.cash_amount && !form.bank_amount) || !form.description) {
      toast({ title: "Fill required fields", description: "Branch, Amounts, and Particulars are required.", variant: "destructive" });
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL ?? '';
    const token = localStorage.getItem("ecs_token");
    
    const payload = {
      branch_id: form.branch_id,
      entry_type: form.entry_type,
      category: form.category || "Ledger",
      cash_amount: parseFloat(form.cash_amount) || 0,
      bank_amount: parseFloat(form.bank_amount) || 0,
      description: form.description,
      entry_date: form.entry_date,
      entry_time: form.entry_time + ":00", // Ensure seconds format
    };

    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId 
        ? `${API_URL}/api/financial_entries/${editingId}`
        : `${API_URL}/api/financial_entries`;

      const res = await fetch(url, {
        method,
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Operation failed");
      }

      const resData = await res.json();

      if (!editingId) {
        await logActivity({
          userId: user?.id!,
          userEmail: user?.email!,
          activityType: "FINANCIAL_ENTRY_CREATED",
          branchId: form.branch_id,
          metadata: { entryId: resData.id, type: form.entry_type, amount: payload.cash_amount + payload.bank_amount }
        });
        toast({ title: "Record added to ledger!" });
      } else {
        toast({ title: "Entry updated successfully!" });
      }

      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    const isBranchAdmin = hasRole("branch_admin") && !hasRole("super_admin");
    setForm({
      branch_id: isBranchAdmin ? (profile?.branch_id || "") : "",
      entry_type: "Credit",
      category: "Ledger",
      cash_amount: "",
      bank_amount: "",
      description: "",
      entry_date: new Date().toISOString().split('T')[0],
      entry_time: new Date().toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5)
    });
  };

  const startEdit = (e: any) => {
    if (!isEditable(e.created_at)) {
      toast({ title: "Edit restricted", description: "Branch admins can only edit entries within 2 hours of creation.", variant: "destructive" });
      return;
    }
    setForm({
      branch_id: e.branch_id,
      entry_type: e.entry_type,
      category: e.category || "Ledger",
      cash_amount: String(e.cash_amount || 0),
      bank_amount: String(e.bank_amount || 0),
      description: e.description || "",
      entry_date: e.entry_date,
      entry_time: e.entry_time || "00:00"
    });
    setEditingId(e.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, createdAt: string) => {
    if (!isEditable(createdAt)) {
      toast({ title: "Delete restricted", description: "Branch admins can only delete entries within 2 hours of creation.", variant: "destructive" });
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL ?? '';
    const token = localStorage.getItem("ecs_token");

    // Diagnostic immediate deletion
    const originalEntries = [...entries];
    setEntries(prev => prev.filter(e => e.id !== id));

    try {
      const res = await fetch(`${API_URL}/api/financial_entries/${id}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Deletion failed");
      }

      toast({ title: "Entry deleted" });
      fetchData();
    } catch (error: any) {
      setEntries(originalEntries);
      toast({ title: "Error deleting entry", description: error.message, variant: "destructive" });
    }
  };

  const handleDownloadReport = () => {
    const headers = ["TXN ID", "Date", "Particulars", "Cash", "Bank", "Total", "Type"];
    const rows = entries.map(e => [
      e.transaction_id || `#${e.id.slice(0, 8)}`,
      new Date(e.entry_date).toLocaleDateString(),
      e.description || "â€”",
      e.cash_amount?.toLocaleString() || "0",
      e.bank_amount?.toLocaleString() || "0",
      Number(e.amount || 0).toLocaleString(),
      String(e.entry_type || "â€”").toUpperCase()
    ]);
    exportTableToPDF("Financial Ledger Report", headers, rows, "financial_report");
  };
  
  const filteredEntries = entries.filter(e => {
    const s = searchQuery.toLowerCase();
    return (
      e.transaction_id?.toLowerCase().includes(s) ||
      e.description?.toLowerCase().includes(s) ||
      e.amount?.toString().includes(s) ||
      e.cash_amount?.toString().includes(s) ||
      e.bank_amount?.toString().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <h2 className="text-2xl font-bold font-display text-foreground">Financial Ledger</h2>
        <div className="flex flex-1 max-w-md mx-4 relative">
          <History className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search by ID, particulars or amount..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring min-w-[150px]">
          <option value="all">Last 2 Months</option>
          {Array.from({ length: 12 }, (_, i) => {
            const date = new Date(new Date().getFullYear(), i, 1);
            const val = `${date.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
            return <option key={val} value={val}>{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>;
          })}
        </select>
        <div className="flex gap-2">
          <button onClick={handleDownloadReport} className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 transition-all shadow-sm">
            <FileDown className="w-4 h-4" /> Download Report
          </button>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm">
            <Plus className="w-4 h-4" /> Add Record
          </button>
        </div>
      </div>

      {/* Summary cards overhaul */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Remaining Balance</p>
          <p className={`text-xl font-bold mt-1 ${summary.net_balance >= 0 ? "text-primary" : "text-destructive"}`}>Rs. {summary.net_balance.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Total Credit</p>
          <p className="text-xl font-bold mt-1 text-green-600">Rs. {summary.total_credit.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">Total Debit</p>
          <p className="text-xl font-bold mt-1 text-destructive">Rs. {summary.total_debit.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-[10px] font-bold text-info uppercase tracking-wider">Month Activity</p>
          <p className="text-xl font-bold mt-1 text-info">{summary.month_activity} Entries</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            Cash vs Bank
            <Wallet className="w-3 h-3" />
          </p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[10px] font-medium"><span className="text-muted-foreground">Cash:</span> <span>Rs. {summary.total_cash.toLocaleString()}</span></div>
            <div className="flex justify-between text-[10px] font-medium"><span className="text-muted-foreground">Bank:</span> <span>Rs. {summary.total_bank.toLocaleString()}</span></div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl bg-card border border-border p-6 shadow-elevated">
            <h3 className="text-xl font-bold font-display text-card-foreground mb-4">
              {editingId ? "Edit Ledger Record" : "Add Record to Ledger"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Date *</label><input type="date" required value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Time *</label><input type="time" required value={form.entry_time} onChange={(e) => setForm({ ...form, entry_time: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Branch *</label>
                  <select required value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" disabled={hasRole("branch_admin") && !hasRole("super_admin")}>
                    <option value="">Select Branch</option>
                    {branches
                      .filter(b => !hasRole("branch_admin") || hasRole("super_admin") || b.id === profile?.branch_id)
                      .map((b) => <option key={b.id} value={b.id}>{b.name}</option>)
                    }
                  </select>
                </div>
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Transaction Type *</label>
                  <select required value={form.entry_type} onChange={(e) => setForm({ ...form, entry_type: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="Credit">Credit (Income / Profit)</option>
                    <option value="Debit">Debit (Expense / Payment)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Cash Amount</label><input type="number" step="0.01" value={form.cash_amount} onChange={(e) => setForm({ ...form, cash_amount: e.target.value })} placeholder="0.00" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Bank Amount</label><input type="number" step="0.01" value={form.bank_amount} onChange={(e) => setForm({ ...form, bank_amount: e.target.value })} placeholder="0.00" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg border border-dashed border-border flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground uppercase">Total Record Amount:</span>
                <span className="text-lg font-black text-primary">Rs. {((parseFloat(form.cash_amount) || 0) + (parseFloat(form.bank_amount) || 0)).toLocaleString()}</span>
              </div>
              <div><label className="text-sm font-medium text-card-foreground mb-1 block">Particulars / Details *</label><textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="e.g. Sales Revenue, Office Rent, Utility Bill" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground hover:shadow-lg transition-all active:scale-95">{editingId ? "Update Ledger" : "Add Record"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-border py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No financial entries yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="text-left px-4 py-3">TXN ID</th>
              <th className="text-left px-4 py-3">Date / Time</th>
              <th className="text-left px-4 py-3">Particulars</th>
              <th className="text-left px-4 py-3">Cash</th>
              <th className="text-left px-4 py-3">Bank</th>
              <th className="text-left px-4 py-3">Total Amount</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Running Bal</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {filteredEntries.map((e) => (
                <tr key={e.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{e.transaction_id || `#${e.id.slice(0, 8)}`}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">{new Date(e.entry_date).toLocaleDateString('en-GB')}</span>
                      <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{e.entry_time?.slice(0, 5) || "00:00"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-semibold text-foreground line-clamp-1">{e.description}</div>
                    <div className="text-[10px] text-primary/70">{e.branches?.name}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">Rs. {(e.cash_amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">Rs. {(e.bank_amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground">Rs. {Number(e.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${e.entry_type === "Credit" || e.entry_type === "income" ? "bg-green-100 text-green-700" : "bg-destructive/10 text-destructive"}`}>
                      {e.entry_type === "Credit" || e.entry_type === "income" ? "Credit" : "Debit"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-primary">Rs. {(e.running_balance || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {isEditable(e.created_at) ? (
                        <>
                          <button onClick={() => startEdit(e)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(e.id, e.created_at)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="p-1.5 text-muted-foreground/30" title="Locked (2+ hours old)">
                          <Lock className="w-4 h-4" />
                        </div>
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

export default Financial;

