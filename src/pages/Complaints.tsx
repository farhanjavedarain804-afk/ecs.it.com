import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";
import { Plus, Search, Edit2, Clock, CheckCircle2, AlertTriangle, XCircle, FileDown, Paperclip, ImageIcon, Filter, FileText, Upload, Trash2, Lock } from "lucide-react";
import { generatePDF, exportTableToPDF } from "@/utils/pdfGenerator";
import { logActivity } from "@/utils/logger";

const statusColors: Record<string, string> = {
  registered: "bg-muted text-muted-foreground",
  assigned: "bg-primary/10 text-primary",
  in_progress: "bg-accent/10 text-accent-foreground",
  solved: "bg-emerald-100 text-emerald-700",
  invoice_generated: "bg-blue-100 text-blue-700",
  dismissed: "bg-destructive/10 text-destructive",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/10 text-accent-foreground",
  high: "bg-orange-100 text-orange-700",
  emergency: "bg-destructive/10 text-destructive",
};

const Complaints = () => {
  const { user, hasRole, profile, session, isDeveloper } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterStatus, setFilterStatus] = useState("");
  const [activeSection, setActiveSection] = useState<"pending" | "overdue" | "critical" | "solved" | "dismissed">("pending");
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Customer type: new or old
  const [customerType, setCustomerType] = useState<"old" | "new">("old");
  const [customerSearch, setCustomerSearch] = useState("");

  // New customer fields
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", address: "", city: "", branch_id: "" });

  // Complaint form
  const [form, setForm] = useState({
    customer_id: "",
    branch_id: "",
    complaint_type: "repair" as "installation" | "repair" | "maintenance",
    priority: "medium" as "low" | "medium" | "high" | "emergency",
    description: "",
    notes: "",
    warranty_type: "non_warranty",
    assigned_to: "",
    assigned_helper: "",
    attachments: [""] as string[],
  });

  const [solvingComplaint, setSolvingComplaint] = useState<any>(null);
  const [solveForm, setSolveForm] = useState({ notes: "", attachments: [] as string[] });
  const [viewComplaint, setViewComplaint] = useState<any>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File) => {
    const API_URL = import.meta.env.VITE_API_URL ?? '';
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ecs_token')}` },
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload failed');
    }

    const data = await res.json();
    return `${API_URL}/uploads/${data.filename}`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploading(true);
      try {
        const currentAtts = Array.isArray(form.attachments) ? form.attachments : [];
        const newAttachments = [...currentAtts];
        const cleaned = newAttachments.filter(a => typeof a === 'string' && a.trim() !== "");

        for (const file of Array.from(files)) {
          const publicUrl = await uploadFile(file);
          cleaned.push(`${file.name}|${publicUrl}`);
        }

        setForm({ ...form, attachments: cleaned });
        toast({ title: "Files uploaded successfully" });
      } catch (error: any) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      } finally {
        setUploading(false);
        if (e.target) e.target.value = "";
      }
    }
  };

  const fetchAll = async () => {
    const isBranchAdmin = hasRole("branch_admin") && !hasRole("super_admin");
    const branchId = profile?.branch_id;
    const API_URL = import.meta.env.VITE_API_URL ?? '';

    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('ecs_token')}` };

      let complaintsUrl = `${API_URL}/api/complaints${isBranchAdmin && branchId ? `?branch_id=${branchId}` : '?'}`;
      if (filterMonth !== "all") {
        const [y, m] = filterMonth.split("-");
        complaintsUrl += `&month=${m}&year=${y}`;
      }
      
      const [compRes, custRes, brRes, staffRes] = await Promise.all([
        fetch(complaintsUrl, { headers }).then(r => r.json()),
        fetch(`${API_URL}/api/customers${isBranchAdmin && branchId ? `?branch_id=${branchId}` : ''}`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/api/branches`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/api/staff?status=active${isBranchAdmin && branchId ? `&branch_id=${branchId}` : ''}`, { headers }).then(r => r.json())
      ]);

      setComplaints(Array.isArray(compRes) ? compRes : []);
      setCustomers(Array.isArray(custRes) ? custRes : []);
      setBranches(Array.isArray(brRes) ? brRes : []);
      setTechnicians(Array.isArray(staffRes) ? staffRes : []);

      if (isBranchAdmin && branchId) {
        setForm(prev => ({ ...prev, branch_id: branchId }));
        setNewCustomer(prev => ({ ...prev, branch_id: branchId }));
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
      toast({ title: "Failed to fetch data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [filterMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let customerId = form.customer_id;

    // If new customer, check for existing by phone + branch first
    if (customerType === "new" && !editingId) {
      if (!newCustomer.name || !newCustomer.phone) {
        toast({ title: "Customer name and phone required", variant: "destructive" });
        return;
      }

      // 1. Check for existing customer in the same branch with matching phone
      const API_URL = import.meta.env.VITE_API_URL ?? '';
      const token = localStorage.getItem('ecs_token');
      const checkRes = await fetch(`${API_URL}/api/customers?search=${newCustomer.phone}&branch_id=${form.branch_id || newCustomer.branch_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const checkData = await checkRes.json();
      const existingCust = Array.isArray(checkData) ? checkData.find((c: any) => c.phone === newCustomer.phone) : null;

      // Only reuse if both phone AND name match (case-insensitive)
      if (existingCust && existingCust.name?.toLowerCase().trim() === newCustomer.name?.toLowerCase().trim()) {
        // Automatically reuse existing customer (same person)
        customerId = existingCust.id;
        toast({ title: "Existing customer found", description: `Linked to ${existingCust.name}` });
      } else {
        // 2. Create new customer (different name or new phone)
        try {
          const API_URL = import.meta.env.VITE_API_URL ?? '';
          const res = await fetch(`${API_URL}/api/customers`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('ecs_token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: newCustomer.name,
              phone: newCustomer.phone,
              email: newCustomer.email || null,
              address: newCustomer.address,
              city: branches.find(b => b.id === (form.branch_id || newCustomer.branch_id))?.city || "",
              branch_id: form.branch_id || newCustomer.branch_id || null,
            })
          });

          if (!res.ok) {
            const err = await res.json();
            toast({ title: "Customer Error", description: err.error || "Failed to create customer", variant: "destructive" });
            return;
          }

          const newCust = await res.json();
          customerId = newCust.id;
        } catch (err: any) {
          toast({ title: "Connection Error", description: err.message, variant: "destructive" });
          return;
        }
      }
    }

    if (!customerId || !form.branch_id || !form.description) {
      toast({ title: "Please fill required fields (customer, branch, description)", variant: "destructive" });
      return;
    }

    const payload = {
      customer_id: customerId,
      branch_id: form.branch_id,
      complaint_type: form.complaint_type,
      priority: form.priority,
      description: form.description,
      notes: form.notes || null,
      warranty_type: form.warranty_type,
      assigned_to: form.assigned_to || null,
      assigned_helper: form.assigned_helper || null,
      attachments: form.attachments.filter(a => a.trim() !== ""),
    };

    const API_URL = import.meta.env.VITE_API_URL ?? '';
    const headers = {
      'Authorization': `Bearer ${localStorage.getItem('ecs_token')}`,
      'Content-Type': 'application/json'
    };

    if (editingId) {
      const res = await fetch(`${API_URL}/api/complaints/${editingId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) { const err = await res.json(); toast({ title: err.error || "Update failed", variant: "destructive" }); return; }

      toast({ title: "Complaint updated" });
      const editedComplaint = complaints.find(c => c.id === editingId);
      if (user && editedComplaint) {
        await logActivity({
          userId: user.id,
          userEmail: user.email,
          activityType: "COMPLAINT_UPDATED",
          branchId: editedComplaint.branch_id,
          metadata: { complaintId: editingId, complaintNumber: editedComplaint.complaint_number, changes: payload }
        });
      }
    } else {
      const res = await fetch(`${API_URL}/api/complaints`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) { const err = await res.json(); toast({ title: err.error || "Registration failed", variant: "destructive" }); return; }

      const newComp = await res.json();
      toast({
        title: "Complaint registered!",
        description: `ID: ${newComp.complaint_number || 'N/A'}`
      });
    }

    resetForm();
    fetchAll();
  };

  const handleSolve = async () => {
    if (!solvingComplaint) return;

    const existingAtts = Array.isArray(solvingComplaint.attachments) ? solvingComplaint.attachments :
      (typeof solvingComplaint.attachments === 'string' && solvingComplaint.attachments.startsWith('[') ? JSON.parse(solvingComplaint.attachments) : []);

    const API_URL = import.meta.env.VITE_API_URL ?? '';
    const res = await fetch(`${API_URL}/api/complaints/${solvingComplaint.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('ecs_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: "solved",
        resolved_at: new Date().toISOString(),
        notes: solveForm.notes || solvingComplaint.notes,
        attachments: [...existingAtts, ...solveForm.attachments],
      })
    });

    if (!res.ok) {
      const err = await res.json();
      toast({ title: err.error || "Solve failed", variant: "destructive" });
      return;
    }

    if (user) {
      await logActivity({
        userId: user.id,
        userEmail: user.email,
        activityType: "COMPLAINT_SOLVED",
        branchId: solvingComplaint.branch_id,
        metadata: { complaintId: solvingComplaint.id, complaintNumber: solvingComplaint.complaint_number }
      });
    }

    toast({ title: "Complaint marked as solved and locked!" });
    setSolvingComplaint(null);
    setSolveForm({ notes: "", attachments: [] as string[] });
    fetchAll();
  };

  const resetForm = () => {
    const isBranchAdmin = hasRole("branch_admin") && !hasRole("super_admin");
    const branchId = profile?.branch_id;

    setShowForm(false);
    setEditingId(null);
    setCustomerType("old");
    setCustomerSearch("");
    setNewCustomer({
      name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      branch_id: isBranchAdmin ? (branchId || "") : ""
    });
    setForm({
      customer_id: "",
      branch_id: isBranchAdmin ? (branchId || "") : "",
      complaint_type: "repair",
      priority: "medium",
      description: "",
      notes: "",
      warranty_type: "non_warranty",
      assigned_to: "",
      assigned_helper: "",
      attachments: [""]
    });
  };

  const isEditable = (c: any) => {
    const isSuperOrDev = isDeveloper || hasRole("super_admin");
    // Super admin and developers can always edit
    if (isSuperOrDev) return true;
    // Only branch_admin can edit (view_only cannot)
    if (!hasRole("branch_admin")) return false;
    if (!c || !c.created_at) return true;

    // Locked ONLY if the complaint is solved
    if (c.status === "solved") return false;

    // All other statuses (registered, assigned, in_progress, dismissed) are editable
    return true;
  };

  const startEdit = (c: any) => {
    if (!isEditable(c)) {
      toast({ title: "Edit restricted", description: "Only super admins can edit solved complaints.", variant: "destructive" });
      return;
    }
    setCustomerType("old");
    setForm({
      customer_id: c.customer_id || "",
      branch_id: c.branch_id || "",
      complaint_type: c.complaint_type,
      priority: c.priority,
      description: c.description,
      notes: c.notes || "",
      warranty_type: c.warranty_type || "non_warranty",
      assigned_to: c.assigned_to || "",
      assigned_helper: c.assigned_helper || "",
      attachments: c.attachments && c.attachments.length > 0 ? c.attachments : [""],
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const updateStatus = async (id: string, status: string, complaint: any) => {
    if (!isEditable(complaint)) {
      toast({ title: "Update restricted", description: "Only super admins can update solved complaints.", variant: "destructive" });
      return;
    }

    // "Solve" action triggers the confirm-solve modal
    if (status === 'solved') {
      setSolvingComplaint(complaint);
      return;
    }

    // All other status updates go through the backend API (MySQL)
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? '';
      const res = await fetch(`${API_URL}/api/complaints/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ecs_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Status update failed", description: err.error || "Server error", variant: "destructive" });
        return;
      }

      fetchAll();
      toast({ title: `Status updated to ${status.replace(/_/g, " ")}` });
    } catch (err: any) {
      toast({ title: "Connection error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string, complaint: any) => {
    if (!isEditable(complaint)) {
      toast({ title: "Delete restricted", description: "Only super admins can delete solved complaints.", variant: "destructive" });
      return;
    }

    // Optimistic Update: remove from UI immediately
    const originalComplaints = [...complaints];
    setComplaints(prev => prev.filter(c => c.id !== id));

    try {
      const oldC = complaints.find(c => c.id === id);

      // Attempt delete with exact count
      const API_URL = import.meta.env.VITE_API_URL ?? '';
      const res = await fetch(`${API_URL}/api/complaints/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecs_token')}` },
      });

      if (!res.ok) {
        setComplaints(originalComplaints); // Rollback
        const err = await res.json();
        toast({ title: "Delete Error", description: err.error || "Server error", variant: "destructive" });
        return;
      }

      if (user && oldC) {
        await logActivity({
          userId: user.id,
          userEmail: user.email,
          activityType: "COMPLAINT_DELETED",
          branchId: oldC.branch_id,
          metadata: { complaintId: id, complaintNumber: oldC.complaint_number }
        });
      }

      toast({ title: "Complaint deleted successfully" });
      fetchAll(); // sync with server
    } catch (error: any) {
      setComplaints(originalComplaints); // Rollback
      toast({ title: "Error deleting complaint", description: error.message, variant: "destructive" });
    }
  };

  // Sections filtering logic
  const now = new Date();
  const OVERDUE_HOURS = 24;

  const filtered = complaints.filter(c => {
    const matchSearch = !search || c.complaint_number?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase()) || c.customers?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || c.status === filterStatus;
    if (!matchSearch || !matchStatus) return false;

    if (activeSection === "solved") return ["solved", "invoice_generated"].includes(c.status);
    if (activeSection === "dismissed") return c.status === "dismissed";

    const created = new Date(c.created_at);
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    const isResolvedOrDismissed = ["solved", "invoice_generated", "dismissed"].includes(c.status);

    if (activeSection === "critical") {
      return !isResolvedOrDismissed && diffHours > 48;
    }

    if (activeSection === "overdue") {
      return !isResolvedOrDismissed && diffHours > 24 && diffHours <= 48;
    }

    // Default: Pending (Everything else < 24h)
    return !isResolvedOrDismissed && diffHours <= 24;
  });

  // Customer search for old customer selection
  const filteredCustomers = customers.filter(c => {
    const isBranchAdmin = hasRole("branch_admin") && !hasRole("super_admin");
    const matchesBranch = !isBranchAdmin || c.branch_id === profile?.branch_id;
    const matchesSearch = !customerSearch || 
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.customer_id?.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.phone?.includes(customerSearch);
    return matchesBranch && matchesSearch;
  });

  const handleDownloadReport = () => {
    const headers = ["ID", "Customer", "Branch", "Type", "Status", "Date"];
    const rows = filtered.map(c => [
      c.complaint_number || "—",
      c.customers?.name || "—",
      c.branches?.name || "—",
      c.complaint_type || "—",
      c.status || "—",
      new Date(c.created_at).toLocaleDateString()
    ]);
    exportTableToPDF("Complaints Report", headers, rows, "complaints_report");
  };

  const inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";
  const labelClass = "text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block ml-1";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Service Complaints</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and track customer service registrations.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadReport} className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted shadow-sm transition-all active:scale-95">
            <FileDown className="w-4 h-4" /> Download Report
          </button>
          {hasRole("branch_admin") && (
            <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95">
              <Plus className="w-4 h-4" /> Register Complaint
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><FileText className="w-4 h-4 text-primary" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</p><p className="text-2xl font-bold text-foreground mt-0.5">{complaints.length}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/10"><Clock className="w-4 h-4 text-warning" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending</p><p className="text-2xl font-bold text-foreground mt-0.5">{complaints.filter(c => !['completed', 'closed', 'dismissed', 'invoice_generated', 'solved'].includes(c.status)).length}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="w-4 h-4 text-success" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resolved</p><p className="text-2xl font-bold text-foreground mt-0.5">{complaints.filter(c => ['completed', 'solved', 'invoice_generated', 'closed'].includes(c.status)).length}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-4 h-4 text-destructive" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dismissed</p><p className="text-2xl font-bold text-foreground mt-0.5">{complaints.filter(c => c.status === 'dismissed').length}</p></div>
        </div>
      </div>

      {/* Modern Status Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-2xl w-fit">
        {[
          { key: "pending", label: "Pending", icon: Clock },
          { key: "overdue", label: "Overdue", icon: Clock, color: "text-orange-600" },
          { key: "critical", label: "Critical", icon: AlertTriangle, color: "text-red-600" },
          { key: "solved", label: "Solved", icon: CheckCircle2 },
          { key: "dismissed", label: "Dismissed", icon: XCircle },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveSection(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeSection === tab.key ? "bg-background text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"} ${(tab.key === 'critical' || tab.key === 'overdue') && activeSection === tab.key ? tab.color : ''}`}>
            <tab.icon className={`w-4 h-4 ${tab.key === 'critical' || tab.key === 'overdue' ? tab.color : ''}`} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search complaints, customers..." className="w-full rounded-xl border border-input bg-background pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring min-w-[150px]">
              <option value="">All Status</option>
              <option value="registered">Registered</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="solved">Solved</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring min-w-[150px]">
              <option value="all">Last 2 Months</option>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date(new Date().getFullYear(), i, 1);
                const val = `${date.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
                return <option key={val} value={val}>{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>;
              })}
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/30 border-b border-border">
                <th className="text-left font-bold text-muted-foreground px-4 py-4 uppercase tracking-wider text-[10px]">ID / Customer</th>
                <th className="text-left font-bold text-muted-foreground px-4 py-4 uppercase tracking-wider text-[10px]">Branch</th>
                <th className="text-left font-bold text-muted-foreground px-4 py-4 uppercase tracking-wider text-[10px]">Type / Warranty</th>
                <th className="text-left font-bold text-muted-foreground px-4 py-4 uppercase tracking-wider text-[10px]">Status</th>
                <th className="text-left font-bold text-muted-foreground px-4 py-4 uppercase tracking-wider text-[10px]">Date</th>
                <th className="text-right font-bold text-muted-foreground px-4 py-4 uppercase tracking-wider text-[10px]">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={6} className="py-20 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-20 text-center text-muted-foreground font-medium">No complaints found in this section.</td></tr>
                ) : filtered.map((c: any) => {
                  const hoursElapsed = (now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60);
                  const isResolved = ["solved", "invoice_generated", "dismissed"].includes(c.status);
                  const isCritical = hoursElapsed > 48 && !isResolved;
                  const isOverdue = hoursElapsed > 24 && hoursElapsed <= 48 && !isResolved;

                  return (
                    <tr key={c.id} className={`hover:bg-muted/20 transition-colors ${isCritical ? "bg-red-50/50" : isOverdue ? "bg-orange-50/50" : ""}`}>
                      <td className="px-4 py-4">
                        <div className={`font-bold ${isCritical ? "text-red-600" : isOverdue ? "text-orange-600" : "text-foreground"}`}>{c.complaint_number}</div>
                        <div className="text-[10px] font-mono text-primary/70">{c.verification_id || '—'}</div>
                        <div className="text-xs text-muted-foreground">{c.customers?.name || "—"}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{c.branches?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="capitalize font-medium">{c.complaint_type}</div>
                        <div className={`text-[10px] font-bold uppercase ${c.warranty_type === "warranty" ? "text-green-600" : "text-muted-foreground"}`}>{c.warranty_type.replace('_', '-')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select value={c.status} onChange={(e) => updateStatus(c.id, e.target.value, c)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border-0 cursor-pointer shadow-sm ${statusColors[c.status] || ""}`}
                          disabled={!isEditable(c)}>
                          {["registered", "assigned", "in_progress", "solved", "invoice_generated", "dismissed"].map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right flex justify-end gap-2">
                        <button onClick={() => setViewComplaint(c)} className="p-2 rounded-lg hover:bg-info/10 text-info transition-colors" title="View Details">
                          <Search className="w-4 h-4" />
                        </button>
                        {isEditable(c) ? (
                          <>
                            <button onClick={() => startEdit(c)} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(c.id, c)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="p-2 text-muted-foreground/30" title="Locked (Solved)">
                            <Lock className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Stats Sidebar */}
        <div className="space-y-4">
          <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-4">Live Overview</h4>
            <div className="space-y-4">
              {[
                { label: "Active Pending", count: complaints.filter(c => !["completed", "closed", "dismissed"].includes(c.status)).length, color: "text-primary" },
                {
                  label: "Overdue (24-48h)", count: complaints.filter(c => {
                    if (["solved", "dismissed", "invoice_generated"].includes(c.status)) return false;
                    const hrs = (now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60);
                    return hrs > 24 && hrs <= 48;
                  }).length, color: "text-orange-600"
                },
                {
                  label: "Critical (>48h)", count: complaints.filter(c => {
                    if (["solved", "dismissed", "invoice_generated"].includes(c.status)) return false;
                    return (now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60) > 48;
                  }).length, color: "text-red-600"
                },
                { label: "Solved Complaints", count: complaints.filter(c => ["solved", "invoice_generated"].includes(c.status)).length, color: "text-green-600" }
              ].map(stat => (
                <div key={stat.label} className="flex justify-between items-end border-b border-primary/10 pb-2.5 last:border-0 last:pb-0">
                  <span className="text-xs font-semibold text-muted-foreground">{stat.label}</span>
                  <span className={`text-xl font-display font-bold ${stat.color}`}>{stat.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Service Notice</h4>
            <p className="text-xs text-muted-foreground leading-relaxed italic">Complaints not resolved within 24 hours are automatically escalated to the Overdue section for immediate attention.</p>
          </div>
        </div>
      </div>

      {/* Modern Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl bg-card border border-border p-8 shadow-elevated max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold font-display text-card-foreground">{editingId ? "Update Record" : "Register Complaint"}</h3>
                <p className="text-sm text-muted-foreground">Fill in the details for service registration.</p>
              </div>
              <button onClick={resetForm} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"><XCircle className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {!editingId && (
                <div className="bg-muted/30 p-1.5 rounded-2xl flex gap-1.5">
                  <button type="button" onClick={() => setCustomerType("old")}
                    className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all ${customerType === "old" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"}`}>
                    Search Existing
                  </button>
                  <button type="button" onClick={() => setCustomerType("new")}
                    className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all ${customerType === "new" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"}`}>
                    Create New
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Left Side: Customer Info */}
                <div className="space-y-6">
                  {(customerType === "old" || editingId) ? (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <Search className="w-3 h-3" /> Customer Selection
                      </h4>
                      <div>
                        <label className={labelClass}>Search Client</label>
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)}
                            placeholder="Search by ID, Name or Phone..." className={inputClass + " pl-10"} />
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto border border-border rounded-lg p-1 bg-muted/20">
                          {filteredCustomers.length === 0 ? (
                            <div className="p-3 text-center text-xs text-muted-foreground italic">No results found</div>
                          ) : (
                            filteredCustomers.slice(0, 10).map((c) => (
                              <button key={c.id} type="button" onClick={() => setForm({ ...form, customer_id: c.id, branch_id: c.branch_id || form.branch_id })}
                                className={`w-full text-left p-2.5 rounded-md text-xs transition-all flex items-center justify-between border ${form.customer_id === c.id ? "bg-primary/10 border-primary/30 font-bold" : "bg-card border-transparent hover:border-primary/20 hover:bg-muted/50"}`}>
                                <span>{c.name} <span className="text-muted-foreground opacity-70 ml-1 font-mono">{c.customer_id || '—'}</span></span>
                                <span className="opacity-70">{c.phone}</span>
                              </button>
                            ))
                          )}
                        </div>
                        {form.customer_id && (
                          <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="text-[10px] font-bold text-primary uppercase tracking-widest">Active Selection</h5>
                                <p className="text-sm font-bold mt-1 text-foreground">{customers.find(c => c.id === form.customer_id)?.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{customers.find(c => c.id === form.customer_id)?.customer_id} | {customers.find(c => c.id === form.customer_id)?.phone}</p>
                              </div>
                              <button type="button" onClick={() => setForm({ ...form, customer_id: "" })} className="text-[10px] font-bold text-destructive uppercase hover:underline">Clear</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <Plus className="w-3 h-3" /> New Customer
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Name *</label><input value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} className={inputClass} /></div>
                        <div><label className={labelClass}>Phone *</label><input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className={inputClass} /></div>
                      </div>
                      <div><label className={labelClass}>Email</label><input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} className={inputClass} /></div>
                      <div><label className={labelClass}>Address</label><input value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} className={inputClass} /></div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                      <Filter className="w-3 h-3" /> Service Metrics
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelClass}>Priority</label>
                        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as any })} className={inputClass}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                      <div><label className={labelClass}>Warranty Status</label>
                        <select value={form.warranty_type} onChange={(e) => setForm({ ...form, warranty_type: e.target.value })} className={inputClass}>
                          <option value="warranty">Warranty</option>
                          <option value="non_warranty">Non-Warranty</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Assignment & Details */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Assignment & Schedule
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelClass}>Branch *</label>
                        <select
                          value={form.branch_id}
                          onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                          className={inputClass}
                          disabled={hasRole("branch_admin") && !hasRole("super_admin")}
                        >
                          <option value="">Select</option>
                          {branches
                            .filter(b => !hasRole("branch_admin") || hasRole("super_admin") || b.id === profile?.branch_id)
                            .map((b) => <option key={b.id} value={b.id}>{b.name}</option>)
                          }
                        </select>
                      </div>
                      <div><label className={labelClass}>Service Type</label>
                        <select value={form.complaint_type} onChange={(e) => setForm({ ...form, complaint_type: e.target.value as any })} className={inputClass}>
                          <option value="repair">Repair</option>
                          <option value="installation">Installation</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelClass}>Technician</label>
                        <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className={inputClass}>
                          <option value="">None Assigned</option>
                          {technicians.filter(t => !form.branch_id || t.branch_id === form.branch_id).map((t) => (
                            <option key={t.id} value={t.id}>{t.full_name}</option>
                          ))}
                        </select>
                      </div>
                      <div><label className={labelClass}>Helper (Optional)</label>
                        <select value={form.assigned_helper} onChange={(e) => setForm({ ...form, assigned_helper: e.target.value })} className={inputClass}>
                          <option value="">None Assigned</option>
                          {technicians.filter(t => !form.branch_id || t.branch_id === form.branch_id).map((t) => (
                            <option key={t.id} value={t.id}>{t.full_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-3 h-3" /> Additional Info
                    </h4>
                    <div>
                      <label className={labelClass}>Complaint Description *</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={5}
                        className={inputClass + " resize-none"}
                        placeholder="Detailed issue description..."
                      />
                    </div>
                    {/* Attachments section removed per user request */}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-border">
                <button type="submit" className="flex-1 rounded-2xl bg-foreground text-background py-4 text-sm font-bold shadow-xl shadow-black/10 hover:opacity-90 transition-all active:scale-[0.98]">
                  {editingId ? "Update Record" : "Confirm"}
                </button>
                <button type="button" onClick={resetForm} className="flex-1 rounded-2xl border border-input py-4 text-sm font-bold text-foreground hover:bg-muted transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Solve Complaint Modal */}
      {solvingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-8 shadow-elevated">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold font-display text-card-foreground">Mark as Solved</h3>
                <p className="text-sm text-muted-foreground">Add final resolution notes.</p>
              </div>
              <button onClick={() => setSolvingComplaint(null)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className={labelClass}>Resolution Note *</label>
                <textarea
                  value={solveForm.notes}
                  onChange={(e) => setSolveForm({ ...solveForm, notes: e.target.value })}
                  rows={4}
                  className={inputClass + " resize-none"}
                  placeholder="Describe how the issue was resolved..."
                  required
                />
              </div>

              {/* Attachments section removed per user request */}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSolve}
                  disabled={!solveForm.notes}
                  className="flex-1 rounded-2xl bg-emerald-600 text-white py-4 text-sm font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  Confirm Solved
                </button>
                <button
                  onClick={() => setSolvingComplaint(null)}
                  className="flex-1 rounded-2xl border border-input py-4 text-sm font-bold text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {viewComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl bg-card border border-border p-8 shadow-elevated overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">#</div>
                <div>
                  <h3 className="text-xl font-bold font-display text-card-foreground">Complaint Details</h3>
                  <p className="text-sm text-muted-foreground">{viewComplaint.complaint_number}</p>
                </div>
              </div>
              <button onClick={() => setViewComplaint(null)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground"><XCircle className="w-6 h-6" /></button>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div><label className={labelClass}>Customer Details</label><p className="text-sm font-semibold">{viewComplaint.customers?.name}</p><p className="text-xs text-muted-foreground">{viewComplaint.customers?.phone}</p><p className="text-xs text-muted-foreground mt-1">{viewComplaint.customers?.address || "No address provided"}</p></div>
                <div><label className={labelClass}>Branch</label><p className="text-sm font-semibold">{viewComplaint.branches?.name}</p></div>
                <div><label className={labelClass}>Assignment</label>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Technician: <span className="text-foreground font-semibold">{viewComplaint.staff?.full_name || "Unassigned"}</span></p>
                    <p className="text-xs text-muted-foreground">Helper: <span className="text-foreground font-semibold">{viewComplaint.helper?.full_name || "None"}</span></p>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div><label className={labelClass}>Status & Priority</label>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${statusColors[viewComplaint.status] || ""}`}>{viewComplaint.status.replace('_', ' ')}</span>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${priorityColors[viewComplaint.priority] || ""}`}>{viewComplaint.priority}</span>
                  </div>
                </div>
                <div><label className={labelClass}>Resolution Expected</label><p className="text-sm font-semibold text-primary">{viewComplaint.resolution_time || "48 Hours"}</p></div>
                <div><label className={labelClass}>Verification ID</label><p className="text-sm font-mono font-bold text-emerald-600">{viewComplaint.verification_id || "—"}</p></div>
                <div><label className={labelClass}>Warranty</label><p className="text-xs font-bold uppercase text-muted-foreground">{viewComplaint.warranty_type.replace('_', ' ')}</p></div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-border">
              <label className={labelClass}>Description</label>
              <div className="p-4 rounded-xl bg-muted/30 text-sm text-foreground italic border border-border leading-relaxed">"{viewComplaint.description}"</div>
            </div>

            {viewComplaint.notes && (
              <div className="mt-6">
                <label className={labelClass}>Resolution Note</label>
                <div className="p-4 rounded-xl bg-emerald-50 text-sm text-emerald-900 border border-emerald-100 leading-relaxed font-medium">
                  {viewComplaint.notes}
                </div>
              </div>
            )}

            {viewComplaint.attachments && viewComplaint.attachments.length > 0 && (
              <div className="mt-6">
                <label className={labelClass}>Attachments ({viewComplaint.attachments.length})</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {viewComplaint.attachments
                    .filter((att: string) => typeof att === 'string' && att.trim() !== "" && att !== "[" && att !== "]")
                    .map((att: string, i: number) => {
                      const [name, rawUrl] = att.includes('|') ? att.split('|') : [null, att];
                      const baseUrl = import.meta.env.VITE_API_URL ?? '';

                      // Ensure URL starts with /uploads/ if it's just a filename
                      let url = rawUrl;
                      if (url && !url.startsWith('http') && !url.startsWith('/uploads/') && !url.startsWith('uploads/')) {
                        url = `/uploads/${url}`;
                      }

                      const fullUrl = url?.startsWith('http') ? url : `${baseUrl}${url?.startsWith('/') ? '' : '/'}${url}`;

                      return (
                        <a key={i} href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all group">
                          {att.toLowerCase().includes('.pdf') || (name && name.toLowerCase().includes('.pdf')) ? <FileText className="w-4 h-4 text-primary" /> : <Paperclip className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />}
                          <span className="text-[10px] font-bold truncate flex-1 uppercase tracking-tight">{name || `Attachment ${i + 1}`}</span>
                        </a>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;
