import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Plus, Search, Users, Edit2, Trash2, FileDown, Lock, UserCheck, UserX, 
  BadgeDollarSign, Calendar, FileText, Award, Eye, Download, Upload, 
  CheckCircle2, AlertCircle, Phone, Mail, MapPin, Building2, CreditCard, 
  ShieldAlert, Heart, FileCheck, XCircle, Printer, Sparkles, User, Briefcase
} from "lucide-react";
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
  const [viewingStaff, setViewingStaff] = useState<any | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<"personal" | "job" | "payroll" | "emergency" | "documents">("personal");
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const { toast } = useToast();

  const isEditable = (createdAt: string) => {
    if (!createdAt) return true;
    if (isAdminOrDev) return true;
    
    // For Branch Admin: only editable within 2 hours
    const hoursSinceCreation = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation <= 2;
  };

  const emptyForm = {
    employee_id: "",
    full_name: "",
    father_name: "",
    cnic: "",
    designation: "",
    branch_id: "",
    status: "active",
    joining_date: new Date().toISOString().split("T")[0],
    salary: "",
    contact_1: "",
    contact_2: "",
    address: "",
    // 1. Personal & Identity Details
    dob: "",
    gender: "Male",
    marital_status: "Single",
    blood_group: "",
    email: "",
    current_address: "",
    // 2. Job & Department Details
    department: "Operations",
    employment_type: "Full-Time",
    shift_timing: "Morning",
    reporting_manager: "",
    // 3. Payroll & Bank Details
    payment_mode: "Bank Transfer",
    bank_name: "",
    account_title: "",
    account_number: "",
    allowances: "",
    // 4. Emergency Contact
    emergency_contact_name: "",
    emergency_relation: "Father",
    emergency_phone: "",
    // 5. Document Uploads
    profile_photo: "",
    doc_cnic: "",
    doc_resume: "",
    doc_appointment: ""
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

  const handleDocumentUpload = async (field: 'profile_photo' | 'doc_cnic' | 'doc_resume' | 'doc_appointment', file: File) => {
    if (!file) return;

    // Strict validation: document fields MUST be PDF only as requested
    if (field !== 'profile_photo' && !file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      toast({ 
        title: "PDF Only Allowed", 
        description: "Documents must be uploaded in PDF format only.", 
        variant: "destructive" 
      });
      return;
    }

    try {
      setUploadingDoc(field);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecs_token')}` },
        body: formData
      });
      if (!res.ok) throw new Error("Failed to upload document");
      const data = await res.json();
      const fileUrl = `${API_URL}/uploads/${data.filename}`;
      setForm(prev => ({ ...prev, [field]: fileUrl }));
      toast({ title: "Upload Success", description: `${file.name} uploaded successfully.` });
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Required fields validation with * indicators
    if (!form.full_name?.trim()) {
      toast({ title: "Validation Error", description: "Full Name * is required.", variant: "destructive" });
      setActiveFormTab("personal");
      return;
    }
    if (!form.cnic?.trim()) {
      toast({ title: "Validation Error", description: "CNIC * is required.", variant: "destructive" });
      setActiveFormTab("personal");
      return;
    }
    if (!form.contact_1?.trim()) {
      toast({ title: "Validation Error", description: "Contact 1 * is required.", variant: "destructive" });
      setActiveFormTab("personal");
      return;
    }
    if (!form.branch_id) {
      toast({ title: "Validation Error", description: "Branch * is required.", variant: "destructive" });
      setActiveFormTab("job");
      return;
    }
    if (!form.designation?.trim()) {
      toast({ title: "Validation Error", description: "Designation * is required.", variant: "destructive" });
      setActiveFormTab("job");
      return;
    }
    if (!form.joining_date) {
      toast({ title: "Validation Error", description: "Joining Date * is required.", variant: "destructive" });
      setActiveFormTab("job");
      return;
    }
    if (isAdminOrDev && (form.salary === "" || isNaN(Number(form.salary)))) {
      toast({ title: "Validation Error", description: "Salary * is required.", variant: "destructive" });
      setActiveFormTab("payroll");
      return;
    }

    const payload = {
      ...form,
      employee_id: form.employee_id || undefined,
      salary: parseFloat(form.salary) || 0,
      allowances: parseFloat(form.allowances) || 0
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

      toast({ title: editingId ? "Staff member updated!" : "Staff member added successfully!" });
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
      employee_id: s.employee_id || "",
      full_name: s.full_name || "",
      father_name: s.father_name || "",
      cnic: s.cnic || "",
      designation: s.designation || "",
      branch_id: String(s.branch_id || ""),
      status: s.status || "active",
      joining_date: s.joining_date ? new Date(s.joining_date).toISOString().split("T")[0] : "",
      salary: String(s.salary ?? ""),
      contact_1: s.contact_1 || "",
      contact_2: s.contact_2 || "",
      address: s.address || "",
      dob: s.dob ? new Date(s.dob).toISOString().split("T")[0] : "",
      gender: s.gender || "Male",
      marital_status: s.marital_status || "Single",
      blood_group: s.blood_group || "",
      email: s.email || "",
      current_address: s.current_address || "",
      department: s.department || "Operations",
      employment_type: s.employment_type || "Full-Time",
      shift_timing: s.shift_timing || "Morning",
      reporting_manager: s.reporting_manager || "",
      payment_mode: s.payment_mode || "Bank Transfer",
      bank_name: s.bank_name || "",
      account_title: s.account_title || "",
      account_number: s.account_number || "",
      allowances: String(s.allowances ?? ""),
      emergency_contact_name: s.emergency_contact_name || "",
      emergency_relation: s.emergency_relation || "Father",
      emergency_phone: s.emergency_phone || "",
      profile_photo: s.profile_photo || "",
      doc_cnic: s.doc_cnic || "",
      doc_resume: s.doc_resume || "",
      doc_appointment: s.doc_appointment || ""
    });
    setEditingId(s.id);
    setActiveFormTab("personal");
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
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.cnic?.includes(search) ||
    s.department?.toLowerCase().includes(search.toLowerCase()) ||
    s.designation?.toLowerCase().includes(search.toLowerCase())
  );

  const activeStaff = staff.filter(s => s.status === 'active');
  const inactiveStaff = staff.filter(s => s.status !== 'active');
  const totalSalary = staff.reduce((sum, s) => sum + (Number(s.salary) || 0), 0);

  const handleDownloadReport = () => {
    const isSuperAdmin = isAdminOrDev;
    const headers = ["ID", "Name", "CNIC", "Designation", "Department", "Branch", "Status", "Contact"];
    if (isSuperAdmin) headers.push("Salary");

    const rows = filtered.map(s => {
      const row = [
        s.employee_id || "—",
        s.full_name || "—",
        s.cnic || "—",
        s.designation || "—",
        s.department || "Operations",
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

  const inputCls = "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all";
  const labelCls = "text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Staff & Employee Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Comprehensive employee records, payroll, documentation & compliance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadReport} className="inline-flex items-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted shadow-sm transition-all active:scale-95">
            <FileDown className="w-4 h-4" /> Download Report
          </button>
          {isAdminOrDev && (
            <button
              onClick={() => {
                const bId = (!hasRole("super_admin") && profile?.branch_id) ? profile.branch_id : "";
                setEditingId(null);
                setForm({ ...emptyForm, branch_id: bId });
                setActiveFormTab("personal");
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Users className="w-5 h-5" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Staff</p><p className="text-2xl font-bold text-foreground mt-0.5">{staff.length}</p></div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600"><UserCheck className="w-5 h-5" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Staff</p><p className="text-2xl font-bold text-foreground mt-0.5">{activeStaff.length}</p></div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive"><UserX className="w-5 h-5" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Inactive / Terminated</p><p className="text-2xl font-bold text-foreground mt-0.5">{inactiveStaff.length}</p></div>
        </div>
        {isAdminOrDev && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600"><BadgeDollarSign className="w-5 h-5" /></div>
            <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Monthly Base Payroll</p><p className="text-xl font-bold text-foreground mt-0.5">Rs. {totalSalary.toLocaleString()}</p></div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Search by Employee ID, name, CNIC, department, or designation..." 
          className="w-full rounded-2xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all" 
        />
      </div>

      {/* Expanded Multi-Section Employee Registration & Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-3xl bg-card border border-border p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-2xl font-bold font-display text-card-foreground">
                  {editingId ? "Edit Employee Profile" : "Register New Employee"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete master identity, job specifications, payroll, emergency, and PDF documents.
                </p>
              </div>
              <button 
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="w-8 h-8 rounded-full hover:bg-muted text-muted-foreground flex items-center justify-center transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Form Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl my-5 overflow-x-auto">
              {[
                { id: "personal", label: "1. Personal & Identity", icon: User },
                { id: "job", label: "2. Job & Department", icon: Briefcase },
                { id: "payroll", label: "3. Payroll & Bank", icon: CreditCard },
                { id: "emergency", label: "4. Emergency Contact", icon: Heart },
                { id: "documents", label: "5. PDF Documents", icon: FileCheck },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFormTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    activeFormTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* TAB 1: PERSONAL & IDENTITY DETAILS */}
              {activeFormTab === "personal" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Employee ID (Auto/Manual)</label>
                      <input 
                        value={form.employee_id} 
                        onChange={(e) => setForm({ ...form, employee_id: e.target.value })} 
                        placeholder="Auto-assigned (e.g. ECS-2026-STF-00001)" 
                        className={inputCls} 
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Full Name <span className="text-destructive">*</span></label>
                      <input 
                        value={form.full_name} 
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                        placeholder="Employee's full legal name"
                        className={inputCls} 
                        required 
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Father / Guardian Name</label>
                      <input 
                        value={form.father_name} 
                        onChange={(e) => setForm({ ...form, father_name: e.target.value })} 
                        placeholder="Father's name"
                        className={inputCls} 
                      />
                    </div>
                    <div>
                      <label className={labelCls}>CNIC Number <span className="text-destructive">*</span></label>
                      <input 
                        value={form.cnic} 
                        onChange={(e) => setForm({ ...form, cnic: e.target.value })} 
                        placeholder="XXXXX-XXXXXXX-X"
                        className={inputCls} 
                        required 
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Date of Birth</label>
                      <input 
                        type="date" 
                        value={form.dob} 
                        onChange={(e) => setForm({ ...form, dob: e.target.value })} 
                        className={inputCls} 
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Gender</label>
                      <select 
                        value={form.gender} 
                        onChange={(e) => setForm({ ...form, gender: e.target.value })} 
                        className={inputCls}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Marital Status</label>
                      <select 
                        value={form.marital_status} 
                        onChange={(e) => setForm({ ...form, marital_status: e.target.value })} 
                        className={inputCls}
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Blood Group</label>
                      <select 
                        value={form.blood_group} 
                        onChange={(e) => setForm({ ...form, blood_group: e.target.value })} 
                        className={inputCls}
                      >
                        <option value="">Select Blood Group</option>
                        {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Email Address</label>
                      <input 
                        type="email" 
                        value={form.email} 
                        onChange={(e) => setForm({ ...form, email: e.target.value })} 
                        placeholder="employee@domain.com"
                        className={inputCls} 
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Contact Number 1 <span className="text-destructive">*</span></label>
                      <input 
                        value={form.contact_1} 
                        onChange={(e) => setForm({ ...form, contact_1: e.target.value })} 
                        placeholder="+92 3XX XXXXXXX"
                        className={inputCls} 
                        required 
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Contact Number 2</label>
                      <input 
                        value={form.contact_2} 
                        onChange={(e) => setForm({ ...form, contact_2: e.target.value })} 
                        placeholder="Alternative contact"
                        className={inputCls} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-muted/20 rounded-2xl border border-border">
                      <label className={labelCls}>Current / Temporary Address</label>
                      <textarea 
                        value={form.current_address} 
                        onChange={(e) => setForm({ ...form, current_address: e.target.value })} 
                        rows={2} 
                        placeholder="Current residential address..."
                        className={inputCls + " resize-none"} 
                      />
                    </div>
                    <div className="p-4 bg-muted/20 rounded-2xl border border-border">
                      <label className={labelCls}>Permanent Address</label>
                      <textarea 
                        value={form.address} 
                        onChange={(e) => setForm({ ...form, address: e.target.value })} 
                        rows={2} 
                        placeholder="Permanent domicile address..."
                        className={inputCls + " resize-none"} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: JOB & DEPARTMENT DETAILS */}
              {activeFormTab === "job" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Assigned Branch <span className="text-destructive">*</span></label>
                      <select
                        value={form.branch_id}
                        onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                        className={inputCls}
                        disabled={!hasRole('super_admin')}
                        required
                      >
                        <option value="">Select Branch</option>
                        {branches
                          .filter(b => !hasRole("branch_admin") || hasRole("super_admin") || b.id === profile?.branch_id)
                          .map((b) => <option key={b.id} value={b.id}>{b.name} ({b.city || 'Head Office'})</option>)
                        }
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>Designation <span className="text-destructive">*</span></label>
                      <input 
                        value={form.designation} 
                        onChange={(e) => setForm({ ...form, designation: e.target.value })} 
                        placeholder="e.g. Lead Technician, Senior Accountant"
                        className={inputCls} 
                        required 
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Department</label>
                      <select 
                        value={form.department} 
                        onChange={(e) => setForm({ ...form, department: e.target.value })} 
                        className={inputCls}
                      >
                        {[
                          "Operations", "Technical & Repair", "Sales & Marketing", "Accounts & Finance",
                          "Human Resources (HR)", "IT & Software", "Administration", "Customer Support",
                          "Inventory & Warehouse", "Field Engineering"
                        ].map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>Employment Type</label>
                      <select 
                        value={form.employment_type} 
                        onChange={(e) => setForm({ ...form, employment_type: e.target.value })} 
                        className={inputCls}
                      >
                        <option value="Full-Time">Full-Time</option>
                        <option value="Part-Time">Part-Time</option>
                        <option value="Contract">Contract</option>
                        <option value="Probation">Probation</option>
                        <option value="Intern">Intern</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>Shift Timing</label>
                      <select 
                        value={form.shift_timing} 
                        onChange={(e) => setForm({ ...form, shift_timing: e.target.value })} 
                        className={inputCls}
                      >
                        <option value="Morning">Morning Shift (9:00 AM - 6:00 PM)</option>
                        <option value="Evening">Evening Shift (2:00 PM - 11:00 PM)</option>
                        <option value="Night">Night Shift (10:00 PM - 7:00 AM)</option>
                        <option value="Rotational">Rotational Shift</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>Reporting Manager / Supervisor</label>
                      <input 
                        value={form.reporting_manager} 
                        onChange={(e) => setForm({ ...form, reporting_manager: e.target.value })} 
                        placeholder="Supervisor Name or ID"
                        className={inputCls} 
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Joining Date <span className="text-destructive">*</span></label>
                      <input 
                        type="date" 
                        value={form.joining_date} 
                        onChange={(e) => setForm({ ...form, joining_date: e.target.value })} 
                        className={inputCls} 
                        required 
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Status</label>
                      <select 
                        value={form.status} 
                        onChange={(e) => setForm({ ...form, status: e.target.value })} 
                        className={inputCls}
                        disabled={editingId && staff.find((s: any) => s.id === editingId)?.status === 'terminated'}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="terminated">Terminated</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PAYROLL & BANK DETAILS */}
              {activeFormTab === "payroll" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isAdminOrDev ? (
                      <div>
                        <label className={labelCls}>Basic Monthly Salary (Rs.) <span className="text-destructive">*</span></label>
                        <input 
                          type="number" 
                          value={form.salary} 
                          onChange={(e) => setForm({ ...form, salary: e.target.value })} 
                          placeholder="Monthly base salary"
                          className={inputCls} 
                          required 
                        />
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-muted/40 border border-border">
                        <label className={labelCls}>Salary</label>
                        <p className="text-xs text-muted-foreground font-semibold">Protected / Super Admin Only</p>
                      </div>
                    )}

                    <div>
                      <label className={labelCls}>Allowances (Fuel, Medical, Mobile)</label>
                      <input 
                        type="number" 
                        value={form.allowances} 
                        onChange={(e) => setForm({ ...form, allowances: e.target.value })} 
                        placeholder="Additional monthly allowances (Rs.)"
                        className={inputCls} 
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Payment Mode</label>
                      <select 
                        value={form.payment_mode} 
                        onChange={(e) => setForm({ ...form, payment_mode: e.target.value })} 
                        className={inputCls}
                      >
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash in Hand</option>
                        <option value="Cheque">Cheque</option>
                        <option value="JazzCash-EasyPaisa">JazzCash / EasyPaisa</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>Bank Name</label>
                      <input 
                        value={form.bank_name} 
                        onChange={(e) => setForm({ ...form, bank_name: e.target.value })} 
                        placeholder="e.g. HBL, Meezan, UBL, Bank Alfalah"
                        className={inputCls} 
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Account Title</label>
                      <input 
                        value={form.account_title} 
                        onChange={(e) => setForm({ ...form, account_title: e.target.value })} 
                        placeholder="Exact title on bank statement"
                        className={inputCls} 
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Account Number / IBAN</label>
                      <input 
                        value={form.account_number} 
                        onChange={(e) => setForm({ ...form, account_number: e.target.value })} 
                        placeholder="PKXX XXXX XXXX XXXX XXXX XXXX"
                        className={inputCls} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: EMERGENCY CONTACT */}
              {activeFormTab === "emergency" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border">
                    <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-destructive" /> Emergency Contact & Next of Kin
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={labelCls}>Emergency Contact Name</label>
                        <input 
                          value={form.emergency_contact_name} 
                          onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} 
                          placeholder="Contact person's full name"
                          className={inputCls} 
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Relationship with Employee</label>
                        <select
                          value={form.emergency_relation}
                          onChange={(e) => setForm({ ...form, emergency_relation: e.target.value })}
                          className={inputCls}
                        >
                          {["Father", "Mother", "Brother", "Sister", "Spouse", "Guardian", "Relative", "Friend"].map(rel => (
                            <option key={rel} value={rel}>{rel}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Emergency Contact Number</label>
                        <input 
                          value={form.emergency_phone} 
                          onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })} 
                          placeholder="+92 3XX XXXXXXX"
                          className={inputCls} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: DOCUMENT UPLOADS (STRICTLY PDF ONLY FOR DOCUMENTS) */}
              {activeFormTab === "documents" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 text-xs text-sky-800 dark:text-sky-300 flex items-center gap-2 font-medium">
                    <FileCheck className="w-4 h-4 shrink-0 text-sky-600" />
                    <span>Official Rule: Documents (CNIC, Resume, Appointment Letter) must be uploaded in <strong>PDF format only</strong>. Files are permanently preserved for audit and download.</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Profile Photo */}
                    <div className="p-4 rounded-2xl border border-border bg-card space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className={labelCls}>Profile Photo (Image)</label>
                        {form.profile_photo && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Uploaded
                          </span>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDocumentUpload("profile_photo", file);
                        }} 
                        className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                        disabled={uploadingDoc === "profile_photo"}
                      />
                      {form.profile_photo && (
                        <div className="flex items-center justify-between text-xs pt-1">
                          <a href={form.profile_photo} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> View Photo
                          </a>
                          <button type="button" onClick={() => setForm(prev => ({ ...prev, profile_photo: "" }))} className="text-destructive hover:underline text-[11px] font-bold">
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {/* CNIC Front & Back (PDF Only) */}
                    <div className="p-4 rounded-2xl border border-border bg-card space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className={labelCls}>CNIC Front & Back (PDF Only)</label>
                        {form.doc_cnic && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> PDF Saved
                          </span>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDocumentUpload("doc_cnic", file);
                        }} 
                        className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                        disabled={uploadingDoc === "doc_cnic"}
                      />
                      {form.doc_cnic && (
                        <div className="flex items-center justify-between text-xs pt-1">
                          <a href={form.doc_cnic} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold flex items-center gap-1">
                            <Download className="w-3.5 h-3.5" /> Download CNIC PDF
                          </a>
                          <button type="button" onClick={() => setForm(prev => ({ ...prev, doc_cnic: "" }))} className="text-destructive hover:underline text-[11px] font-bold">
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {/* CV / Resume & Educational Documents (PDF Only) */}
                    <div className="p-4 rounded-2xl border border-border bg-card space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className={labelCls}>CV & Educational Docs (PDF Only)</label>
                        {form.doc_resume && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> PDF Saved
                          </span>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDocumentUpload("doc_resume", file);
                        }} 
                        className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                        disabled={uploadingDoc === "doc_resume"}
                      />
                      {form.doc_resume && (
                        <div className="flex items-center justify-between text-xs pt-1">
                          <a href={form.doc_resume} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold flex items-center gap-1">
                            <Download className="w-3.5 h-3.5" /> Download Resume PDF
                          </a>
                          <button type="button" onClick={() => setForm(prev => ({ ...prev, doc_resume: "" }))} className="text-destructive hover:underline text-[11px] font-bold">
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Appointment Letter / Contract (PDF Only) */}
                    <div className="p-4 rounded-2xl border border-border bg-card space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className={labelCls}>Appointment Letter / Contract (PDF Only)</label>
                        {form.doc_appointment && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> PDF Saved
                          </span>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDocumentUpload("doc_appointment", file);
                        }} 
                        className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                        disabled={uploadingDoc === "doc_appointment"}
                      />
                      {form.doc_appointment && (
                        <div className="flex items-center justify-between text-xs pt-1">
                          <a href={form.doc_appointment} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold flex items-center gap-1">
                            <Download className="w-3.5 h-3.5" /> Download Contract PDF
                          </a>
                          <button type="button" onClick={() => setForm(prev => ({ ...prev, doc_appointment: "" }))} className="text-destructive hover:underline text-[11px] font-bold">
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Fields marked with <span className="text-destructive font-bold">*</span> are required.
                  </span>
                </div>
                <div className="flex gap-2.5">
                  <button 
                    type="button" 
                    onClick={() => { setShowForm(false); setEditingId(null); }} 
                    className="px-5 py-2.5 rounded-xl border border-input text-sm font-semibold hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:bg-primary/90 active:scale-95 transition-all"
                  >
                    {editingId ? "Update Employee Profile" : "Save & Register Employee"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Full Employee Profile Modal */}
      {viewingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl bg-card border border-border p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-bold flex items-center justify-center text-lg">
                  {getInitials(viewingStaff.full_name)}
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display text-foreground">
                    {viewingStaff.full_name}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">{viewingStaff.employee_id}</span>
                    <span>•</span>
                    <span>{viewingStaff.designation || 'Staff Member'}</span>
                    <span>•</span>
                    <span>{viewingStaff.department || 'Operations'}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generatePDF('employee_record', viewingStaff)}
                  className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-primary/90 active:scale-95 transition-all"
                  title="Download Official Employee Service Record PDF"
                >
                  <Printer className="w-3.5 h-3.5" /> Download Profile PDF
                </button>
                <button 
                  onClick={() => setViewingStaff(null)}
                  className="w-8 h-8 rounded-full hover:bg-muted text-muted-foreground flex items-center justify-center"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Personal Details */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2">
                <h4 className="font-bold text-primary uppercase tracking-wider text-[11px] mb-2">Personal Information</h4>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Father Name:</span><span className="font-semibold">{viewingStaff.father_name || '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">CNIC:</span><span className="font-mono font-semibold">{viewingStaff.cnic || '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Date of Birth:</span><span className="font-semibold">{viewingStaff.dob ? new Date(viewingStaff.dob).toLocaleDateString() : '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Gender / Marital:</span><span className="font-semibold">{viewingStaff.gender || 'Male'} / {viewingStaff.marital_status || 'Single'}</span></div>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Blood Group:</span><span className="font-bold text-destructive">{viewingStaff.blood_group || '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Email:</span><span className="font-semibold">{viewingStaff.email || '—'}</span></div>
                <div className="flex justify-between py-1"><span className="text-muted-foreground">Contact Numbers:</span><span className="font-semibold">{viewingStaff.contact_1} {viewingStaff.contact_2 ? `(${viewingStaff.contact_2})` : ''}</span></div>
              </div>

              {/* Job & Operations */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2">
                <h4 className="font-bold text-primary uppercase tracking-wider text-[11px] mb-2">Job & Operations</h4>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Branch:</span><span className="font-semibold">{viewingStaff.branches?.name || '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Department:</span><span className="font-semibold">{viewingStaff.department || 'Operations'}</span></div>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Employment Type:</span><span className="font-semibold">{viewingStaff.employment_type || 'Full-Time'}</span></div>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Shift Timing:</span><span className="font-semibold">{viewingStaff.shift_timing || 'Morning'}</span></div>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Supervisor:</span><span className="font-semibold">{viewingStaff.reporting_manager || 'Branch Manager'}</span></div>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Joining Date:</span><span className="font-semibold">{viewingStaff.joining_date ? new Date(viewingStaff.joining_date).toLocaleDateString() : '—'}</span></div>
                <div className="flex justify-between py-1"><span className="text-muted-foreground">Status:</span><span className="font-bold uppercase text-emerald-600">{viewingStaff.status}</span></div>
              </div>

              {/* Payroll & Bank */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2">
                <h4 className="font-bold text-primary uppercase tracking-wider text-[11px] mb-2">Payroll & Accounts</h4>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Payment Mode:</span><span className="font-semibold">{viewingStaff.payment_mode || 'Bank Transfer'}</span></div>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Bank Name:</span><span className="font-semibold">{viewingStaff.bank_name || '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Account Title:</span><span className="font-semibold">{viewingStaff.account_title || '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Account/IBAN:</span><span className="font-mono font-semibold">{viewingStaff.account_number || '—'}</span></div>
                {isAdminOrDev && (
                  <>
                    <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Basic Salary:</span><span className="font-bold text-primary">Rs. {Number(viewingStaff.salary).toLocaleString()}</span></div>
                    <div className="flex justify-between py-1"><span className="text-muted-foreground">Monthly Allowances:</span><span className="font-semibold">Rs. {Number(viewingStaff.allowances || 0).toLocaleString()}</span></div>
                  </>
                )}
              </div>

              {/* Emergency Contact */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2">
                <h4 className="font-bold text-primary uppercase tracking-wider text-[11px] mb-2">Emergency Contact</h4>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Contact Person:</span><span className="font-semibold">{viewingStaff.emergency_contact_name || '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Relation:</span><span className="font-semibold">{viewingStaff.emergency_relation || '—'}</span></div>
                <div className="flex justify-between py-1"><span className="text-muted-foreground">Emergency Phone:</span><span className="font-semibold text-destructive">{viewingStaff.emergency_phone || '—'}</span></div>
              </div>
            </div>

            {/* Preserved PDF Documents Bar */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" /> Preserved Official PDF Documents
              </h4>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {viewingStaff.doc_cnic ? (
                  <a href={viewingStaff.doc_cnic} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download CNIC PDF
                  </a>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-medium">CNIC PDF Not Attached</span>
                )}

                {viewingStaff.doc_resume ? (
                  <a href={viewingStaff.doc_resume} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold flex items-center gap-1.5 hover:bg-sky-100 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download CV / Resume PDF
                  </a>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-medium">Resume PDF Not Attached</span>
                )}

                {viewingStaff.doc_appointment ? (
                  <a href={viewingStaff.doc_appointment} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold flex items-center gap-1.5 hover:bg-purple-100 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download Contract PDF
                  </a>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-medium">Contract PDF Not Attached</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Staff Table */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No staff members found.</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different search or register a new employee.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                <th className="text-left px-4 py-3">Employee</th>
                <th className="text-left px-4 py-3">CNIC</th>
                <th className="text-left px-4 py-3">Department & Role</th>
                <th className="text-left px-4 py-3">Contact</th>
                <th className="text-left px-4 py-3">Joining Date</th>
                {isAdminOrDev && <th className="text-left px-4 py-3">Salary</th>}
                <th className="text-left px-4 py-3">PDF Docs</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 shadow-sm">
                        {getInitials(s.full_name)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm leading-tight">{s.full_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono font-bold mt-0.5">{s.employee_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.cnic || "—"}</td>
                  <td className="px-4 py-3">
                    <p className="text-foreground text-xs font-semibold">{s.designation || "—"}</p>
                    <p className="text-[10px] text-primary font-bold uppercase">{s.department || "Operations"} • {s.branches?.name || "Main"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-medium">{s.contact_1 || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.joining_date ? new Date(s.joining_date).toLocaleDateString() : "—"}</td>
                  {isAdminOrDev && (
                    <td className="px-4 py-3 font-bold text-primary text-sm">
                      Rs. {Number(s.salary).toLocaleString()}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {s.doc_cnic && (
                        <a href={s.doc_cnic} target="_blank" rel="noopener noreferrer" className="p-1 rounded bg-muted hover:bg-emerald-100 text-emerald-700" title="CNIC PDF">
                          <FileText className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {s.doc_resume && (
                        <a href={s.doc_resume} target="_blank" rel="noopener noreferrer" className="p-1 rounded bg-muted hover:bg-sky-100 text-sky-700" title="Resume PDF">
                          <FileCheck className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {s.doc_appointment && (
                        <a href={s.doc_appointment} target="_blank" rel="noopener noreferrer" className="p-1 rounded bg-muted hover:bg-purple-100 text-purple-700" title="Contract PDF">
                          <Award className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {!s.doc_cnic && !s.doc_resume && !s.doc_appointment && (
                        <span className="text-[10px] text-muted-foreground/60">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      s.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' :
                      s.status === 'terminated' ? 'bg-destructive/10 text-destructive' :
                      'bg-muted-foreground/10 text-muted-foreground'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center gap-1">
                      <button 
                        onClick={() => setViewingStaff(s)} 
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors" 
                        title="View Full Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => generatePDF('employee_record', s)} 
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" 
                        title="Download Complete Employee Record PDF"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {isAdminOrDev && (
                        <>
                          <button 
                            onClick={() => generateAppointmentLetter(s)} 
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-emerald-600 transition-colors" 
                            title="Download Appointment Letter"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => generateExperienceLetter(s)} 
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-purple-600 transition-colors" 
                            title="Download Experience Letter"
                          >
                            <Award className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {isEditable(s.created_at) ? (
                        <>
                          <button onClick={() => handleEdit(s)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(s.id, s.created_at)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
