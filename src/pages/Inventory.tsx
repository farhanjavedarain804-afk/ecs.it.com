import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Edit2,
  AlertTriangle,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  LayoutGrid,
  MapPin,
  User,
  ArrowDownRight,
  Monitor,
  Calendar,
  X,
  FileText,
  Lock,
  Trash2,
  Wrench
} from "lucide-react";
import { logActivity } from "@/utils/logger";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Layers, TrendingDown, CheckSquare, Tag, FileDown } from "lucide-react";
import { exportTableToPDF } from "@/utils/pdfGenerator";
import { supabase } from "@/integrations/supabase/client";

const Inventory = () => {
  const [items, setItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const { hasRole, user, profile, isDeveloper, session } = useAuth();
  const isAdminOrDev = hasRole("super_admin") || isDeveloper || hasRole("store_manager");
  const [activeTab, setActiveTab] = useState<"list" | "logs">(isAdminOrDev ? "list" : "logs");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const isEditable = (createdAt: string) => {
    if (isAdminOrDev) return true;
    if (!hasRole("branch_admin")) return false;

    // Locked after submission for branch admin per user request
    return false;
  };

  // Item Form state
  const [itemForm, setItemForm] = useState({
    name: "",
    sku: "",
    category: "General",
    unit: "piece",
    quantity: "0",
    min_stock_level: "5",
    unit_price: "0",
    branch_id: "",
    description: "",
    item_type: "inventory"
  });

  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [showCatalogSearch, setShowCatalogSearch] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [manualSelection, setManualSelection] = useState(false);

  // SKU Auto-fill logic
  useEffect(() => {
    const searchCatalog = async () => {
      if (itemForm.sku.length < 3 || editingId || manualSelection) {
        return;
      }

      setIsSearchingCatalog(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("product_id", itemForm.sku)
          .single();

        if (data && !error) {
          setItemForm(prev => ({
            ...prev,
            name: data.name || prev.name,
            category: data.category || prev.category,
            unit: data.unit || prev.unit,
            unit_price: String(data.rate || 0),
            description: data.description || prev.description
          }));
          toast({ title: "Product details auto-filled from catalog" });
        }
      } catch (err) {
        // Silently fail if not found
      } finally {
        setIsSearchingCatalog(false);
      }
    };

    const timer = setTimeout(searchCatalog, 500);
    return () => clearTimeout(timer);
  }, [itemForm.sku, editingId]);

  const fetchCatalog = async () => {
    if (!catalogSearch || catalogSearch.length < 2) {
      setCatalogProducts([]);
      return;
    }
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    try {
      // Products search in backend
      const res = await fetch(`${API_URL}/api/products?query=${encodeURIComponent(catalogSearch)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem("ecs_token")}` }
      });
      const data = await res.json();
      setCatalogProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Catalog Fetch Error:", err);
    }
  };

  useEffect(() => { if (showCatalogSearch) fetchCatalog(); }, [catalogSearch, showCatalogSearch]);

  // Log Form state
  const [logForm, setLogForm] = useState({
    item_id: "",
    branch_id: "",
    staff_id: "",
    entry_type: "issued",
    qty: "",
    date: new Date().toISOString().split("T")[0],
    notes: ""
  });

  const [logCategory, setLogCategory] = useState<"inventory" | "fixed_item">("inventory");

  const fetchData = async () => {
    setLoading(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const isBranchAdminOnly = hasRole("branch_admin") && !isAdminOrDev;
    const branchId = profile?.branch_id;

    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('ecs_token')}` };

      // URLs for backend API
      const itemsUrl = new URL(`${API_URL}/api/inventory_items`);
      const logsUrl = new URL(`${API_URL}/api/inventory_logs`);

      if (isBranchAdminOnly && branchId) {
        itemsUrl.searchParams.append('branch_id', branchId);
        logsUrl.searchParams.append('branch_id', branchId);
      }

      const [invRes, brRes, staffRes, logsRes] = await Promise.all([
        fetch(itemsUrl.toString(), { headers }).then(r => r.json()),
        supabase.from("branches").select("id, name"), // Still using supabase for simple read lists for now, or could move to API
        supabase.from("staff").select("id, full_name, branch_id").eq("status", "active"),
        fetch(logsUrl.toString(), { headers }).then(r => r.json())
      ]);

      const invData = Array.isArray(invRes) ? invRes : [];
      const logsData = Array.isArray(logsRes) ? logsRes : [];

      setItems(invData);
      setBranches(brRes.data || []);
      
      let staffData = staffRes.data || [];
      if (isBranchAdminOnly && branchId) {
        staffData = staffData.filter((s: any) => s.branch_id === branchId);
      }
      setStaff(staffData);
      setLogs(logsData);

      if (isBranchAdminOnly && branchId) {
        setItemForm(prev => ({ ...prev, branch_id: branchId }));
        setLogForm(prev => ({ ...prev, branch_id: branchId }));
      }
    } catch (error: any) {
      console.error("Inventory Fetch Error:", error);
      toast({
        title: "Error Fetching Data",
        description: error.message || "Failed to load inventory records.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name) { toast({ title: "Item name required", variant: "destructive" }); return; }

    const payload = {
      name: itemForm.name,
      sku: itemForm.sku || null,
      category: itemForm.category || null,
      unit: itemForm.unit,
      quantity: parseFloat(itemForm.quantity) || 0,
      min_stock_level: parseFloat(itemForm.min_stock_level) || 0,
      unit_price: parseFloat(itemForm.unit_price) || 0,
      branch_id: itemForm.branch_id || null,
      description: itemForm.description || null,
      item_type: itemForm.item_type || 'inventory'
    };

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const url = editingId 
        ? `${API_URL}/api/inventory_items/${editingId}`
        : `${API_URL}/api/inventory_items`;
      
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("ecs_token")}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save item");
      }

      await logActivity({
        userId: user?.id!,
        userEmail: user?.email!,
        activityType: "INVENTORY_ITEM_ADDED" as any, 
        branchId: itemForm.branch_id,
        metadata: { itemName: itemForm.name, action: editingId ? "UPDATED" : "ADDED" }
      });

      toast({ title: editingId ? "Item updated" : "Item added!" });
      resetItemForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!isAdminOrDev) {
      toast({ title: "Permission denied", description: "Only Super Admins can delete master records.", variant: "destructive" });
      return;
    }
    if (!window.confirm("Are you sure you want to delete this item? This will also remove all its movement logs.")) return;
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/inventory_items/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecs_token')}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete item");
      }

      toast({ title: "Item deleted" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logForm.item_id || !logForm.qty) {
      toast({ title: "Item and quantity required", variant: "destructive" });
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const selectedItem = items.find(i => i.id === logForm.item_id);
      if (logForm.entry_type === 'issued' && selectedItem && selectedItem.quantity < parseFloat(logForm.qty)) {
        toast({ title: "Insufficient Stock", description: `Available: ${selectedItem.quantity} ${selectedItem.unit}`, variant: "destructive" });
        return;
      }

      const res = await fetch(`${API_URL}/api/inventory_logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("ecs_token")}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_id: logForm.item_id,
          branch_id: logForm.branch_id || null,
          staff_id: logForm.staff_id || null,
          entry_type: logForm.entry_type,
          qty: parseFloat(logForm.qty),
          date: new Date(logForm.date).toISOString(),
          notes: logForm.notes
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create log");
      }

      const newLog = await res.json();

      await logActivity({
        userId: user?.id!,
        userEmail: user?.email!,
        activityType: logForm.entry_type === 'issued' ? 'INVENTORY_ISSUED' : 'INVENTORY_RECEIVED',
        branchId: logForm.branch_id,
        metadata: {
          itemId: logForm.item_id,
          qty: logForm.qty,
          notes: logForm.notes
        }
      });

      setLogForm({ ...logForm, qty: "", notes: "" });
      setShowLogForm(false);
      fetchData();
      toast({ title: "Log entry saved!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!isAdminOrDev) {
      toast({ title: "Permission denied", description: "Only Super Admins can delete historical logs.", variant: "destructive" });
      return;
    }
    if (!window.confirm("Are you sure you want to delete this entry? This will reverse the stock change.")) return;
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/inventory_logs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecs_token')}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete log");
      }

      toast({ title: "Entry deleted and stock updated" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetItemForm = () => {
    setShowItemForm(false);
    setEditingId(null);
    const isBranchAdminOnly = hasRole("branch_admin") && !isAdminOrDev;
    setItemForm({
      name: "",
      sku: "",
      category: "General",
      unit: "piece",
      quantity: "0",
      min_stock_level: "5",
      unit_price: "0",
      branch_id: isBranchAdminOnly ? (profile?.branch_id || "") : "",
      description: "",
      item_type: "inventory"
    });
    setManualSelection(false);
  };

  const startEdit = (item: any) => {
    if (!isEditable(item.created_at)) {
      toast({ title: "Edit restricted", description: "Branch admins can only edit inventory items within 2 hours of creation.", variant: "destructive" });
      return;
    }
    setItemForm({
      name: item.name,
      sku: item.sku || "",
      category: item.category || "",
      unit: item.unit,
      quantity: String(item.quantity),
      min_stock_level: String(item.min_stock_level),
      unit_price: String(item.unit_price),
      branch_id: item.branch_id || "",
      description: item.description || "",
      item_type: item.item_type || "inventory"
    });
    setEditingId(item.id);
    setShowItemForm(true);
  };

  const [inventoryTab, setInventoryTab] = useState<"inventory" | "fixed_item">("inventory");

  // Re-filtering logic based on new tabs
  const displayItems = items.filter(item => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(search.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = item.item_type === inventoryTab;
    return matchesSearch && matchesCategory;
  });

  const displayLogs = logs.filter(log => {
    const itemName = log.inventory_items?.name || "";
    const itemSku = log.inventory_items?.sku || "";
    const branchName = log.branches?.name || "";
    const matchesSearch = !search ||
      itemName.toLowerCase().includes(search.toLowerCase()) ||
      itemSku.toLowerCase().includes(search.toLowerCase()) ||
      branchName.toLowerCase().includes(search.toLowerCase());

    // Check item type from the joined inventory_items
    const matchesCategory = log.inventory_items?.item_type === inventoryTab;
    return matchesSearch && matchesCategory;
  });

  const lowStock = items.filter((i) => i.quantity <= i.min_stock_level);

  const inStock = items.filter((i) => i.quantity > i.min_stock_level);
  const totalCategories = new Set(items.filter(i => i.category).map(i => i.category)).size;

  const handleDownloadReport = () => {
    const headers = ["Name", "SKU", "Category", "Unit", "Stock", "Price", "Branch"];
    const rows = displayItems.map(i => [
      i.name || "—",
      i.sku || "—",
      i.category || "—",
      i.unit || "—",
      i.quantity?.toString() || "0",
      i.unit_price?.toLocaleString() || "0",
      i.branches?.name || "Global"
    ]);
    exportTableToPDF(`${inventoryTab.replace('_', ' ').toUpperCase()} Report`, headers, rows, "inventory_report");
  };

  const inputCls = "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";
  const labelCls = "text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1 mb-1.5 block";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Inventory Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{items.length} items across {branches.length} branches</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadReport} className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted shadow-sm active:scale-95 transition-all">
            <FileDown className="w-4 h-4" /> Download Report
          </button>
          {isAdminOrDev && (
            <button
              onClick={() => { resetItemForm(); setShowItemForm(true); }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          )}
          <button
            onClick={() => setShowLogForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90 shadow-sm active:scale-95 transition-all"
          >
            <History className="w-4 h-4" /> Movement Entry
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Layers className="w-4 h-4 text-primary" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Items</p><p className="text-2xl font-bold text-foreground mt-0.5">{items.length}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><TrendingDown className="w-4 h-4 text-destructive" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Low Stock</p><p className="text-2xl font-bold text-foreground mt-0.5">{lowStock.length}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-success/10"><CheckSquare className="w-4 h-4 text-success" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">In Stock</p><p className="text-2xl font-bold text-foreground mt-0.5">{inStock.length}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/10"><Tag className="w-4 h-4 text-warning" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Categories</p><p className="text-2xl font-bold text-foreground mt-0.5">{totalCategories}</p></div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-border pb-px overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("list")}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === "list" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <LayoutGrid className="w-4 h-4" /> Stock Status
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === "logs" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <History className="w-4 h-4" /> Recent History
        </button>
      </div>

      {lowStock.length > 0 && activeTab === "list" && (
        <div className="rounded-[2rem] border border-orange-200 bg-orange-50/50 p-5 flex items-start gap-4">
          <div className="h-10 w-10 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-orange-800">Low Stock Warning</p>
            <p className="text-xs text-orange-700 mt-1 leading-relaxed">
              The following items are running low: <span className="font-bold">{lowStock.map((i) => i.name).join(", ")}</span>. Please consider restock.
            </p>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items, SKU, or descriptions..."
          className="w-full rounded-2xl border border-input bg-card pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-primary/10 shadow-sm transition-all"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20 px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Synchronizing inventory cache...</p>
          </div>
        </div>
      ) : activeTab === "list" ? (
        <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
          <div className="flex gap-4 border-b border-border pb-px overflow-x-auto no-scrollbar">
            <button onClick={() => setInventoryTab("inventory")} className={`px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${inventoryTab === 'inventory' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Inventory (Consumable)</button>
            <button onClick={() => setInventoryTab("fixed_item")} className={`px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${inventoryTab === 'fixed_item' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Fixed Assets / Tools</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Item Details</th>
                  <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Category</th>
                  <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Price</th>
                  <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Stock</th>
                  <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Min Level</th>
                  <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Branch</th>
                  <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Status</th>
                  <th className="text-right font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayItems.length === 0 ? (
                  <tr><td colSpan={8} className="py-20 text-center text-muted-foreground font-medium">No {inventoryTab === 'inventory' ? 'inventory' : 'fixed assets'} found.</td></tr>
                ) : displayItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/5 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-base tracking-tight">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground font-bold tracking-widest flex items-center gap-1.5 uppercase mt-0.5">
                            {item.sku || "NO SKU"} {item.description && <span className="normal-case font-medium lowercase truncate max-w-[120px]">· {item.description}</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 rounded-full bg-muted text-[10px] font-bold text-muted-foreground uppercase">{item.category}</span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-foreground font-bold font-mono">Rs. {Number(item.unit_price).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-foreground">{Number(item.quantity)}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.unit}s</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-muted-foreground font-bold font-mono">{Number(item.min_stock_level || 0)}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{item.branches?.name || "Global"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${Number(item.quantity) <= Number(item.min_stock_level) ? "bg-orange-100 text-orange-700" : "bg-success/10 text-success"}`}>
                        {Number(item.quantity) <= Number(item.min_stock_level) ? "⚠️ Critical" : "✅ Optimal"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {isEditable(item.created_at) ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(item)} className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-colors" title="Edit Item"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors" title="Delete Item"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ) : (
                    <div className="flex justify-end items-center gap-2">
                      <button 
                        onClick={() => {
                          setItemForm({
                            name: item.name,
                            sku: item.sku || "",
                            category: item.category || "",
                            unit: item.unit,
                            quantity: String(item.quantity),
                            min_stock_level: String(item.min_stock_level),
                            unit_price: String(item.unit_price),
                            branch_id: item.branch_id || "",
                            description: item.description || "",
                            item_type: item.item_type || "inventory"
                          });
                          setEditingId(item.id);
                          setShowItemForm(true);
                        }} 
                        className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors" 
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <div className="p-2 text-muted-foreground/30" title="Locked">
                        <Lock className="w-4 h-4" />
                      </div>
                    </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex gap-4 border-b border-border pb-px overflow-x-auto no-scrollbar">
            <button onClick={() => setInventoryTab("inventory")} className={`px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${inventoryTab === 'inventory' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Inventory Log</button>
            <button onClick={() => setInventoryTab("fixed_item")} className={`px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${inventoryTab === 'fixed_item' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Fixed Assets Log</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Type</th>
                  <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Item</th>
                  <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Quantity</th>
                  <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Handler</th>
                  <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Branch</th>
                  <th className="text-left font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Timestamp</th>
                  <th className="text-right font-bold text-muted-foreground px-6 py-5 uppercase tracking-wider text-[10px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayLogs.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center text-muted-foreground font-medium">No {inventoryTab === 'inventory' ? 'inventory' : 'fixed assets'} movement found.</td></tr>
                ) : displayLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-5">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-tighter shadow-sm ${log.entry_type === 'issued' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                        {log.entry_type === 'issued' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        {log.entry_type}
                      </div>
                    </td>
                    <td className="px-6 py-5 font-bold text-foreground">{log.inventory_items?.name}</td>
                    <td className="px-6 py-5">
                      <p className={`text-lg font-black ${log.entry_type === 'issued' ? 'text-destructive' : 'text-success'}`}>
                        {log.entry_type === 'issued' ? '-' : '+'}{Number(log.qty)}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold uppercase">{log.staff?.full_name?.charAt(0)}</div>
                        <span className="font-semibold text-foreground italic">{log.staff?.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-medium text-muted-foreground uppercase text-[10px] tracking-widest">{log.branches?.name || "Global"}</td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-medium text-foreground">{format(new Date(log.date), "MMM dd, yyyy")}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(log.date), "hh:mm a")}</p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {isEditable(log.created_at) ? (
                        <button onClick={() => handleDeleteLog(log.id)} className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors" title="Delete Entry"><Trash2 className="w-4 h-4" /></button>
                      ) : (
                        <div className="p-2 text-muted-foreground/30 flex justify-end">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Item Modal Form */}
      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-[2.5rem] bg-card border border-border p-8 shadow-elevated animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black font-display text-card-foreground tracking-tight">{editingId ? "Update" : "Add New"} Inventory Item</h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Master record configuration</p>
                </div>
              </div>
              <button onClick={resetItemForm} className="p-2 rounded-full hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowCatalogSearch(!showCatalogSearch)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-primary italic">Quick Search Master Catalog...</span>
                </div>
                <ArrowDownRight className={`w-4 h-4 text-primary transition-transform ${showCatalogSearch ? "rotate-90" : ""}`} />
              </button>

              {showCatalogSearch && (
                <div className="mt-3 p-4 rounded-2xl border border-border bg-muted/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <input
                    autoFocus
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search product by name or SKU..."
                    className={inputCls + " bg-card"}
                  />
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {catalogProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setItemForm(prev => ({
                            ...prev,
                            name: p.name,
                            sku: p.product_id,
                            category: p.category || "General",
                            unit: p.unit || "piece",
                            unit_price: String(p.rate || 0),
                            description: p.description || "",
                            quantity: String(p.quantity || 0),
                            min_stock_level: String(p.min_stock_level || 5)
                          }));
                          setManualSelection(true);
                          setShowCatalogSearch(false);
                          setCatalogSearch("");
                          toast({ title: "Catalog item selected" });
                        }}
                        className="w-full text-left p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all flex justify-between items-center group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                            <Package className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground leading-tight">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-wider">{p.product_id}</span>
                              <span className="text-[10px] text-muted-foreground italic font-medium">· Stock: {p.quantity || 0} {p.unit || 'piece'}s</span>
                            </div>
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                    {catalogProducts.length === 0 && catalogSearch.length > 0 && (
                      <p className="text-center py-4 text-xs font-medium text-muted-foreground italic">No matching products in catalog</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleItemSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className={labelCls}>Name *</label><input required disabled={!isAdminOrDev} value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} className={inputCls} placeholder="e.g. Compressor 1.5T" /></div>
                <div>
                  <label className={labelCls}>SKU Code {isSearchingCatalog && <span className="text-[10px] text-primary animate-pulse ml-2 lowercase">Searching...</span>}</label>
                  <input disabled={!isAdminOrDev} value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} className={inputCls} placeholder="COMP-001" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div><label className={labelCls}>Category</label><input disabled={!isAdminOrDev} value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>Unit</label>
                  <select disabled={!isAdminOrDev} value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} className={inputCls}>
                    <option value="piece">Piece</option><option value="kg">KG</option><option value="meter">Meter</option><option value="liter">Liter</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>Current Qty</label><input disabled={!isAdminOrDev} type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>Min Level</label><input disabled={!isAdminOrDev} type="number" value={itemForm.min_stock_level} onChange={(e) => setItemForm({ ...itemForm, min_stock_level: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>Unit Price</label><input disabled={!isAdminOrDev} type="number" step="0.01" value={itemForm.unit_price} onChange={(e) => setItemForm({ ...itemForm, unit_price: e.target.value })} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className={labelCls}>Branch Location</label>
                  <select
                    disabled={!isAdminOrDev || editingId !== null}
                    value={itemForm.branch_id}
                    onChange={(e) => setItemForm({ ...itemForm, branch_id: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Select Branch</option>
                    {isAdminOrDev && <option value="all" className="font-bold text-primary italic">ADD TO ALL BRANCHES</option>}
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Description</label><input disabled={!isAdminOrDev} value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} className={inputCls} placeholder="Brief details..." /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Item Type</label>
                  <select
                    disabled={!isAdminOrDev}
                    value={itemForm.item_type}
                    onChange={(e) => setItemForm({ ...itemForm, item_type: e.target.value as any })}
                    className={inputCls}
                  >
                    <option value="inventory">Consumable Inventory</option>
                    <option value="fixed_item">Fixed Asset / Tool</option>
                  </select>
                </div>
              </div>
              {isAdminOrDev && (
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-primary py-4 text-sm font-black text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-4 uppercase tracking-widest"
                >
                  {editingId ? "Update Master Record" : "Register Item"}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Log Entry Modal Form */}
      {showLogForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-[2.5rem] bg-card border border-border p-8 shadow-elevated animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black font-display text-card-foreground tracking-tight">
                    {logCategory === 'inventory' ? 'Consumable' : 'Fixed Asset'} Entry
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Movement & tracking log</p>
                </div>
              </div>
              <button onClick={() => setShowLogForm(false)} className="p-2 rounded-full hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-6">
              <div className="flex bg-muted p-1 rounded-2xl mb-2">
                <button
                  type="button"
                  onClick={() => { setLogCategory("inventory"); setLogForm({ ...logForm, item_id: "" }); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase rounded-xl transition-all ${logCategory === 'inventory' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Package className="w-4 h-4" /> Consumable Items
                </button>
                <button
                  type="button"
                  onClick={() => { setLogCategory("fixed_item"); setLogForm({ ...logForm, item_id: "" }); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase rounded-xl transition-all ${logCategory === 'fixed_item' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Wrench className="w-4 h-4" /> Fixed Assets / Tools
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className={labelCls}>Movement Type</label>
                  <div className="flex bg-muted p-1 rounded-xl">
                    <button type="button" onClick={() => setLogForm({ ...logForm, entry_type: "issued" })} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${logForm.entry_type === 'issued' ? 'bg-card text-destructive shadow-sm' : 'text-muted-foreground'}`}>
                      <ArrowUpRight className="w-3.5 h-3.5" /> {logCategory === 'inventory' ? 'Issued' : 'Assigned Out'}
                    </button>
                    <button type="button" onClick={() => setLogForm({ ...logForm, entry_type: "received" })} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${logForm.entry_type === 'received' ? 'bg-card text-success shadow-sm' : 'text-muted-foreground'}`}>
                      <ArrowDownLeft className="w-3.5 h-3.5" /> {logCategory === 'inventory' ? 'Received' : 'Returned In'}
                    </button>
                  </div>
                </div>
                <div><label className={labelCls}>{logCategory === 'inventory' ? 'Inventory' : 'Tool'} Selection</label>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select required value={logForm.item_id} onChange={(e) => setLogForm({ ...logForm, item_id: e.target.value })} className={inputCls + " pl-12 cursor-pointer"}>
                      <option value="">Select {logCategory === 'inventory' ? 'Item' : 'Fixed Asset'}</option>
                      {items.filter(i => i.item_type === logCategory).map((i) => (
                        <option key={i.id} value={i.id}>{i.name} (QTY: {i.quantity})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className={labelCls}>Branch Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      required
                      value={logForm.branch_id}
                      onChange={(e) => setLogForm({ ...logForm, branch_id: e.target.value })}
                      className={inputCls + " pl-12 cursor-pointer"}
                      disabled={hasRole("branch_admin") && !hasRole("super_admin") && !hasRole("store_manager")}
                    >
                      <option value="">Select Branch</option>
                      {branches
                        .filter(b => !hasRole("branch_admin") || hasRole("super_admin") || b.id === profile?.branch_id)
                        .map((b) => <option key={b.id} value={b.id}>{b.name}</option>)
                      }
                    </select>
                  </div>
                </div>
                <div><label className={labelCls}>Technician / Staff</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select value={logForm.staff_id} onChange={(e) => setLogForm({ ...logForm, staff_id: e.target.value })} className={inputCls + " pl-12 cursor-pointer"}>
                      <option value="">Select Personnel</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div><label className={labelCls}>Quantity</label><input required type="number" value={logForm.qty} onChange={(e) => setLogForm({ ...logForm, qty: e.target.value })} className={inputCls} placeholder="0.00" /></div>
                <div><label className={labelCls}>Effective Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="date" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} className={inputCls + " pl-12"} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Internal Notes</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 w-4 h-4 text-muted-foreground" />
                  <textarea rows={2} value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} className={inputCls + " pl-12 pt-4 resize-none"} placeholder="Purpose of movement (e.g. Complaint #1024 repair)..." />
                </div>
              </div>

              <button
                type="submit"
                className={`w-full rounded-2xl py-4 text-sm font-black text-white hover:opacity-90 shadow-lg transition-all active:scale-[0.98] mt-2 uppercase tracking-widest ${logForm.entry_type === 'issued' ? 'bg-destructive shadow-destructive/20' : 'bg-success shadow-success/20'}`}
              >
                Confirm {logForm.entry_type} Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

