import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowRightLeft, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  History, 
  Send, 
  Building2, 
  Banknote,
  LayoutDashboard,
  ShieldCheck,
  Calculator,
  Edit2,
  Trash2,
  FileDown,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generatePaymentsReport } from "@/utils/pdfGenerator";

const Payments = () => {
  const { user, hasRole, profile, isDeveloper } = useAuth();
  const { toast } = useToast();
  const isHO = hasRole("super_admin") || isDeveloper;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem("ecs_token");

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [hoBalance, setHoBalance] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  const [transferForm, setTransferForm] = useState({
    from_branch_id: "",
    to_branch_id: "",
    amount: "",
    description: "",
    transfer_type: "Branch-to-HO" as "Branch-to-HO" | "HO-to-Branch" | "Branch-to-Branch"
  });

  const [editingHistory, setEditingHistory] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", description: "" });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [settlingProfit, setSettlingProfit] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`${API_URL}/api/payments/stats`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      } else {
        const errData = await statsRes.json();
        toast({ title: "Stats Error", description: errData.error || "Failed to fetch stats", variant: "destructive" });
      }

      // 2. Fetch History
      const historyRes = await fetch(`${API_URL}/api/payments/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(Array.isArray(historyData) ? historyData : []);
      } else {
         const errData = await historyRes.json();
         toast({ title: "History Error", description: errData.error || "Failed to fetch history", variant: "destructive" });
      }

      // 3. Fetch HO Balance if applicable
      if (isHO) {
        const balanceRes = await fetch(`${API_URL}/api/payments/head-office-balance`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          setHoBalance(balanceData.balance || 0);
        }
      }

      // 4. Fetch branches for transfer dropdown (Required for ALL to see recipients)
      const branchRes = await fetch(`${API_URL}/api/branches`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        setBranches(Array.isArray(branchData) ? branchData : []);
      }
    } catch (err: any) {
      toast({ title: "Fetch Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.amount || parseFloat(transferForm.amount) <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        ...transferForm,
        from_branch_id: transferForm.transfer_type === "HO-to-Branch" ? null : (transferForm.from_branch_id || profile?.branch_id),
        to_branch_id: transferForm.transfer_type === "Branch-to-HO" ? null : transferForm.to_branch_id,
        amount: parseFloat(transferForm.amount)
      };

      const res = await fetch(`${API_URL}/api/payments/transfer`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Transfer failed");
      }

      toast({ title: "Transfer Successful!" });
      setShowTransferModal(false);
      setTransferForm({ from_branch_id: "", to_branch_id: "", amount: "", description: "", transfer_type: "Branch-to-HO" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this payment record? This will also remove associated ledger entries in branches.")) return;
    try {
      const res = await fetch(`${API_URL}/api/payments/history/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Delete failed");
      }
      toast({ title: "Record Deleted" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEditHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEdit(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/history/${editingHistory.id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Update failed");
      }
      toast({ title: "Record Updated" });
      setEditingHistory(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleSettleProfit = async (branchId: string, branchName: string) => {
    if (!window.confirm(`Are you sure you want to settle all current net profits from ${branchName} to Head Office?`)) return;
    
    setSettlingProfit(branchId);
    try {
      const res = await fetch(`${API_URL}/api/payments/settle-profit`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ branch_id: branchId })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Settlement failed");
      }
      
      const data = await res.json();
      toast({ 
        title: "Profit Settled", 
        description: `Successfully pulled Rs. ${data.amount.toLocaleString()} from ${branchName}.` 
      });
      fetchData();
    } catch (err: any) {
      toast({ title: "Settlement Error", description: err.message, variant: "destructive" });
    } finally {
      setSettlingProfit(null);
    }
  };

  const openEditModal = (h: any) => {
    setEditingHistory(h);
    setEditForm({ amount: h.amount.toString(), description: h.description || "" });
  };

  const filteredHistory = history.filter(h => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = 
      (h.description || "").toLowerCase().includes(s) ||
      (h.from_branch_name || "").toLowerCase().includes(s) ||
      (h.to_branch_name || "").toLowerCase().includes(s) ||
      (h.transfer_type || "").toLowerCase().includes(s);
    
    if (activeFilter === "All") return matchesSearch;
    if (activeFilter === "Revenue") return matchesSearch && (h.transfer_type === "Revenue" || h.transfer_type === "Ledger Credit");
    if (activeFilter === "Expense") return matchesSearch && (h.transfer_type === "Expense" || h.transfer_type === "Advance");
    if (activeFilter === "Salaries") return matchesSearch && h.transfer_type === "Salary";
    if (activeFilter === "Transfers") return matchesSearch && (h.transfer_type === "Transfer" || (h.transfer_type || "").includes("HO-to-Branch") || (h.transfer_type || "").includes("Branch-to-HO") || (h.transfer_type || "").includes("Branch-to-Branch"));
    if (activeFilter === "Settlements") return matchesSearch && h.transfer_type === "Profit-Settlement";
    
    return matchesSearch;
  });

  if (loading && !stats) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  // Ensure myStats is always a safe object
  const myStats = isHO ? (stats?.network || {}) : (stats || {});

  return (
    <div className="space-y-6 pb-20">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            Payments Hub
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">Manage branch profits, entity transfers, and head-office settlements.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {isHO ? (
             <button 
                onClick={() => {
                  setTransferForm({ ...transferForm, transfer_type: "HO-to-Branch", to_branch_id: "" });
                  setShowTransferModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-md transition-all active:scale-95"
              >
                <Send className="w-4 h-4" /> Transfer Funds
              </button>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setTransferForm({ ...transferForm, transfer_type: "Branch-to-HO", to_branch_id: "" });
                  setShowTransferModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-md transition-all active:scale-95"
              >
                <ArrowRightLeft className="w-4 h-4" /> Transfer to HO
              </button>
              <button 
                onClick={() => {
                  setTransferForm({ ...transferForm, transfer_type: "Branch-to-Branch", to_branch_id: "" });
                  setShowTransferModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 shadow-md transition-all active:scale-95"
              >
                <Building2 className="w-4 h-4" /> Pay Other Branch
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Real-time Revenue</span>
          </div>
          <p className="text-2xl font-bold text-foreground">Rs. {myStats?.total_revenue?.toLocaleString() || "0"}</p>
          <p className="text-xs text-muted-foreground mt-1">From Paid Invoices & Credits</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold text-foreground">Rs. {myStats?.total_expenses?.toLocaleString() || "0"}</p>
          <p className="text-xs text-muted-foreground mt-1">Ledger Debit Entries</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Calculator className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Calculated Net Profit</span>
          </div>
          <p className="text-2xl font-black text-primary">Rs. {myStats?.net_profit?.toLocaleString() || "0"}</p>
          <div className="w-full bg-primary/10 h-1.5 mt-2 rounded-full overflow-hidden">
             <div className="bg-primary h-full" style={{ width: '65%' }}></div>
          </div>
        </div>

        {isHO ? (
          <div className="group relative overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-indigo-600 text-white">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600/70">Head Office Balance</span>
            </div>
            <p className="text-2xl font-black text-indigo-700">Rs. {hoBalance.toLocaleString()}</p>
            <p className="text-xs text-indigo-600/60 mt-1 italic flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Fully Liquid Asset
            </p>
          </div>
        ) : (
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm opacity-60">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Branch</span>
                </div>
                <p className="text-xl font-bold text-foreground truncate">Authorized Branch Entity</p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-tighter font-mono">ID: {profile?.branch_id ? profile.branch_id.slice(0, 8) : "N/A"}</p>
            </div>
        )}
      </div>

      {/* Branch List for Head Office */}
      {isHO && stats?.branches?.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-center justify-between">
            <h3 className="font-bold text-foreground flex items-center gap-2 uppercase text-xs tracking-widest">
              <Building2 className="w-4 h-4" />
              Branch-wise Performance
            </h3>
          </div>
          <div className="overflow-x-auto text-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Branch Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Revenue</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Expenses</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Net Profit</th>
                  <th className="px-6 py-3 text-right font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.branches.map((b: any) => (
                  <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">{b.name}</td>
                    <td className="px-6 py-4 text-green-600 font-medium">Rs. {b.total_revenue?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-destructive font-medium">Rs. {b.total_expenses?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${b.net_profit >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        Rs. {b.net_profit?.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         disabled={b.net_profit <= 0 || settlingProfit === b.id}
                         onClick={() => handleSettleProfit(b.id, b.name)}
                         className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-[10px] font-bold text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                       >
                         {settlingProfit === b.id ? "Settling..." : <><Banknote className="w-3 h-3" /> Settle Profit</>}
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/30 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-2 uppercase text-xs tracking-widest">
              <History className="w-4 h-4" />
              Settlement & Transfer History
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 animate-pulse">Live transaction bridge active</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <div className="relative">
                <input 
                  type="text"
                  placeholder="Search history..."
                  className="bg-background border border-border px-8 py-1.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <History className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
             </div>

             <div className="flex items-center gap-1 bg-background border border-border p-1 rounded-lg">
                {["All", "Revenue", "Expense", "Salaries", "Transfers", "Settlements"].map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${activeFilter === f ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    {f}
                  </button>
                ))}
             </div>

            <button 
              onClick={() => generatePaymentsReport(filteredHistory, isHO ? "Consolidated Network Report" : `${profile?.full_name}'s Branch Report`)}
              className="inline-flex items-center gap-2 text-[10px] font-bold bg-background border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors ml-auto"
            >
              <FileDown className="w-3 h-3" /> PDF Export
            </button>
          </div>
        </div>
        
        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground italic">No transfer records found matching your filters.</div>
        ) : (
          <div className="overflow-x-auto text-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground uppercase text-[10px]">Source &rarr; Destination</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground uppercase text-[10px]">Category</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground uppercase text-[10px]">Description</th>
                  <th className="px-6 py-3 text-right font-semibold text-muted-foreground uppercase text-[10px]">Amount</th>
                  <th className="px-6 py-3 text-right font-semibold text-muted-foreground uppercase text-[10px]">Date</th>
                  {isHO && <th className="px-6 py-3 text-right font-semibold text-muted-foreground uppercase text-[10px]">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredHistory.map((h: any) => {
                  const isIncoming = h.to_branch_id === profile?.branch_id || (h.transfer_type === 'Revenue') || (h.transfer_type === 'Ledger Credit') || (isHO && h.to_branch_id === null && h.from_branch_id !== null);
                  return (
                    <tr key={h.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="flex flex-col">
                             <span className="font-bold text-foreground text-xs">{h.from_branch_name || "Head Office"}</span>
                             <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-tighter">SENDER</span>
                           </div>
                           <ArrowRightLeft className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                           <div className="flex flex-col">
                             <span className="font-bold text-foreground text-xs">{h.to_branch_name || "Head Office"}</span>
                             <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-tighter">RECEIVER</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          h.transfer_type === 'Salary' ? "bg-indigo-100 text-indigo-700" :
                          h.transfer_type === 'Revenue' ? "bg-emerald-100 text-emerald-700" :
                          h.transfer_type === 'Expense' ? "bg-red-100 text-red-700" :
                          h.transfer_type === 'Advance' ? "bg-rose-100 text-rose-700" :
                          h.transfer_type === 'Transfer' ? "bg-amber-100 text-amber-700" :
                          h.transfer_type === 'Ledger Credit' ? "bg-blue-100 text-blue-700" :
                          isIncoming ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {h.transfer_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground max-w-xs truncate text-xs" title={h.description}>
                        {h.description}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${isIncoming ? "text-green-600" : "text-destructive"}`}>
                        {isIncoming ? "+" : "-"} Rs. {h.amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground text-xs">
                        {new Date(h.created_at).toLocaleDateString()}
                      </td>
                      {isHO && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openEditModal(h)}
                              className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                              title="Edit Record"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteHistory(h.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-card-foreground">Execute Fund Transfer</h3>
                <div className="p-2 bg-primary/10 rounded-full"><Send className="w-5 h-5 text-primary" /></div>
            </div>
            
            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="space-y-4 p-4 bg-muted/40 rounded-xl border border-border/50">
                {isHO && (
                   <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Transfer Category</label>
                    <select 
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      value={transferForm.transfer_type}
                      onChange={(e: any) => setTransferForm({...transferForm, transfer_type: e.target.value, from_branch_id: "", to_branch_id: ""})}
                    >
                       <option value="HO-to-Branch">Head Office to Branch</option>
                       <option value="Branch-to-HO">Branch to Head Office</option>
                       <option value="Branch-to-Branch">Branch to Branch</option>
                    </select>
                   </div>
                )}

                {/* Source Selection - ONLY if Super Admin doing Branch transfers or if Branch Admin doing Branch-to-Branch */}
                {(isHO && transferForm.transfer_type !== "HO-to-Branch") && (
                   <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Source Branch</label>
                      <select 
                        required 
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        value={transferForm.from_branch_id} 
                        onChange={(e) => setTransferForm({...transferForm, from_branch_id: e.target.value, to_branch_id: ""})}
                      >
                        <option value="">Select Sending Branch</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                   </div>
                )}

                <div>
                   <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Transfer Destination</label>
                   <select 
                     required 
                     className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                     value={transferForm.to_branch_id} 
                     onChange={(e) => setTransferForm({...transferForm, to_branch_id: e.target.value})}
                   >
                     <option value="">Select Recipient</option>
                     {transferForm.transfer_type === "Branch-to-HO" ? (
                        <option value="HO">Head Office (Super Admin)</option>
                     ) : (
                       branches
                        .filter(b => {
                          const currentSender = transferForm.from_branch_id || (isHO ? "" : profile?.branch_id);
                          return b.id !== currentSender;
                        })
                        .map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))
                     )}
                   </select>
                </div>

                <div>
                   <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Amount (Rs.)</label>
                   <input 
                     type="number" 
                     step="0.01" 
                     required 
                     placeholder="0.00"
                     className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                     value={transferForm.amount} 
                     onChange={(e) => setTransferForm({...transferForm, amount: e.target.value})}
                   />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Transfer Details / Notes</label>
                <textarea 
                  required 
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none" 
                  rows={3}
                  placeholder="Reason for transfer, profit settlement, etc."
                  value={transferForm.description} 
                  onChange={(e) => setTransferForm({...transferForm, description: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:shadow-lg transition-all active:scale-95">
                  Confirm Transfer
                </button>
                <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Settlement Modal */}
      {editingHistory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-card-foreground">Update Settlement</h3>
                <button onClick={() => setEditingHistory(null)} className="p-2 hover:bg-muted rounded-full transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            
            <form onSubmit={handleEditHistory} className="space-y-4">
              <div>
                 <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Amount (Rs.)</label>
                 <input 
                   type="number" 
                   step="0.01" 
                   required 
                   className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                   value={editForm.amount} 
                   onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                 />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Description</label>
                <textarea 
                  required 
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none" 
                  rows={3}
                  value={editForm.description} 
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={submittingEdit} className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:shadow-lg transition-all active:scale-95 disabled:opacity-50">
                  {submittingEdit ? "Updating..." : "Save Changes"}
                </button>
                <button type="button" onClick={() => setEditingHistory(null)} className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
