import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, FileText, Calendar, AlertCircle, CheckCircle2, Clock, FileDown, Trash2, PlusCircle, Lock, Check, ChevronsUpDown, Edit2, X } from "lucide-react";
import { logActivity } from "@/utils/logger";
import { generatePDF } from "@/utils/pdfGenerator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const Invoices = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingItemsInvoice, setEditingItemsInvoice] = useState<any | null>(null);
  const [editItemsForm, setEditItemsForm] = useState<{ items: any[], sales_tax_rate: string, shipping_handling: string, discount_amount: string, advance_paid: string }>({ items: [{ description: "", qty: 1, unitPrice: 0 }], sales_tax_rate: "0", shipping_handling: "0", discount_amount: "0", advance_paid: "0" });
  const [savingItems, setSavingItems] = useState(false);
  const { user, hasRole, profile, session, isDeveloper } = useAuth();
  const { toast } = useToast();

  const isEditable = (c: any) => {
    if (!c || !c.created_at) return true;
    if (isDeveloper || hasRole("super_admin")) return true;
    if (!hasRole("branch_admin")) return false;

    // Locked if paid
    if (c.payment_status === "paid") return false;

    // Remove 2-hour time limit check for invoices as per user request
    return true;
  };

  const emptyForm = {
    customer_id: "", branch_id: "", complaint_id: "", technician_id: "",
    items: [{ description: "", qty: 1, unitPrice: 0, isManual: true }],
    sales_tax_rate: "0", shipping_handling: "0", discount_amount: "0", advance_paid: "0",
    notes: "",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  };

  const [form, setForm] = useState(emptyForm);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const isBranchAdmin = hasRole("branch_admin") && !hasRole("super_admin");
      const branchId = profile?.branch_id;

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const authHeader = { 'Authorization': `Bearer ${session?.access_token}` };

      const [invRes, custRes, brRes, compRes, staffRes, servRes, prodRes] = await Promise.all([
        fetch(`${API_URL}/api/invoices${branchId ? `?branch_id=${branchId}` : ''}`, { headers: authHeader }),
        fetch(`${API_URL}/api/customers${branchId ? `?branch_id=${branchId}` : ''}`, { headers: authHeader }),
        supabase.from("branches").select("id, name, address, branch_code").then(res => {
          if (res.error) throw res.error;
          return res;
        }),
        fetch(`${API_URL}/api/complaints${branchId ? `?branch_id=${branchId}` : ''}`, { headers: authHeader }),
        supabase.from("staff").select("id, full_name").eq("status", "active").then(res => {
          if (res.error) throw res.error;
          return res;
        }),
        supabase.from("services").select("*").then(res => {
          if (res.error) throw res.error;
          return res;
        }),
        supabase.from("products").select("*").then(res => {
          if (res.error) throw res.error;
          return res;
        }),
      ]);

      if (!invRes.ok) throw new Error(`Failed to fetch invoices: ${invRes.statusText}`);
      if (!custRes.ok) throw new Error(`Failed to fetch customers: ${custRes.statusText}`);
      if (!compRes.ok) throw new Error(`Failed to fetch complaints: ${compRes.statusText}`);

      const [invoicesData, customersData, complaintsData] = await Promise.all([
        invRes.json(),
        custRes.json(),
        compRes.json()
      ]);

      setInvoices(invoicesData);
      setCustomers(customersData);
      setBranches(brRes.data || []);
      setComplaints(complaintsData);
      setTechnicians(staffRes.data || []);
      setServices(servRes.data || []);
      setProducts(prodRes.data || []);

      if (isBranchAdmin && branchId) {
        setForm(prev => ({ ...prev, branch_id: branchId }));
      }
    } catch (error: any) {
      console.error("FetchAll Error:", error);
      toast({
        title: "Error Fetching Data",
        description: error.message || "Failed to connect to the server. Please try refreshing.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleComplaintChange = (complaintId: string) => {
    const complaint = complaints.find(c => c.id === complaintId);
    if (complaint) {
      setForm({
        ...form,
        complaint_id: complaintId,
        customer_id: complaint.customer_id || "",
        branch_id: complaint.branch_id || "",
        technician_id: complaint.assigned_to || "",
        notes: complaint.description ? `Complaint Description: ${complaint.description}` : form.notes
      });
    } else {
      setForm({ ...form, complaint_id: "" });
    }
  };

  const addItem = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, { description: "", qty: 1, unitPrice: 0, isManual: true }] }));
  };

  const removeItem = (index: number) => {
    setForm(prev => {
      if (prev.items.length === 1) {
        return { ...prev, items: [{ description: "", qty: 1, unitPrice: 0, isManual: true }] };
      }
      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
    });
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setForm(prev => {
        const newItems = [...prev.items];
        newItems[index] = {
          ...newItems[index],
          [field]: value,
          // If description is changed manually, mark as manual
          isManual: field === 'description' ? true : newItems[index].isManual
        };
        return { ...prev, items: newItems };
    });
  };

  const handleItemSelect = (index: number, type: 'service' | 'product', id: string) => {
    const item = type === 'service'
      ? services.find(s => s.id === id)
      : products.find(p => p.id === id);

    if (item) {
      setForm(prev => {
        const newItems = [...prev.items];
        newItems[index] = {
          ...newItems[index],
          description: item.name,
          unitPrice: item.rate || 0,
          isManual: false
        };
        return { ...prev, items: newItems };
      });
    }
  };

  const calculateTotals = () => {
    const subtotal = form.items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    const taxRate = parseFloat(form.sales_tax_rate) || 0;
    const tax = (subtotal * taxRate) / 100;
    const shipping = parseFloat(form.shipping_handling) || 0;
    const discount = parseFloat(form.discount_amount) || 0;
    const advance = parseFloat(form.advance_paid) || 0;
    const total = subtotal + tax + shipping - discount - advance;
    return { subtotal, tax, shipping, discount, advance, total };
  };

  const generateVerificationId = () => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = form.items.filter(it => it.description && it.description.trim() !== "");
    if (validItems.length === 0) { toast({ title: "At least one valid line item is required", variant: "destructive" }); return; }
    if (!form.customer_id || !form.branch_id) { toast({ title: "Customer and branch required", variant: "destructive" }); return; }

    const { subtotal, tax, shipping, discount, advance, total } = calculateTotals();
    const verification_id = generateVerificationId();

    setSubmitting(true);
    toast({ title: "Processing Invoice...", description: "Please wait while we generate your document." });

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ecs_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: form.customer_id,
          branch_id: form.branch_id,
          complaint_id: form.complaint_id || null,
          technician_id: form.technician_id || null,
          items: validItems,
          subtotal,
          tax_amount: tax,
          sales_tax_rate: parseFloat(form.sales_tax_rate) || 0,
          shipping_handling: shipping,
          discount_amount: discount,
          advance_paid: advance,
          total_amount: total,
          notes: form.notes || null,
          due_date: form.due_date,
          verification_id
        })
      });

      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Invoice Error", description: String(err.error || "Failed to create invoice"), variant: "destructive" });
        return;
      }

      const newInvoice = await res.json();

      // Fetch the full invoice data for PDF from our local API
      const fullRes = await fetch(`${API_URL}/api/invoices/${newInvoice.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecs_token')}` }
      });

      if (!fullRes.ok) {
        toast({ title: "Invoice created, but PDF data failed", description: "You can download it later from the list.", variant: "warning" as any });
      } else {
        const fullInvoice = await fullRes.json();
        await generatePDF('invoice', {
          ...fullInvoice,
          customer_name: fullInvoice.customers?.name,
          phone: fullInvoice.customers?.phone,
          address: fullInvoice.customers?.address,
          branch_name: fullInvoice.branches?.name,
          branch_address: fullInvoice.branches?.address,
          branch_code: fullInvoice.branches?.branch_code,
          complaint_number: fullInvoice.complaints?.complaint_number
        });
      }

      toast({ title: "Invoice created successfully!" });
      setShowForm(false);
      setForm(emptyForm);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Connection Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const updatePaymentStatus = async (id: string, status: string, createdAt: string, oldStatus: string) => {
    const isSuperOrDev = isDeveloper || hasRole("super_admin");
    // Frontend guard: prevent even trying if already paid (for branch admins)
    if (!isSuperOrDev && oldStatus === "paid") {
      toast({ title: "ðŸ”’ Invoice Locked", description: "Paid invoices cannot be modified.", variant: "destructive" });
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/invoices/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ecs_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment_status: status,
          ...(status === "paid" ? { paid_at: new Date().toISOString() } : {}),
        })
      });

      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Update failed", description: err.error || "Server error", variant: "destructive" });
        return;
      }

      await logActivity({
        userId: user?.id!,
        userEmail: user?.email!,
        activityType: "PAYMENT_STATUS_UPDATED",
        branchId: profile?.branch_id || null,
        metadata: { invoiceId: id, newStatus: status }
      });

      fetchAll();
      toast({ title: `Payment marked as ${status}${status === "paid" ? " ðŸ”’ (Locked)" : ""}` });
    } catch (err: any) {
      toast({ title: "Connection error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteInvoice = async (id: string, createdAt: string, status: string) => {
    if (!isEditable({ created_at: createdAt, payment_status: status })) {
      toast({ title: "ðŸ”’ Delete restricted", description: "Paid invoices are locked and cannot be deleted by Branch Admins.", variant: "destructive" });
      return;
    }

    if (!window.confirm("Are you sure you want to delete this invoice?")) return;

    // Optimistic Update
    const originalInvoices = [...invoices];
    setInvoices(prev => prev.filter(inv => inv.id !== id));

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await window.fetch(`${API_URL}/api/invoices/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecs_token')}` }
      });

      if (!res.ok) {
        setInvoices(originalInvoices); // Rollback
        const err = await res.json();
        toast({ title: "Delete Error", description: err.error || "Server error", variant: "destructive" });
        return;
      }

      if (user) {
        await logActivity({
          userId: user.id,
          userEmail: user.email,
          activityType: "INVOICE_DELETED",
          branchId: profile?.branch_id || null,
          metadata: { invoiceId: id }
        });
      }

      toast({ title: "Invoice deleted successfully" });
      fetchAll();
    } catch (error: any) {
      setInvoices(originalInvoices); // Rollback
      toast({ title: "Error deleting invoice", description: error.message, variant: "destructive" });
    }
  };

  const handleDownloadInvoice = async (inv: any) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    toast({ title: "Preparing Invoice PDF...", description: "Fetching invoice details..." });
    try {
      const res = await fetch(`${API_URL}/api/invoices/${inv.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecs_token')}` }
      });
      if (!res.ok) throw new Error("Failed to fetch invoice details");
      const fullInvoice = await res.json();
      await generatePDF('invoice', {
        ...fullInvoice,
        customer_name: fullInvoice.customers?.name,
        phone: fullInvoice.customers?.phone,
        address: fullInvoice.customers?.address,
        branch_name: fullInvoice.branches?.name,
        branch_address: fullInvoice.branches?.address,
        branch_code: fullInvoice.branches?.branch_code,
        complaint_number: fullInvoice.complaints?.complaint_number
      });
    } catch (err: any) {
      toast({ title: "PDF Error", description: err.message, variant: "destructive" });
    }
  };

  const openEditItems = async (inv: any) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    try {
      const res = await fetch(`${API_URL}/api/invoices/${inv.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecs_token')}` }
      });
      const full = await res.json();
      const rawItems: any[] = full.items || [];

      // Filter out backend-synthesized fallback items (id === null) so we can let user enter real ones
      const realItems = rawItems.filter((it: any) => it.id !== null);

      let preItems;
      if (realItems.length > 0) {
        // Use saved real items
        preItems = realItems.map((it: any) => ({
          description: it.description || "",
          qty: Number(it.qty || it.quantity || 1),
          unitPrice: Number(it.unitPrice || it.unit_price || 0)
        }));
      } else {
        // Pre-populate from invoice notes + subtotal as smart default
        const subtotal = Number(full.subtotal || inv.subtotal || 0);
        let desc = (full.notes || inv.notes || "").replace(/^Complaint Description:\s*/i, "").trim().substring(0, 100);
        preItems = [{ description: desc || "Services / Products", qty: 1, unitPrice: subtotal }];
      }

      setEditItemsForm({
        items: preItems,
        sales_tax_rate: String(full.sales_tax_rate || "0"),
        shipping_handling: String(full.shipping_handling || "0"),
        discount_amount: String(full.discount_amount || "0"),
        advance_paid: String(full.advance_paid || "0")
      });
      setEditingItemsInvoice(inv);
    } catch (err: any) {
      toast({ title: "Error loading invoice", description: err.message, variant: "destructive" });
    }
  };

  const calculateEditTotals = () => {
    const subtotal = editItemsForm.items.reduce((s, it) => s + (Number(it.qty) * Number(it.unitPrice)), 0);
    const taxRate = parseFloat(editItemsForm.sales_tax_rate) || 0;
    const tax = (subtotal * taxRate) / 100;
    const shipping = parseFloat(editItemsForm.shipping_handling) || 0;
    const discount = parseFloat(editItemsForm.discount_amount) || 0;
    const advance = parseFloat(editItemsForm.advance_paid) || 0;
    const total = subtotal + tax + shipping - discount - advance;
    return { subtotal, tax, shipping, discount, advance, total };
  };

  const handleSaveItems = async () => {
    const validItems = editItemsForm.items.filter(it => it.description?.trim());
    if (validItems.length === 0) { toast({ title: "At least one item with a description is required", variant: "destructive" }); return; }
    const { subtotal, tax, shipping, discount, advance, total } = calculateEditTotals();
    setSavingItems(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/invoices/${editingItemsInvoice.id}/items`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecs_token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validItems,
          subtotal,
          tax_amount: tax,
          sales_tax_rate: parseFloat(editItemsForm.sales_tax_rate) || 0,
          shipping_handling: shipping,
          discount_amount: discount,
          advance_paid: advance,
          total_amount: total
        })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to save items"); }
      toast({ title: "Items saved! Generating PDF..." });
      setEditingItemsInvoice(null);
      fetchAll();
      // Auto-download updated PDF
      await handleDownloadInvoice({ ...editingItemsInvoice, id: editingItemsInvoice.id });
    } catch (err: any) {
      toast({ title: "Save Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingItems(false);
    }
  };

  const filtered = invoices.filter((i) => !search || i.invoice_number?.toLowerCase().includes(search.toLowerCase()) || i.customers?.name?.toLowerCase().includes(search.toLowerCase()));

  const paymentColors: Record<string, string> = {
    paid: "bg-success/10 text-success",
    unpaid: "bg-destructive/10 text-destructive",
    partial: "bg-amber-100 text-amber-700",
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all";
  const { subtotal, tax, shipping, discount, advance, total } = calculateTotals();

  const totalRevenue = invoices.filter(i => i.payment_status === 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const paidInvoices = invoices.filter(i => i.payment_status === 'paid').length;
  const unpaidInvoices = invoices.filter(i => i.payment_status === 'unpaid').length;

  const SearchableItemSelector = ({ onSelect, services, products }: { onSelect: (type: 'service' | 'product', id: string) => void, services: any[], products: any[] }) => {
    const [open, setOpen] = useState(false);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between gap-2 text-[10px] bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded px-2 py-1 outline-none w-full font-bold text-primary transition-colors"
          >
            <span className="truncate">Select Product / Service</span>
            <ChevronsUpDown className="h-3 w-3 opacity-50 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search name or ID/Code..." />
            <CommandList>
              <CommandEmpty>No item found.</CommandEmpty>
              <CommandGroup heading="Services">
                {services.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.name} ${item.service_id || ""}`}
                    onSelect={() => {
                      onSelect('service', item.id);
                      setOpen(false);
                    }}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold">{item.name}</span>
                      <span className="text-[10px] opacity-70">Rs. {Number(item.rate).toLocaleString()}</span>
                    </div>
                    {item.service_id && <span className="text-[9px] text-muted-foreground uppercase">{item.service_id}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Products">
                {products.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.name} ${item.product_id || ""}`}
                    onSelect={() => {
                      onSelect('product', item.id);
                      setOpen(false);
                    }}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold">{item.name}</span>
                      <span className="text-[10px] opacity-70">Rs. {Number(item.rate).toLocaleString()}</span>
                    </div>
                    {item.product_id && <span className="text-[9px] text-muted-foreground uppercase">{item.product_id}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  const SearchableComplaintSelector = ({ onSelect, complaints }: { onSelect: (id: string) => void, complaints: any[] }) => {
    const [open, setOpen] = useState(false);
    const selectedComplaint = complaints.find(c => c.id === form.complaint_id);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(inputCls, "flex items-center justify-between text-left font-normal")}
          >
            <span className="truncate">{selectedComplaint ? selectedComplaint.complaint_number : "Search Complaint Number..."}</span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Enter complaint #..." />
            <CommandList className="max-h-64">
              <CommandEmpty>No complaint found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value={"standalone-direct-billing"}
                  onSelect={(v) => {
                    onSelect("");
                    setOpen(false);
                  }}
                  className="flex flex-col items-start"
                >
                  <span className="font-bold">Standalone / Direct Billing</span>
                  <span className="text-[10px] opacity-70">No linked complaint</span>
                </CommandItem>
                {complaints.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.complaint_number}
                    onSelect={() => {
                      onSelect(item.id);
                      setOpen(false);
                    }}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold">{item.complaint_number}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground line-clamp-1">{item.description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <>
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold font-display text-foreground">Invoice Management</h2><p className="text-sm text-muted-foreground mt-0.5">{invoices.length} total generated invoices</p></div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95"><Plus className="w-4 h-4" /> Generate New Invoice</button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><FileText className="w-4 h-4 text-primary" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Invoices</p><p className="text-2xl font-bold text-foreground mt-0.5">{invoices.length}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="w-4 h-4 text-success" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Paid</p><p className="text-2xl font-bold text-foreground mt-0.5">{paidInvoices}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><AlertCircle className="w-4 h-4 text-destructive" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Unpaid</p><p className="text-2xl font-bold text-foreground mt-0.5">{unpaidInvoices}</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/10"><Clock className="w-4 h-4 text-warning" /></div>
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Revenue</p><p className="text-lg font-bold text-foreground mt-0.5">Rs. {totalRevenue.toLocaleString()}</p></div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by Invoice # or Customer Name..." className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-2xl bg-card border border-border p-8 shadow-elevated max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-primary/5 p-4 rounded-xl">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Generation Invoice</h2>
                  <p className="text-sm text-muted-foreground">Fill in the details to create a new invoice</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-primary uppercase mb-1.5 block tracking-widest">Linked Complaint (Search Bar)</label>
                    <SearchableComplaintSelector complaints={complaints} onSelect={handleComplaintChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Customer *</label>
                      <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className={inputCls}><option value="">Select</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    <div><label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Branch *</label>
                      <select
                        value={form.branch_id}
                        onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                        className={inputCls}
                        disabled={hasRole("branch_admin") && !hasRole("super_admin")}
                      >
                        <option value="">Select</option>
                        {branches
                          .filter(b => !hasRole("branch_admin") || hasRole("super_admin") || b.id === profile?.branch_id)
                          .map((b) => <option key={b.id} value={b.id}>{b.name}</option>)
                        }
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Technician</label>
                      <select value={form.technician_id} onChange={(e) => setForm({ ...form, technician_id: e.target.value })} className={inputCls}><option value="">None</option>{technicians.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
                    <div><label className="text-[10px] font-bold text-primary uppercase mb-1.5 block">Due Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputCls + " pl-10"} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Item Table Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Line Items</h4>
                  <button type="button" onClick={addItem} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"><PlusCircle className="w-4 h-4" /> Add Item</button>
                </div>
                <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted text-muted-foreground border-b border-border">
                      <th className="text-left px-4 py-3 font-bold uppercase tracking-tight">Description</th>
                      <th className="text-center px-4 py-3 font-bold uppercase tracking-tight w-24">Qty</th>
                      <th className="text-right px-4 py-3 font-bold uppercase tracking-tight w-32">Unit Price</th>
                      <th className="text-right px-4 py-3 font-bold uppercase tracking-tight w-32">Amount</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {form.items.map((item, idx) => (
                        <tr key={idx} className="bg-card">
                          <td className="px-2 py-2 space-y-2">
                            <SearchableItemSelector
                              services={services}
                              products={products}
                              onSelect={(type, id) => handleItemSelect(idx, type, id)}
                            />
                            <input
                              value={item.description}
                              onChange={(e) => updateItem(idx, 'description', e.target.value)}
                              placeholder="e.g. Compressor 1/10 R134a"
                              className="w-full bg-transparent p-2 focus:bg-muted/30 outline-none rounded border border-transparent focus:border-input"
                            />
                          </td>
                          <td className="px-2 py-2 text-center align-bottom"><input type="number" step="0.01" value={item.qty} onChange={(e) => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)} className="w-full text-center bg-transparent p-2 focus:bg-muted/30 outline-none rounded" /></td>
                          <td className="px-2 py-2 text-right align-bottom">
                            <div className="relative">
                              <input 
                                type="number" 
                                step="0.01" 
                                value={item.unitPrice} 
                                onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} 
                                className={`w-full text-right bg-transparent p-2 outline-none rounded transition-all ${(!(isDeveloper || hasRole("super_admin")) && !item.isManual) ? "bg-muted/50 cursor-not-allowed pr-7 text-muted-foreground" : "focus:bg-muted/30"}`} 
                                disabled={!(isDeveloper || hasRole("super_admin")) && !item.isManual}
                              />
                              {(!(isDeveloper || hasRole("super_admin")) && !item.isManual) && (
                                <Lock className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-foreground align-bottom">Rs. {(item.qty * item.unitPrice).toLocaleString()}</td>
                          <td className="px-2 py-2 text-center align-bottom">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-destructive hover:bg-destructive/10 p-2 rounded-full transition-colors group"
                              title="Remove Item"
                            >
                              <Trash2 className="w-4 h-4 group-active:scale-90 transition-transform" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div><label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Special Notes and Instructions</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} className={inputCls + " resize-none"} placeholder="Add custom terms, banking notes, etc." /></div>

                <div className="bg-muted/30 p-6 rounded-2xl border border-border space-y-4">
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground font-medium uppercase">Subtotal</span><span className="font-bold">Rs. {subtotal.toLocaleString()}</span></div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-bold text-muted-foreground uppercase block">Sales Tax (%)</label><input type="number" step="0.1" value={form.sales_tax_rate} onChange={(e) => setForm({ ...form, sales_tax_rate: e.target.value })} className={inputCls + " h-8 py-1"} /></div>
                    <div className="space-y-1"><label className="text-[9px] font-bold text-muted-foreground uppercase block">Tax Amount</label><div className="h-8 flex items-center justify-end px-3 bg-background border border-input rounded-lg text-xs font-bold text-destructive">Rs. {tax.toLocaleString()}</div></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-bold text-muted-foreground uppercase block">S&H / Other Charges</label><input type="number" step="0.01" value={form.shipping_handling} onChange={(e) => setForm({ ...form, shipping_handling: e.target.value })} className={inputCls + " h-8 py-1"} /></div>
                    <div className="space-y-1"><label className="text-[9px] font-bold text-muted-foreground uppercase block">Discount Amount</label><input type="number" step="0.01" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} className={inputCls + " h-8 py-1 text-destructive font-bold"} /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-bold text-muted-foreground uppercase block">Advance Paid</label><input type="number" step="0.01" value={form.advance_paid} onChange={(e) => setForm({ ...form, advance_paid: e.target.value })} className={inputCls + " h-8 py-1 text-success font-bold"} /></div>
                    <div className="space-y-1"><label className="text-[9px] font-bold text-muted-foreground uppercase block">Net Balance</label><div className="h-8 flex items-center justify-end px-3 bg-primary/5 border border-primary/20 rounded-lg text-xs font-bold text-primary">Rs. {total.toLocaleString()}</div></div>
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-sm font-bold uppercase tracking-wider">Net Amount Payable</span>
                    <span className="text-2xl font-bold text-primary">Rs. {total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Processing..." : "Issue & Link Invoice"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-input py-4 text-sm font-bold text-foreground hover:bg-muted transition-colors">Cancel Generation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" /><p className="text-sm text-muted-foreground animate-pulse">Fetching financial records...</p></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-2xl border border-dashed border-border text-center"><FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-20" /><h3 className="text-lg font-semibold text-foreground">No invoices found</h3></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 border-b border-border">
              <th className="text-left font-bold text-muted-foreground px-4 py-4 uppercase tracking-wider text-[10px]">Invoice #</th>
              <th className="text-left font-bold text-muted-foreground px-4 py-4 uppercase tracking-wider text-[10px]">Customer / Branch</th>
              <th className="text-left font-bold text-muted-foreground px-4 py-4 uppercase tracking-wider text-[10px]">Verification ID</th>
              <th className="text-left font-bold text-muted-foreground px-4 py-4 uppercase tracking-wider text-[10px]">Total Amount</th>
              <th className="text-left font-bold text-muted-foreground px-4 py-4 uppercase tracking-wider text-[10px]">Payment Status</th>
              <th className="text-left font-bold text-muted-foreground px-4 py-4 uppercase tracking-wider text-[10px]">Due Date</th>
              <th className="text-left font-bold text-muted-foreground px-4 py-4 uppercase tracking-wider text-[10px]">Issued</th>
              <th className="text-left font-bold text-muted-foreground px-4 py-4 uppercase tracking-wider text-[10px]">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.map((inv) => {
                const isOverdue = inv.payment_status !== 'paid' && inv.due_date && new Date(inv.due_date) < new Date();
                return (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 font-bold text-foreground">{inv.invoice_number || "Draft"}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-foreground">{inv.customers?.name || "â€”"}</p>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{inv.branches?.name || "â€”"}</span>
                        {inv.complaints?.complaint_number && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-primary font-bold bg-primary/5 px-1.5 py-0.5 rounded w-fit mt-1">
                            <AlertCircle className="w-3 h-3" /> {inv.complaints.complaint_number}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase opacity-60">Verification ID:</span>
                        <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[100px]" title={inv.verification_id}>{inv.verification_id?.split('-')[0]}...</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-bold text-primary">Rs. {Number(inv.total_amount).toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <select
                        value={inv.payment_status}
                        onChange={(e) => updatePaymentStatus(inv.id, e.target.value, inv.created_at, inv.payment_status)}
                        disabled={!isEditable(inv)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold capitalize border-0 cursor-pointer shadow-sm transition-all hover:scale-105 ${paymentColors[inv.payment_status] || "bg-muted"} `}>
                        <option value="unpaid" className="bg-background text-foreground">Unpaid</option>
                        <option value="partial" className="bg-background text-foreground">Partial</option>
                        <option value="paid" className="bg-background text-foreground">Paid</option>
                      </select>
                    </td>
                    <td className={`px-4 py-4 font-semibold ${isOverdue ? "text-destructive flex items-center gap-1" : "text-muted-foreground"} `}>
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "â€”"}
                      {isOverdue && <AlertCircle className="w-3 h-3" />}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground italic text-xs">
                      <div className="flex flex-col">
                        <span>{new Date(inv.issued_at || inv.created_at).toLocaleDateString()}</span>
                        <span className="text-[10px] opacity-70 flex items-center gap-1"><Clock className="w-2 h-2" /> {new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadInvoice(inv)}
                          className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                          title="Download Invoice PDF"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditItems(inv)}
                          className="p-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white transition-all shadow-sm active:scale-95"
                          title="Edit / Add Line Items"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isEditable(inv) ? (
                          <button
                            onClick={() => handleDeleteInvoice(inv.id, inv.created_at, inv.payment_status)}
                            className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shadow-sm active:scale-95"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="p-2 text-muted-foreground/30" title="Locked (Paid)">
                            <Lock className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {/* Edit Invoice Items Modal */}
    {editingItemsInvoice && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="w-full max-w-2xl rounded-[2rem] bg-card border border-border p-8 shadow-elevated animate-in zoom-in duration-300 my-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black text-foreground">Edit Line Items</h3>
              <p className="text-xs text-muted-foreground mt-1">Invoice: <span className="font-bold text-primary">{editingItemsInvoice.invoice_number}</span></p>
            </div>
            <button onClick={() => setEditingItemsInvoice(null)} className="p-2 rounded-full hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
          </div>

          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-[1fr_80px_110px_30px] gap-2 px-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Description</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase text-center">Qty</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase text-right">Unit Price</span>
              <span></span>
            </div>
            {editItemsForm.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_110px_30px] gap-2 items-center">
                <input
                  value={item.description}
                  onChange={e => { const n = [...editItemsForm.items]; n[idx] = { ...n[idx], description: e.target.value }; setEditItemsForm(p => ({ ...p, items: n })); }}
                  placeholder="Service or product name"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="number" min="0" value={item.qty}
                  onChange={e => { const n = [...editItemsForm.items]; n[idx] = { ...n[idx], qty: Number(e.target.value) }; setEditItemsForm(p => ({ ...p, items: n })); }}
                  className="rounded-lg border border-input bg-background px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="number" min="0" step="0.01" value={item.unitPrice}
                  onChange={e => { const n = [...editItemsForm.items]; n[idx] = { ...n[idx], unitPrice: Number(e.target.value) }; setEditItemsForm(p => ({ ...p, items: n })); }}
                  className="rounded-lg border border-input bg-background px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button onClick={() => setEditItemsForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) || [{ description: "", qty: 1, unitPrice: 0 }] }))} className="text-destructive hover:text-destructive/70 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setEditItemsForm(p => ({ ...p, items: [...p.items, { description: "", qty: 1, unitPrice: 0 }] }))} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline mt-2">
              <PlusCircle className="w-4 h-4" /> Add Row
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-xl bg-muted/30 border border-border">
            <div><label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Sales Tax %</label><input type="number" min="0" value={editItemsForm.sales_tax_rate} onChange={e => setEditItemsForm(p => ({ ...p, sales_tax_rate: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">S&H Charges</label><input type="number" min="0" value={editItemsForm.shipping_handling} onChange={e => setEditItemsForm(p => ({ ...p, shipping_handling: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Discount</label><input type="number" min="0" value={editItemsForm.discount_amount} onChange={e => setEditItemsForm(p => ({ ...p, discount_amount: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Advance Paid</label><input type="number" min="0" value={editItemsForm.advance_paid} onChange={e => setEditItemsForm(p => ({ ...p, advance_paid: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          </div>

          <div className="flex items-center justify-between mb-6 px-1">
            <span className="text-sm font-bold uppercase tracking-wider">Net Total</span>
            <span className="text-xl font-black text-primary">Rs. {calculateEditTotals().total.toLocaleString()}</span>
          </div>

          <div className="flex gap-4">
            <button onClick={handleSaveItems} disabled={savingItems} className="flex-1 rounded-xl bg-primary py-3 text-sm font-black text-white hover:opacity-90 shadow-lg transition-all disabled:opacity-50">
              {savingItems ? "Saving..." : "Save Items & Download PDF"}
            </button>
            <button onClick={() => setEditingItemsInvoice(null)} className="flex-1 rounded-xl border border-input py-3 text-sm font-bold hover:bg-muted transition-colors">Cancel</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Invoices;

