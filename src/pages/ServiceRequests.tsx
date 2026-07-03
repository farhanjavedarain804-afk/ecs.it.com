import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Search, Loader2, Phone, Mail, CheckCircle2, XCircle, Trash2, Edit2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  contacted: "bg-blue-100 text-blue-700",
  converted_to_complaint: "bg-emerald-100 text-emerald-700",
  rejected: "bg-destructive/10 text-destructive",
};

const ServiceRequests = () => {
  const { hasRole } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? '';
      const res = await fetch(`${API_URL}/api/service_requests`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("ecs_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      toast({ title: "Error", description: "Could not load service requests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? '';
      const res = await fetch(`${API_URL}/api/service_requests/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("ecs_token")}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast({ title: "Success", description: "Status updated successfully." });
      fetchRequests();
    } catch (err) {
      toast({ title: "Error", description: "Update failed", variant: "destructive" });
    }
  };

  const deleteRequest = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this service request?")) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? '';
      const res = await fetch(`${API_URL}/api/service_requests/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("ecs_token")}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Success", description: "Service request deleted." });
      fetchRequests();
    } catch (err) {
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    }
  };

  const filtered = requests.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.phone.includes(search) ||
    r.city_branch.toLowerCase().includes(search.toLowerCase()) ||
    r.service_required.toLowerCase().includes(search.toLowerCase())
  );

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
                      {format(new Date(req.created_at), "dd MMM, yyyy")}
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
                        {req.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          className="text-xs bg-background border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                          value={req.status}
                          onChange={(e) => updateStatus(req.id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="contacted">Contacted</option>
                          <option value="converted_to_complaint">Converted</option>
                          <option value="rejected">Rejected</option>
                        </select>
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
    </div>
  );
};

export default ServiceRequests;
