import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, Plus, Star, MessageSquare, Trash2, Edit2, 
  CheckCircle2, AlertTriangle, FileText, Download, X,
  Building2, User, Phone, Calendar, Loader2, Eye
} from "lucide-react";
import { exportTableToPDF } from "@/utils/pdfGenerator";
import { logActivity } from "@/utils/logger";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CustomerReviews = () => {
  const { user, profile, hasRole, isDeveloper } = useAuth();
  const { toast } = useToast();
  const isPrivileged = isDeveloper || hasRole('super_admin');
  
  const [reviews, setReviews] = useState<any[]>([]);
  const [solvedComplaints, setSolvedComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingReview, setViewingReview] = useState<any | null>(null);

  // Form State
  const [form, setForm] = useState({
    complaint_id: "",
    q1_rating: 0,
    q2_rating: 0,
    q3_rating: 0,
    q4_rating: 0,
    q5_rating: 0,
    refused_ratings: false,
    note: ""
  });
  const [complaintSearch, setComplaintSearch] = useState("");

  const questions = [
    { key: "q1_rating", label: "Did our team contact you on time?" },
    { key: "q2_rating", label: "How was the technician’s behavior?" },
    { key: "q3_rating", label: "Was the technician in uniform?" },
    { key: "q4_rating", label: "Was the technician’s working style professional?" },
    { key: "q5_rating", label: "How much payment did he take from you, and did he provide a bill?" }
  ];

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem('ecs_token');
      const res = await fetch(`${API_URL}/api/reviews`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Fetch Reviews Error:", err);
    }
  };

  const fetchSolvedComplaints = async () => {
    try {
      const token = localStorage.getItem('ecs_token');
      // We only want 'solved' complaints that don't have reviews yet
      const res = await fetch(`${API_URL}/api/complaints?status=solved`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const existingReviewComplaintIds = reviews.map(r => r.complaint_id);
        const available = Array.isArray(data) ? data.filter(c => !existingReviewComplaintIds.includes(c.id)) : [];
        setSolvedComplaints(available);
      }
    } catch (err) {
      console.error("Fetch Complaints Error:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await fetchReviews();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showModal && !editingId) {
      fetchSolvedComplaints();
    }
  }, [showModal, editingId, reviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.complaint_id && !editingId) {
      toast({ title: "Please select a complaint", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('ecs_token');
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId ? `${API_URL}/api/reviews/${editingId}` : `${API_URL}/api/reviews`;
      
      // If adding new, find details for auditing
      const selectedComplaint = solvedComplaints.find(c => c.id === form.complaint_id);
      
      const payload = {
        ...form,
        customer_id: selectedComplaint?.customer_id,
        branch_id: selectedComplaint?.branch_id
      };

      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast({ title: editingId ? "Review updated" : "Review submitted" });
        setShowModal(false);
        resetForm();
        loadData();

        if (user && !editingId && selectedComplaint) {
          await logActivity({
            userId: user.id,
            userEmail: user.email,
            activityType: "CUSTOMER_REVIEW_SUBMITTED",
            branchId: selectedComplaint.branch_id,
            metadata: { 
              complaintId: selectedComplaint.id, 
              complaintNumber: selectedComplaint.complaint_number,
              ratings: form 
            }
          });
        }
      } else {
        const err = await res.json();
        toast({ title: err.error || "Submission failed", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Server error", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      const token = localStorage.getItem('ecs_token');
      const res = await fetch(`${API_URL}/api/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: "Review deleted" });
        loadData();
      }
    } catch (err) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const startEdit = (review: any) => {
    setForm({
      complaint_id: review.complaint_id,
      q1_rating: review.q1_rating,
      q2_rating: review.q2_rating,
      q3_rating: review.q3_rating,
      q4_rating: review.q4_rating,
      q5_rating: review.q5_rating,
      refused_ratings: !!review.refused_ratings,
      note: review.note || ""
    });
    setEditingId(review.id);
    setShowModal(true);
  };

  const resetForm = () => {
    setForm({
      complaint_id: "",
      q1_rating: 0,
      q2_rating: 0,
      q3_rating: 0,
      q4_rating: 0,
      q5_rating: 0,
      refused_ratings: false,
      note: ""
    });
    setEditingId(null);
  };

  const filteredReviews = reviews.filter(r => 
    r.complaint_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.customer_phone?.toLowerCase().includes(search.toLowerCase()) ||
    r.note?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    const total = reviews.length;
    const refused = reviews.filter(r => r.refused_ratings).length;
    const rated = reviews.filter(r => !r.refused_ratings);
    let avg = 0;
    if (rated.length > 0) {
      const sum = rated.reduce((acc, r) => acc + (Math.max(0, r.q1_rating) + Math.max(0, r.q2_rating) + Math.max(0, r.q3_rating) + Math.max(0, r.q4_rating) + Math.max(0, r.q5_rating)) / 5, 0);
      avg = sum / rated.length;
    }
    return {
      total,
      avg: avg.toFixed(1),
      refused,
      pending: solvedComplaints.length
    };
  }, [reviews, solvedComplaints]);

  const branchStats = useMemo(() => {
    if (!isPrivileged) return [];
    const branches: Record<string, { total: number, sum: number, name: string }> = {};
    reviews.forEach(r => {
      if (r.refused_ratings) return;
      const bId = r.branch_id;
      if (!branches[bId]) branches[bId] = { total: 0, sum: 0, name: r.branch_name };
      branches[bId].total += 1;
      const avg_q = (Math.max(0, r.q1_rating) + Math.max(0, r.q2_rating) + Math.max(0, r.q3_rating) + Math.max(0, r.q4_rating) + Math.max(0, r.q5_rating)) / 5;
      branches[bId].sum += avg_q;
    });
    return Object.values(branches).map(b => ({
      name: b.name,
      avg: (b.sum / b.total).toFixed(1)
    })).sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
  }, [reviews, isPrivileged]);

  const renderStars = (rating: number, interactive = false, questionKey?: string) => {
    const isRedActive = rating === -1;
    const isGreenActive = rating > 0;

    return (
      <div className="flex flex-col gap-3">
        {/* Red Star Section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap min-w-[70px]">Dissatisfied:</span>
            <Star 
              className={`w-6 h-6 ${isRedActive ? 'text-red-500 fill-current' : 'text-muted-foreground/30'} ${interactive && !isGreenActive ? 'cursor-pointer hover:scale-110' : ''} ${isGreenActive ? 'opacity-20 cursor-not-allowed' : ''} transition-all`}
              onClick={() => {
                if (!interactive || isGreenActive) return;
                if (!questionKey) return;
                setForm({ ...form, [questionKey]: isRedActive ? 0 : -1 });
              }}
            />
          </div>
          {isRedActive && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full ring-1 ring-red-100">-1 / 5</span>}
        </div>

        {/* Green Stars Section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest min-w-[70px]">Satisfied:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= rating;
                const isLocked = isRedActive;
                
                return (
                  <Star 
                    key={star} 
                    className={`w-5 h-5 ${isActive ? 'text-emerald-500 fill-current' : 'text-muted-foreground/30'} ${interactive && !isLocked ? 'cursor-pointer hover:scale-110' : ''} ${isLocked ? 'opacity-20 cursor-not-allowed' : ''} transition-all`}
                    onClick={() => {
                      if (!interactive || isLocked) return;
                      if (!questionKey) return;
                      const newRating = (rating === star) ? 0 : star;
                      setForm({ ...form, [questionKey]: newRating });
                    }}
                  />
                );
              })}
            </div>
          </div>
          {isGreenActive && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-100">{rating} / 5</span>}
        </div>
      </div>
    );
  };

  const downloadReport = () => {
    const headers = ["Complaint #", "Customer", "Branch", "Avg Rating", "Date"];
    const rows = filteredReviews.map(r => [
      r.complaint_number,
      r.customer_name,
      r.branch_name,
      r.refused_ratings ? "Refused" : ((r.q1_rating + r.q2_rating + r.q3_rating + r.q4_rating + r.q5_rating) / 5).toFixed(1),
      new Date(r.created_at).toLocaleDateString()
    ]);
    exportTableToPDF("Customer Feedback Report", headers, rows, "customer_reviews");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Customer Reviews</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Collect and analyze service feedback from clients.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadReport} className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted shadow-sm transition-all active:scale-95">
            <Download className="w-4 h-4" /> Download Report
          </button>
          {isPrivileged && (
            <button onClick={() => { resetForm(); setShowModal(true); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95">
              <Plus className="w-4 h-4" /> Add Review
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><MessageSquare className="w-4 h-4 text-primary" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Feedback</p><p className="text-2xl font-bold text-foreground mt-0.5">{stats.total}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-100"><Star className="w-4 h-4 text-emerald-600" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Avg Satisfaction</p><p className="text-2xl font-bold text-foreground mt-0.5">{stats.avg}<span className="text-sm text-muted-foreground ml-1">/ 5</span></p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-100"><X className="w-4 h-4 text-red-600" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Refused Ratings</p><p className="text-2xl font-bold text-foreground mt-0.5">{stats.refused}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100"><AlertTriangle className="w-4 h-4 text-amber-600" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending Reviews</p><p className="text-2xl font-bold text-foreground mt-0.5">{stats.pending}</p></div>
        </div>
      </div>

      {isPrivileged && branchStats.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Branch-wise Performance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {branchStats.map(bs => (
              <div key={bs.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                <span className="text-sm font-semibold text-foreground truncate">{bs.name}</span>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs ring-1 ring-emerald-100">
                  <Star className="w-3 h-3 fill-current" />
                  {bs.avg}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search by complaint #, customer name, or keywords..." 
            className="w-full rounded-xl border border-input bg-card pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm" 
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left font-bold text-muted-foreground px-6 py-4 uppercase tracking-wider text-[10px]">Complaint / Customer</th>
                <th className="text-left font-bold text-muted-foreground px-6 py-4 uppercase tracking-wider text-[10px]">Branch</th>
                <th className="text-left font-bold text-muted-foreground px-6 py-4 uppercase tracking-wider text-[10px]">Satisfaction</th>
                <th className="text-left font-bold text-muted-foreground px-6 py-4 uppercase tracking-wider text-[10px]">Note</th>
                <th className="text-left font-bold text-muted-foreground px-6 py-4 uppercase tracking-wider text-[10px]">Date</th>
                <th className="text-right font-bold text-muted-foreground px-6 py-4 uppercase tracking-wider text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
              ) : filteredReviews.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-muted-foreground italic font-medium">No reviews found. Click "Add Review" to record feedback.</td></tr>
              ) : filteredReviews.map((r: any) => {
                const avgRating = (r.q1_rating + r.q2_rating + r.q3_rating + r.q4_rating + r.q5_rating) / 5;
                return (
                  <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        {r.complaint_number}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <User className="w-3 h-3" />
                        {r.customer_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        {r.branch_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {r.refused_ratings ? (
                        <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-tighter">Ratings Refused</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <span className="text-sm font-black text-foreground tabular-nums">{avgRating.toFixed(1)} <span className="text-[10px] text-muted-foreground font-bold">/ 5.0</span></span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-[300px]">
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.note || "—"}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewingReview(r)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {isPrivileged && (
                          <>
                            <button onClick={() => startEdit(r)} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Edit Review">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Delete Review">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl bg-card border border-border shadow-elevated p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold font-display text-card-foreground">{editingId ? "Update Review" : "Record Client Feedback"}</h3>
                <p className="text-sm text-muted-foreground">Select a solved complaint and record customer ratings.</p>
              </div>
              <button 
                onClick={() => { setShowModal(false); resetForm(); }} 
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {!editingId && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Search & Select Solved Complaint *</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        value={complaintSearch}
                        onChange={(e) => setComplaintSearch(e.target.value)}
                        placeholder="Search by Complaint #, Name, or Phone..."
                        className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="max-h-[200px] overflow-y-auto rounded-xl border border-border bg-muted/20 p-2 space-y-1">
                    {solvedComplaints.filter(c => 
                      c.complaint_number?.toLowerCase().includes(complaintSearch.toLowerCase()) ||
                      c.customers?.name?.toLowerCase().includes(complaintSearch.toLowerCase()) ||
                      c.customers?.phone?.toLowerCase().includes(complaintSearch.toLowerCase())
                    ).length > 0 ? (
                      solvedComplaints.filter(c => 
                        c.complaint_number?.toLowerCase().includes(complaintSearch.toLowerCase()) ||
                        c.customers?.name?.toLowerCase().includes(complaintSearch.toLowerCase()) ||
                        c.customers?.phone?.toLowerCase().includes(complaintSearch.toLowerCase())
                      ).map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => setForm({ ...form, complaint_id: c.id })}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${form.complaint_id === c.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted bg-card'}`}
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{c.complaint_number}</span>
                            <span className="text-[10px] opacity-80">{c.customers?.name} • {c.customers?.phone}</span>
                          </div>
                          <div className="text-[10px] font-bold uppercase">{c.branches?.name}</div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-muted-foreground italic">No matching complaints found.</div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-6 bg-muted/20 p-6 rounded-2xl border border-border">
                <div className="flex items-center justify-between">
                   <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Service Questionnaire</h4>
                   <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={form.refused_ratings} 
                        onChange={(e) => setForm({ ...form, refused_ratings: e.target.checked })} 
                        className="w-4 h-4 rounded border-input text-primary focus:ring-primary/20 cursor-pointer" 
                      />
                      <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">Client refused to give ratings</span>
                   </label>
                </div>

                {!form.refused_ratings ? (
                  <div className="space-y-6">
                    {questions.map((q) => (
                      <div key={q.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                        <span className="text-sm font-medium text-foreground leading-tight flex-1">{q.label}</span>
                        {renderStars((form as any)[q.key], true, q.key)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center bg-card/50 rounded-xl border border-dashed border-border">
                    <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground italic">Submit review with note only. Ratings are disabled.</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Additional Notes</label>
                <textarea 
                  value={form.note} 
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Record any special comments or feedback from the customer..."
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px] shadow-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-4 rounded-xl border border-input bg-background text-sm font-bold text-foreground hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-[2] px-4 py-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {editingId ? "Update Feedback" : "Save & Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* View Review Modal */}
      {viewingReview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-2xl rounded-[2.5rem] bg-card border border-border shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary"><FileText className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-2xl font-black font-display text-card-foreground tracking-tight">Review Details</h3>
                  <p className="text-sm text-muted-foreground font-medium">Complaint: {viewingReview.complaint_number}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingReview(null)} 
                className="p-2 rounded-2xl hover:bg-muted text-muted-foreground transition-all active:scale-95"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              <div className="p-5 rounded-[1.5rem] bg-muted/30 border border-border">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Customer</p>
                <p className="text-sm font-bold text-foreground">{viewingReview.customer_name}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{viewingReview.customer_phone}</p>
              </div>
              <div className="p-5 rounded-[1.5rem] bg-muted/30 border border-border">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Branch</p>
                <p className="text-sm font-bold text-foreground">{viewingReview.branch_name}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Reported on {new Date(viewingReview.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="space-y-6 mb-10">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Questionnaire Response</h4>
              {viewingReview.refused_ratings ? (
                <div className="py-12 text-center bg-muted/20 rounded-[2rem] border border-dashed border-border">
                  <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground font-bold italic tracking-tight">Customer opted not to provide ratings for this service.</p>
                </div>
              ) : (
                <div className="space-y-8 p-8 rounded-[2rem] bg-muted/20 border border-border/50">
                  {questions.map((q) => (
                    <div key={q.key} className="flex flex-col gap-3">
                      <p className="text-sm font-bold text-foreground leading-snug">{q.label}</p>
                      <div className="flex items-center justify-between">
                         <div className="scale-90 origin-left">
                            {renderStars(viewingReview[q.key])}
                         </div>
                         <div className={`px-4 py-1.5 rounded-xl font-black text-xs ring-1 ${viewingReview[q.key] === -1 ? 'bg-red-50 text-red-600 ring-red-100' : 'bg-emerald-50 text-emerald-600 ring-emerald-100'}`}>
                            {viewingReview[q.key] === -1 ? "-1 / 5" : `${viewingReview[q.key]} / 5`}
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 mb-8">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Additional Observations</h4>
              <div className="p-6 rounded-[1.5rem] bg-card border border-border shadow-inner min-h-[100px]">
                <p className="text-sm text-muted-foreground font-medium leading-relaxed whitespace-pre-wrap">{viewingReview.note || "No specific feedback was recorded in the notes section."}</p>
              </div>
            </div>

            <button 
              onClick={() => setViewingReview(null)}
              className="w-full py-5 rounded-[1.5rem] bg-muted font-black text-sm text-foreground hover:bg-muted/80 transition-all active:scale-[0.98]"
            >
              Close View
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerReviews;
