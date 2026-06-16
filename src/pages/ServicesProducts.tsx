import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Edit2, Trash2, Wrench, Package, BarChart2, DollarSign, Lock, FileDown } from "lucide-react";
import { exportTableToPDF } from "@/utils/pdfGenerator";

const ServicesProducts = () => {
  const [tab, setTab] = useState<"services" | "products">("services");
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { hasRole, isDeveloper } = useAuth();
  const isSuperAdmin = hasRole("super_admin") || isDeveloper;

  const emptyServiceForm = { name: "", description: "", rate: "", category: "" };
  const emptyProductForm = { product_id: "", name: "", description: "", rate: "", category: "", unit: "piece", quantity: "0", min_stock_level: "0" };
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [productForm, setProductForm] = useState(emptyProductForm);

  const fetchAll = async () => {
    const [s, p, inv] = await Promise.all([
      supabase.from("services").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("inventory_items").select("sku, quantity"),
    ]);

    // Aggregate branch stock for Super Admin
    if (isSuperAdmin) {
      const stockMap: Record<string, number> = {};
      inv.data?.forEach(i => {
        if (i.sku) stockMap[i.sku] = (stockMap[i.sku] || 0) + (i.quantity || 0);
      });

      const enhancedProducts = (p.data || []).map((prod: any) => ({
        ...prod,
        branch_stock: Number(stockMap[prod.product_id] || 0),
        total_stock: Number(prod.quantity || 0) + Number(stockMap[prod.product_id] || 0)
      }));
      setProducts(enhancedProducts);
    } else {
      setProducts(p.data || []);
    }

    setServices(s.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSubmitService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (!serviceForm.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    const payload = { name: serviceForm.name, description: serviceForm.description || null, rate: parseFloat(serviceForm.rate) || 0, category: serviceForm.category || null };
    if (editingId) {
      const { error } = await supabase.from("services").update(payload).eq("id", editingId);
      if (error) { toast({ title: error.message, variant: "destructive" }); return; }
      toast({ title: "Service updated!" });
    } else {
      const { error } = await supabase.from("services").insert(payload);
      if (error) { toast({ title: error.message, variant: "destructive" }); return; }
      toast({ title: "Service added!" });
    }
    setShowForm(false); setEditingId(null); setServiceForm(emptyServiceForm); fetchAll();
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (!productForm.name || !productForm.product_id) { toast({ title: "Name and Product ID are required", variant: "destructive" }); return; }
    const payload = {
      product_id: productForm.product_id,
      name: productForm.name,
      description: productForm.description || null,
      rate: parseFloat(productForm.rate) || 0,
      category: productForm.category || null,
      unit: productForm.unit,
      quantity: parseFloat(productForm.quantity) || 0,
      min_stock_level: parseFloat(productForm.min_stock_level) || 0,
    };
    if (editingId) {
      const { error } = await supabase.from("products").update(payload).eq("id", editingId);
      if (error) { toast({ title: error.message, variant: "destructive" }); return; }
      toast({ title: "Product updated!" });
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast({ title: error.message, variant: "destructive" }); return; }
      toast({ title: "Product added!" });
    }
    setShowForm(false); setEditingId(null); setProductForm(emptyProductForm); fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!isSuperAdmin) return;
    await supabase.from(tab).delete().eq("id", id);
    fetchAll(); toast({ title: `${tab === "services" ? "Service" : "Product"} deleted` });
  };

  const items = tab === "services" ? services : products;
  const filtered = items.filter((i) => !search ||
    (i.service_id || i.product_id || "").toLowerCase().includes(search.toLowerCase()) ||
    i.name?.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const avgServiceRate = services.length > 0 ? services.reduce((s, i) => s + Number(i.rate), 0) / services.length : 0;
  const avgProductRate = products.length > 0 ? products.reduce((s, i) => s + Number(i.rate), 0) / products.length : 0;

  const handleDownloadReport = () => {
    const headers = tab === "services" ? ["ID", "Name", "Category", "Rate"] : ["ID", "Name", "Category", "Rate", "Stock", "Unit"];
    const rows = filtered.map(i => tab === "services"
      ? [i.service_id || "—", i.name || "—", i.category || "—", i.rate?.toLocaleString() || "0"]
      : [i.product_id || "—", i.name || "—", i.category || "—", i.rate?.toLocaleString() || "0", i.quantity?.toString() || "0", i.unit || "—"]
    );
    exportTableToPDF(`${tab.toUpperCase()} Report`, headers, rows, `${tab}_report`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Services & Parts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your service and parts catalog</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadReport} className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted shadow-sm transition-all active:scale-95">
            <FileDown className="w-4 h-4" /> Download Report
          </button>
          {isSuperAdmin && (
            <button onClick={() => { setEditingId(null); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95">
              <Plus className="w-4 h-4" /> Add {tab === "services" ? "Service" : "Part"}
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Wrench className="w-4 h-4 text-primary" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Services</p><p className="text-2xl font-bold text-foreground mt-0.5">{services.length}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-info/10"><Package className="w-4 h-4 text-info" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Parts</p><p className="text-2xl font-bold text-foreground mt-0.5">{products.length}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-success/10"><BarChart2 className="w-4 h-4 text-success" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Avg Service Rate</p><p className="text-xl font-bold text-foreground mt-0.5">Rs. {avgServiceRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/10"><DollarSign className="w-4 h-4 text-warning" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Avg Product Rate</p><p className="text-xl font-bold text-foreground mt-0.5">Rs. {avgProductRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("services")} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "services" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          <Wrench className="w-3.5 h-3.5" /> Services <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === "services" ? "bg-white/20" : "bg-primary/10 text-primary"}`}>{services.length}</span>
        </button>
        <button onClick={() => setTab("products")} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "products" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          <Package className="w-3.5 h-3.5" /> Parts <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === "products" ? "bg-white/20" : "bg-primary/10 text-primary"}`}>{products.length}</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID or name..." className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
      </div>

      {showForm && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-elevated max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold font-display text-card-foreground mb-1">{editingId ? "Edit" : "Add"} {tab === "services" ? "Service" : "Part"}</h3>
            <p className="text-xs text-muted-foreground mb-5">Fill in the details below to {editingId ? "update" : "add"} a {tab === "services" ? "service" : "part"}.</p>
            <form onSubmit={tab === "services" ? handleSubmitService : handleSubmitProduct} className="space-y-4">
              <div><label className="text-sm font-medium text-card-foreground mb-1 block">Name *</label>
                <input value={tab === "services" ? serviceForm.name : productForm.name}
                  onChange={(e) => tab === "services" ? setServiceForm({ ...serviceForm, name: e.target.value }) : setProductForm({ ...productForm, name: e.target.value })} className={inputCls} />
              </div>
              <div><label className="text-sm font-medium text-card-foreground mb-1 block">Description</label>
                <input value={tab === "services" ? serviceForm.description : productForm.description}
                  onChange={(e) => tab === "services" ? setServiceForm({ ...serviceForm, description: e.target.value }) : setProductForm({ ...productForm, description: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">{tab === "services" ? "Rate (Rs.)" : "Rate / Price"}</label>
                  <input type="number" step="0.01" value={tab === "services" ? serviceForm.rate : productForm.rate}
                    onChange={(e) => tab === "services" ? setServiceForm({ ...serviceForm, rate: e.target.value }) : setProductForm({ ...productForm, rate: e.target.value })} className={inputCls} />
                </div>
                <div><label className="text-sm font-medium text-card-foreground mb-1 block">Category</label>
                  <input value={tab === "services" ? serviceForm.category : productForm.category}
                    onChange={(e) => tab === "services" ? setServiceForm({ ...serviceForm, category: e.target.value }) : setProductForm({ ...productForm, category: e.target.value })} className={inputCls} />
                </div>
              </div>
              {tab === "products" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium text-card-foreground mb-1 block">Part Code *</label>
                      <input placeholder="Enter ID (Manual)" value={productForm.product_id} onChange={(e) => setProductForm({ ...productForm, product_id: e.target.value })} className={inputCls} />
                    </div>
                    <div><label className="text-sm font-medium text-card-foreground mb-1 block">Unit</label>
                      <input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium text-card-foreground mb-1 block">Total Quantity</label>
                      <input type="number" step="0.01" value={productForm.quantity} onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })} className={inputCls} />
                    </div>
                    <div><label className="text-sm font-medium text-card-foreground mb-1 block">Min Stock Level</label>
                      <input type="number" step="0.01" value={productForm.min_stock_level} onChange={(e) => setProductForm({ ...productForm, min_stock_level: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">{editingId ? "Update" : "Add"}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {tab === "services" ? <Wrench className="w-10 h-10 text-muted-foreground/30 mb-3" /> : <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />}
          <p className="text-muted-foreground font-medium">No {tab} found.</p>
          <p className="text-xs text-muted-foreground mt-1">{isSuperAdmin ? `Add a new ${tab === "services" ? "service" : "product"} to get started.` : `Contact Super Admin to add ${tab}.`}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border shadow-card">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3 max-w-[200px]">Description</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Rate</th>
              {tab === "products" && (
                <>
                  <th className="text-left px-4 py-3">{isSuperAdmin ? "Warehouse" : "Stock"}</th>
                  {isSuperAdmin && <th className="text-left px-4 py-3">Branches</th>}
                  {isSuperAdmin && <th className="text-left px-4 py-3">Total</th>}
                  <th className="text-left px-4 py-3">Min</th>
                </>
              )}
              {tab === "products" && <th className="text-left px-4 py-3">Unit</th>}
              <th className="text-right px-4 py-3">{isSuperAdmin ? "Actions" : "Actions"}</th>
            </tr></thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{item.service_id || item.product_id}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[250px] truncate" title={item.description}>
                    {item.description || <span className="text-muted-foreground/30 italic">No description</span>}
                  </td>
                  <td className="px-4 py-3">
                    {item.category ? <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-bold">{item.category}</span> : <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-primary">Rs. {Number(item.rate).toLocaleString()}</td>
                  {tab === "products" && (
                    <>
                      <td className={`px-4 py-3 font-bold ${Number(item.quantity) <= Number(item.min_stock_level) ? "text-destructive" : "text-success"}`}>
                        {isSuperAdmin ? Number(item.quantity) : "—"}
                      </td>
                      {isSuperAdmin && <td className="px-4 py-3 font-medium text-info">{Number(item.branch_stock || 0)}</td>}
                      {isSuperAdmin && <td className="px-4 py-3 font-black text-foreground">{Number(item.total_stock || 0)}</td>}
                      <td className="px-4 py-3 text-muted-foreground">{Number(item.min_stock_level)}</td>
                    </>
                  )}
                  {tab === "products" && <td className="px-4 py-3 text-muted-foreground text-xs">{item.unit}</td>}
                  <td className="px-4 py-3 text-right">
                    {isSuperAdmin ? (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => {
                          setEditingId(item.id);
                          if (tab === "services") setServiceForm({ name: item.name, description: item.description || "", rate: String(item.rate), category: item.category || "" });
                          else setProductForm({
                            product_id: item.product_id,
                            name: item.name,
                            description: item.description || "",
                            rate: String(item.rate),
                            category: item.category || "",
                            unit: item.unit,
                            quantity: String(item.quantity || 0),
                            min_stock_level: String(item.min_stock_level || 0)
                          });
                          setShowForm(true);
                        }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex justify-end pr-2">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground/30" />
                      </div>
                    )}
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

export default ServicesProducts;
