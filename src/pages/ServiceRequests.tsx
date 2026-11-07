import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Search, Loader2, Phone, Mail, CheckCircle2, Trash2, 
  AlertCircle, Eye, Hash, MapPin, Tag, User, FileText, 
  Clock, Filter, XCircle, ArrowRightCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  contacted: "bg-blue-100 text-blue-700",
  converted_to_complaint: "bg-emerald-100 text-emerald-700",
  rejected: "bg-destructive/10 text-destructive",
};

const ServiceRequests = () => {
  const { hasRole, profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const { toast } = useToast();

  // Auxiliary data for Complaint Registration
  const [branches, setBranches] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Convert to Complaint Modal State
  const [convertingReq, setConvertingReq] = useState<any | null>(null);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [convertForm, setConvertForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    branch_id: "",
    complaint_type: "repair" as "installation" | "repair" | "maintenance",
    priority: "medium" as "low" | "medium" | "high" | "emergency",
    serial_number: "",
    warranty_type: "non_warranty",
    assigned_to: "",
    assigned_helper: "",
    description: "",
  });

  const API_URL = import.meta.env.VITE_API_URL ?? '';

  const fetchAuxData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("ecs_token")}` };
      const [brRes, staffRes, custRes] = await Promise.all([
        fetch(`${API_URL}/api/branches`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/api/staff?status=active`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/api/customers`, { headers }).then(r => r.json()).catch(() => []),
      ]);
      setBranches(Array.isArray(brRes) ? brRes : []);
      setTechnicians(Array.isArray(staffRes) ? staffRes : []);
      setCustomers(Array.isArray(custRes) ? custRes : []);
    } catch (e) {
      console.error("Failed to load aux data for complaints:", e);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/api/service_requests`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("ecs_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      toast({ title: "Error", description: "Could not load service requests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchAuxData();
  }, []);

  const openConvertModal = (req: any) => {
    // Detect matched branch
    let matchedBranchId = "";
    if (req.branch_id && branches.some(b => b.id === req.branch_id)) {
      matchedBranchId = req.branch_id;
    } else if (req.city_branch) {
      const found = branches.find(b => 
        b.name?.toLowerCase().includes(req.city_branch.toLowerCase()) || 
        b.city?.toLowerCase().includes(req.city_branch.toLowerCase())
      );
      if (found) matchedBranchId = found.id;
    }
    if (!matchedBranchId && branches.length > 0) {
      matchedBranchId = profile?.branch_id || branches[0].id;
    }

    // Detect service type
    const sLower = (req.service_required || "").toLowerCase();
    let compType: "installation" | "repair" | "maintenance" = "repair";
    if (sLower.includes("install")) compType = "installation";
    else if (sLower.includes("maint")) compType = "maintenance";

    setConvertForm({
      name: req.name || "",
      phone: req.phone || "",
      email: req.email || "",
      address: req.city_branch || "",
      branch_id: matchedBranchId,
      complaint_type: compType,
      priority: "medium",
      serial_number: "",
      warranty_type: "non_warranty",
      assigned_to: "",
      assigned_helper: "",
      description: req.service_required ? `[Service Request ${req.id}]: ${req.service_required}` : "",
    });

    setConvertingReq(req);
  };

  const handleStatusChange = async (req: any, newStatus: string) => {
    if (newStatus === "converted_to_complaint") {
      openConvertModal(req);
      return;
    }

    // Optimistic UI update: update immediately
    const prevStatus = req.status;
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: newStatus } : r));

    try {
      const res = await fetch(`${API_URL}/api/service_requests/${req.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("ecs_token")}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast({ title: "Status Updated", description: `Request marked as ${newStatus.replace(/_/g, " ")}` });
    } catch (err) {
      // Rollback on failure
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: prevStatus } : r));
      toast({ title: "Error", description: "Update failed", variant: "destructive" });
    }
  };

  const handleRegisterComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingReq) return;

    // Validate mandatory fields: Name, Phone, Email *, Branch, Description
    if (!convertForm.name.trim() || !convertForm.phone.trim()) {
      toast({ title: "Validation Error", description: "Customer name and phone number are required.", variant: "destructive" });
      return;
    }

    const emailTrimmed = convertForm.email.trim();
    if (!emailTrimmed) {
      toast({ title: "Validation Error", description: "Customer email * is mandatory to register complaint.", variant: "destructive" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      toast({ title: "Validation Error", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    if (!convertForm.branch_id) {
      toast({ title: "Validation Error", description: "Please select a branch.", variant: "destructive" });
      return;
    }

    if (!convertForm.description.trim()) {
      toast({ title: "Validation Error", description: "Complaint description is required.", variant: "destructive" });
      return;
    }

    setSubmittingComplaint(true);

    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("ecs_token")}`,
        "Content-Type": "application/json",
      };

      // 1. Check or Create Customer
      let customerId = "";
      const checkRes = await fetch(`${API_URL}/api/customers?search=${convertForm.phone.trim()}&branch_id=${convertForm.branch_id}`, { headers });
      const checkData = await checkRes.json();
      const existingCust = Array.isArray(checkData) ? checkData.find((c: any) => c.phone === convertForm.phone.trim()) : null;

      if (existingCust && existingCust.name?.toLowerCase().trim() === convertForm.name.toLowerCase().trim()) {
        customerId = existingCust.id;
        // If existing customer doesn't have an email in DB, update it
        if (!existingCust.email && emailTrimmed) {
          await fetch(`${API_URL}/api/customers/${existingCust.id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ email: emailTrimmed }),
          }).catch(() => null);
        }
      } else {
        const createCustRes = await fetch(`${API_URL}/api/customers`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: convertForm.name.trim(),
            phone: convertForm.phone.trim(),
            email: emailTrimmed,
            address: convertForm.address.trim(),
            city: branches.find(b => b.id === convertForm.branch_id)?.city || "",
            branch_id: convertForm.branch_id,
          }),
        });

        if (!createCustRes.ok) {
          const err = await createCustRes.json();
          throw new Error(err.error || "Failed to create customer");
        }
        const newCust = await createCustRes.json();
        customerId = newCust.id;
      }

      // 2. Register Complaint
      const complaintPayload = {
        customer_id: customerId,
        branch_id: convertForm.branch_id,
        complaint_type: convertForm.complaint_type,
        priority: convertForm.priority,
        serial_number: convertForm.serial_number.trim() || null,
        description: convertForm.description.trim(),
        notes: `Converted from Service Request ${convertingReq.id}`,
        warranty_type: convertForm.warranty_type,
        assigned_to: convertForm.assigned_to || null,
        assigned_helper: convertForm.assigned_helper || null,
        attachments: [],
      };

      const compRes = await fetch(`${API_URL}/api/complaints`, {
        method: "POST",
        headers,
        body: JSON.stringify(complaintPayload),
      });

      if (!compRes.ok) {
        const err = await compRes.json();
        throw new Error(err.error || "Failed to register complaint");
      }

      const compData = await compRes.json();

      // 3. Update Service Request status to converted_to_complaint
      await fetch(`${API_URL}/api/service_requests/${convertingReq.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: "converted_to_complaint" }),
      });

      // Update local state immediately
      setRequests(prev => prev.map(r => r.id === convertingReq.id ? { ...r, status: "converted_to_complaint" } : r));

      toast({
        title: "Complaint Registered & Status Updated!",
        description: `Complaint #${compData.complaint_number || 'N/A'} registered successfully.`,
      });

      setConvertingReq(null);
      fetchRequests();
    } catch (err: any) {
      toast({ title: "Conversion Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const deleteRequest = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this service request?")) return;
    try {
      const res = await fetch(`${API_URL}/api/service_requests/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("ecs_token")}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Success", description: "Service request deleted." });
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    }
  };

  const filtered = requests.filter(r => 
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.phone?.includes(search) ||
    r.city_branch?.toLowerCase().includes(search.toLowerCase()) ||
    r.service_required?.toLowerCase().includes(search.toLowerCase())
  );

  const inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";
  const labelClass = "text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Requests</h1>
          <p className="text-sm text-muted-foreground">Manage service inquiries from the landing page</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4 bg-muted/30">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">City/Branch</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading requests...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No service requests found.
                  </td>
                </tr>
              ) : (
                filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      {req.created_at ? format(new Date(req.created_at), "dd MMM, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{req.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" /> {req.phone}</span>
                        {req.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="w-3 h-3" /> {req.email}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                        {req.service_required}
                      </span>
                    </td>
                    <td className="px-4 py-3">{req.city_branch}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[req.status] || "bg-muted text-muted-foreground"}`}>
                        {req.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedReq(req)} className="h-8 gap-1.5 text-xs">
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>

                        {/* Custom 4 Options: pending, contacted, converted_to_complaint, rejected */}
                        <select
                          className="text-xs bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                          value={req.status}
                          onChange={(e) => handleStatusChange(req, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="contacted">Contacted</option>
                          <option value="converted_to_complaint">Converted</option>
                          <option value="rejected">Rejected</option>
                        </select>

                        {req.status !== "converted_to_complaint" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openConvertModal(req)}
                            className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            title="Register complaint from this request"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5" /> Convert
                          </Button>
                        )}

                        {(hasRole("super_admin") || hasRole("developer")) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteRequest(req.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Request Details Dialog */}
      <Dialog open={!!selectedReq} onOpenChange={(open) => !open && setSelectedReq(null)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Service Request Details
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/80">
                Detailed view of the customer's request.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          {selectedReq && (
            <div className="p-6 space-y-5 bg-card">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> Request ID</span>
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{selectedReq.id}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><User className="w-3.5 h-3.5" /> Customer Name</span>
                  <span className="text-sm font-medium">{selectedReq.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Contact Number</span>
                  <span className="text-sm font-medium">{selectedReq.phone}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email Address</span>
                  <span className="text-sm font-medium">{selectedReq.email || "—"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Service Required</span>
                  <span className="text-sm font-medium">{selectedReq.service_required}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Branch / City</span>
                  <span className="text-sm font-medium">{selectedReq.city_branch}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[selectedReq.status] || "bg-muted text-muted-foreground"}`}>
                    {selectedReq.status?.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {selectedReq.status !== "converted_to_complaint" && (
                <Button 
                  onClick={() => {
                    const req = selectedReq;
                    setSelectedReq(null);
                    openConvertModal(req);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                >
                  <ArrowRightCircle className="w-4 h-4" /> Convert to Complaint
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert to Complaint Form Modal */}
      {convertingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl bg-card border border-border p-8 shadow-elevated max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold font-display text-card-foreground">
                  Register Complaint
                </h3>
                <p className="text-sm text-muted-foreground">
                  Converting Service Request <span className="font-mono font-semibold text-primary">{convertingReq.id}</span>
                </p>
              </div>
              <button 
                onClick={() => setConvertingReq(null)} 
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRegisterComplaint} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Left Side: Customer Info (Pre-filled from request) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Customer Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Customer Name *</label>
                      <input 
                        required 
                        value={convertForm.name} 
                        onChange={(e) => setConvertForm({ ...convertForm, name: e.target.value })} 
                        className={inputClass} 
                        placeholder="Full name" 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Phone *</label>
                      <input 
                        required 
                        value={convertForm.phone} 
                        onChange={(e) => setConvertForm({ ...convertForm, phone: e.target.value })} 
                        className={inputClass} 
                        placeholder="Phone number" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Email * (Mandatory)</label>
                    <input 
                      type="email" 
                      required 
                      value={convertForm.email} 
                      onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })} 
                      className={inputClass} 
                      placeholder="customer@example.com" 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Address / City</label>
                    <input 
                      value={convertForm.address} 
                      onChange={(e) => setConvertForm({ ...convertForm, address: e.target.value })} 
                      className={inputClass} 
                      placeholder="Street address or city" 
                    />
                  </div>

                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-3">
                      <Filter className="w-3.5 h-3.5" /> Service Metrics
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Priority</label>
                        <select 
                          value={convertForm.priority} 
                          onChange={(e) => setConvertForm({ ...convertForm, priority: e.target.value as any })} 
                          className={inputClass}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Warranty Status</label>
                        <select 
                          value={convertForm.warranty_type} 
                          onChange={(e) => setConvertForm({ ...convertForm, warranty_type: e.target.value })} 
                          className={inputClass}
                        >
                          <option value="warranty">Warranty</option>
                          <option value="non_warranty">Non-Warranty</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Serial Number</label>
                        <input 
                          type="text" 
                          value={convertForm.serial_number} 
                          onChange={(e) => setConvertForm({ ...convertForm, serial_number: e.target.value })} 
                          placeholder="e.g. SN-098234" 
                          className={inputClass} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Assignment & Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Assignment & Branch
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Branch *</label>
                      <select
                        required
                        value={convertForm.branch_id}
                        onChange={(e) => setConvertForm({ ...convertForm, branch_id: e.target.value })}
                        className={inputClass}
                      >
                        <option value="">Select Branch</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Service Type</label>
                      <select 
                        value={convertForm.complaint_type} 
                        onChange={(e) => setConvertForm({ ...convertForm, complaint_type: e.target.value as any })} 
                        className={inputClass}
                      >
                        <option value="repair">Repair</option>
                        <option value="installation">Installation</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Technician</label>
                      <select 
                        value={convertForm.assigned_to} 
                        onChange={(e) => setConvertForm({ ...convertForm, assigned_to: e.target.value })} 
                        className={inputClass}
                      >
                        <option value="">None Assigned</option>
                        {technicians.filter(t => !convertForm.branch_id || t.branch_id === convertForm.branch_id).map((t) => (
                          <option key={t.id} value={t.id}>{t.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Helper (Optional)</label>
                      <select 
                        value={convertForm.assigned_helper} 
                        onChange={(e) => setConvertForm({ ...convertForm, assigned_helper: e.target.value })} 
                        className={inputClass}
                      >
                        <option value="">None Assigned</option>
                        {technicians.filter(t => !convertForm.branch_id || t.branch_id === convertForm.branch_id).map((t) => (
                          <option key={t.id} value={t.id}>{t.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Complaint Description *</label>
                    <textarea
                      required
                      value={convertForm.description}
                      onChange={(e) => setConvertForm({ ...convertForm, description: e.target.value })}
                      rows={4}
                      className={inputClass + " resize-none"}
                      placeholder="Detailed issue description..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-border">
                <button 
                  type="submit" 
                  disabled={submittingComplaint}
                  className="flex-1 rounded-2xl bg-emerald-600 text-white py-4 text-sm font-bold shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {submittingComplaint ? "Registering & Converting..." : "Confirm & Register Complaint"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setConvertingReq(null)} 
                  className="flex-1 rounded-2xl border border-input py-4 text-sm font-bold text-foreground hover:bg-muted transition-colors"
                >
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

export default ServiceRequests;
