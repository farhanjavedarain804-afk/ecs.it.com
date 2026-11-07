import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, Shield, Save, Building, Landmark, Key, Mail, 
  UserCog, Eye, EyeOff, Send, Server, CheckCircle2, AlertCircle, 
  Lock, Plus, Trash2, Edit2, Star, Check, Phone, MapPin, 
  FileText, ArrowRight, Sparkles, Building2, Layers
} from "lucide-react";

interface BankAccount {
  id: string;
  bank_name: string;
  account_title: string;
  account_number: string;
  iban: string;
  branch_name?: string;
  notes?: string;
  is_default: boolean;
}

const Settings = () => {
  const { user, profile, roles, hasRole, isDeveloper } = useAuth();
  const { toast } = useToast();

  const isSuperOrDev = hasRole("super_admin") || isDeveloper;

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<"company" | "banking" | "smtp" | "users" | "profile">(
    isSuperOrDev ? "company" : "profile"
  );

  // My Profile
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Company Profile & Official Contacts
  const [companySettings, setCompanySettings] = useState<any>({
    company_name: "Electric Complaint Solutions",
    company_phone: "+92 310 1111 327",
    company_email: "ecs.isbpak@gmail.com",
    company_address: "1st Floor, Zain Plaza, Islamabad",
    tax_id: "3220139033321",
    invoice_prefix: "ECS-",
    next_invoice_number: 1001,
    default_resolution_time: 48,
    authorized_signatory: "Muhammad Aamir",
    signatory_designation: "Chief Executive Officer",
    terms_and_conditions: "Payment is due within 7 days. Thank you for your business."
  });
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  // Bank Accounts & Branch Mapping
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    {
      id: "default-primary",
      bank_name: "Habib Bank Limited",
      account_title: "ECS (PVT) Ltd",
      account_number: "0050417901614255",
      iban: "0050417901614255",
      branch_name: "Blue Area, Islamabad",
      notes: "Primary Master Account",
      is_default: true
    }
  ]);
  const [branchMappings, setBranchMappings] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBanking, setLoadingBanking] = useState(false);
  const [savingBanking, setSavingBanking] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null);
  const [isNewAccountModal, setIsNewAccountModal] = useState(false);

  // SMTP Settings
  const [smtpSettings, setSmtpSettings] = useState({
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    sender_name: "",
    sender_email: "",
    enabled: true
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState("");

  // User Management
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newCreds, setNewCreds] = useState({ email: "", password: "", full_name: "" });
  const [savingUser, setSavingUser] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL ?? "";

  useEffect(() => {
    setFullName(profile?.full_name || "");
    if (isSuperOrDev) {
      fetchCompanySettings();
      fetchBankSettings();
      fetchBranches();
      fetchSmtpSettings();
      fetchUsers();
    }
  }, [profile, roles, isDeveloper]);

  // Ensure active tab is allowed
  useEffect(() => {
    if (!isSuperOrDev && activeTab !== "profile") {
      setActiveTab("profile");
    }
  }, [isSuperOrDev]);

  // --- Fetchers ---
  const fetchCompanySettings = async () => {
    setLoadingCompany(true);
    try {
      const res = await fetch(`${API_URL}/api/company_settings`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        const comp = Array.isArray(data) ? data[0] : data;
        if (comp) setCompanySettings((prev: any) => ({ ...prev, ...comp }));
      }
    } catch (e) {
      console.error("Error fetching company settings:", e);
    } finally {
      setLoadingCompany(false);
    }
  };

  const fetchBankSettings = async () => {
    setLoadingBanking(true);
    try {
      const res = await fetch(`${API_URL}/api/company_settings/bank_settings`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts && Array.isArray(data.accounts)) {
          setBankAccounts(data.accounts);
        }
        if (data.branch_mappings) {
          setBranchMappings(data.branch_mappings);
        }
      }
    } catch (e) {
      console.error("Error fetching bank settings:", e);
    } finally {
      setLoadingBanking(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API_URL}/api/branches`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching branches:", e);
    }
  };

  const fetchSmtpSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/smtp_settings`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.value) {
          setSmtpSettings((prev) => ({ ...prev, ...data.value }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch SMTP settings:", e);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data } = await supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoadingUsers(false);
  };

  // --- Actions ---

  // 1. Save Profile
  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("user_id", user.id);
    if (error) { toast({ title: error.message, variant: "destructive" }); }
    else { toast({ title: "Profile updated successfully! ✅" }); }
    setSavingProfile(false);
  };

  // 2. Save Company Profile & Contacts
  const saveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      const id = companySettings.id || "default";
      const res = await fetch(`${API_URL}/api/company_settings/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("ecs_token")}`
        },
        body: JSON.stringify(companySettings)
      });
      if (!res.ok) throw new Error("Failed to update company settings");
      toast({ 
        title: "Company Settings Updated! 🏢", 
        description: "Official contact details and branding updated across all PDF invoices, emails, and certificates." 
      });
      fetchCompanySettings();
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingCompany(false);
    }
  };

  // 3. Banking Actions
  const handleSaveBankSettings = async (
    accountsToSave = bankAccounts,
    mappingsToSave = branchMappings
  ) => {
    setSavingBanking(true);
    try {
      const res = await fetch(`${API_URL}/api/company_settings/bank_settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("ecs_token")}`
        },
        body: JSON.stringify({
          accounts: accountsToSave,
          branch_mappings: mappingsToSave
        })
      });

      if (!res.ok) throw new Error("Failed to save bank settings");
      toast({ 
        title: "Bank Settings Saved! 🏦", 
        description: "Accounts and branch-specific invoice assignments have been updated." 
      });
      setBankAccounts(accountsToSave);
      setBranchMappings(mappingsToSave);
      fetchCompanySettings(); // Refresh synced default bank details
    } catch (err: any) {
      toast({ title: "Error Saving Bank Settings", description: err.message, variant: "destructive" });
    } finally {
      setSavingBanking(false);
    }
  };

  const handleSetDefaultAccount = (accountId: string) => {
    const updated = bankAccounts.map((acc) => ({
      ...acc,
      is_default: acc.id === accountId
    }));
    setBankAccounts(updated);
    handleSaveBankSettings(updated, branchMappings);
  };

  const handleDeleteBankAccount = (accountId: string) => {
    if (bankAccounts.length <= 1) {
      toast({ 
        title: "Cannot Delete Account", 
        description: "At least one bank account must remain in the system.", 
        variant: "destructive" 
      });
      return;
    }
    const accToDelete = bankAccounts.find((a) => a.id === accountId);
    if (!window.confirm(`Are you sure you want to delete bank account "${accToDelete?.bank_name}"?`)) return;

    const remaining = bankAccounts.filter((a) => a.id !== accountId);
    if (accToDelete?.is_default && remaining.length > 0) {
      remaining[0].is_default = true;
    }

    // Clean up branch mappings referencing deleted account
    const cleanedMappings = { ...branchMappings };
    Object.keys(cleanedMappings).forEach((brId) => {
      if (cleanedMappings[brId] === accountId) {
        cleanedMappings[brId] = "default";
      }
    });

    handleSaveBankSettings(remaining, cleanedMappings);
  };

  const handleSaveAccountModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBankAccount) return;

    if (!editingBankAccount.bank_name || !editingBankAccount.account_title || !editingBankAccount.iban) {
      toast({ title: "Required Fields Missing", description: "Bank Name, Account Title, and Account/IBAN are required.", variant: "destructive" });
      return;
    }

    let updatedAccounts = [...bankAccounts];
    if (isNewAccountModal) {
      // If marked default or first account, ensure others are not default
      if (editingBankAccount.is_default || updatedAccounts.length === 0) {
        updatedAccounts = updatedAccounts.map((a) => ({ ...a, is_default: false }));
        editingBankAccount.is_default = true;
      }
      updatedAccounts.push(editingBankAccount);
    } else {
      updatedAccounts = updatedAccounts.map((a) => {
        if (a.id === editingBankAccount.id) {
          return editingBankAccount;
        }
        if (editingBankAccount.is_default) {
          return { ...a, is_default: false };
        }
        return a;
      });
    }

    handleSaveBankSettings(updatedAccounts, branchMappings);
    setEditingBankAccount(null);
    setIsNewAccountModal(false);
  };

  const handleAssignDefaultToAllBranches = () => {
    const updated: Record<string, string> = {};
    branches.forEach((b) => {
      updated[b.id] = "default";
    });
    setBranchMappings(updated);
    handleSaveBankSettings(bankAccounts, updated);
    toast({ 
      title: "All Branches Assigned to Default Account", 
      description: "Invoices across all branches will now show the default bank account." 
    });
  };

  // 4. Save SMTP Settings
  const saveSmtpSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/smtp_settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("ecs_token")}`
        },
        body: JSON.stringify({ value: smtpSettings })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save SMTP settings");
      }
      toast({ 
        title: "SMTP Settings Saved! 📧", 
        description: "Automated customer emails will use these outbound credentials." 
      });
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes("@")) {
      toast({ 
        title: "Recipient Email Required", 
        description: "Please enter an email address to receive the test verification email.", 
        variant: "destructive" 
      });
      return;
    }

    setTestingSmtp(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/smtp_test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("ecs_token")}`
        },
        body: JSON.stringify({
          ...smtpSettings,
          test_email: testEmailRecipient.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "SMTP test failed");
      toast({ 
        title: "✅ SMTP Test Successful!", 
        description: `Test verification email sent successfully to ${testEmailRecipient}` 
      });
    } catch (err: any) {
      toast({ title: "❌ SMTP Test Failed", description: err.message, variant: "destructive" });
    } finally {
      setTestingSmtp(false);
    }
  };

  // 5. User Management Actions
  const assignRole = async (userId: string, role: string) => {
    try {
      const resDel = await fetch(`${API_URL}/api/user_roles/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
      });
      const delData = await resDel.json();
      if (!resDel.ok && resDel.status !== 404) {
        throw new Error(delData.error || "Failed to remove old role");
      }

      if (role) {
        const resAdd = await fetch(`${API_URL}/api/user_roles`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("ecs_token")}`
          },
          body: JSON.stringify({ user_id: userId, role })
        });
        const addData = await resAdd.json();
        if (!resAdd.ok) throw new Error(addData.error || "Failed to assign role");
      }

      toast({ title: "Role updated successfully!" });
      fetchUsers();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const handleUpdateCredentials = async () => {
    if (!editingUser) return;
    setSavingUser(true);
    try {
      if (newCreds.full_name !== editingUser.full_name) {
        const { error } = await supabase.rpc("admin_update_user_full_name" as any, {
          target_user_id: editingUser.user_id,
          new_full_name: newCreds.full_name
        });
        if (error) throw error;
      }

      if (newCreds.email !== editingUser.email) {
        const { error } = await supabase.rpc("admin_update_user_email" as any, {
          target_user_id: editingUser.user_id,
          new_email: newCreds.email
        });
        if (error) throw error;
      }

      if (newCreds.password) {
        const { error } = await supabase.rpc("admin_update_user_password" as any, {
          target_user_id: editingUser.user_id,
          new_password: newCreds.password
        });
        if (error) throw error;
      }

      toast({ title: "Credentials updated successfully!" });
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSavingUser(false);
    }
  };

  const defaultAccount = bankAccounts.find((a) => a.is_default) || bankAccounts[0];

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";
  const labelCls = "text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block";

  // Categories for the top header navigation
  const categories = [
    ...(isSuperOrDev
      ? [
          {
            id: "company",
            label: "Company Profile & Contacts",
            shortLabel: "Company Profile",
            icon: Building2,
            desc: "Official name, contacts, email & invoice prefix"
          },
          {
            id: "banking",
            label: "Bank Accounts & Branches",
            shortLabel: "Bank Accounts",
            icon: Landmark,
            desc: "Multiple bank accounts, default setup & branch assignment",
            badge: `${bankAccounts.length} ${bankAccounts.length === 1 ? "Account" : "Accounts"}`
          },
          {
            id: "smtp",
            label: "Email (SMTP) Server",
            shortLabel: "Email & SMTP",
            icon: Mail,
            desc: "Email credentials & automated customer notifications",
            badge: smtpSettings.enabled ? "Active" : "Disabled",
            badgeColor: smtpSettings.enabled ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
          },
          {
            id: "users",
            label: "User Management & Roles",
            shortLabel: "Users & Roles",
            icon: Shield,
            desc: "Staff credentials, roles & permissions",
            badge: `${users.length} Users`
          }
        ]
      : []),
    {
      id: "profile",
      label: "My Profile",
      shortLabel: "My Profile",
      icon: User,
      desc: "Personal credentials & login info"
    }
  ] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ===================== TOP HEADER & CATEGORY TABS ===================== */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Layers className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black font-display text-foreground tracking-tight">System Settings & Administration</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-9">
              Configure company identity, global contact numbers, branch-specific bank accounts, email automation, and user access.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted text-muted-foreground border border-border">
            <span className="capitalize">{isDeveloper ? "Developer Mode" : roles.join(", ").replace(/_/g, " ")}</span>
          </div>
        </div>

        {/* Categories Navigation Bar */}
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id as any)}
                  className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20"
                      : "border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    {"badge" in cat && cat.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${cat.badgeColor || "bg-muted text-muted-foreground"}`}>
                        {cat.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-bold leading-tight ${isActive ? "text-primary" : "text-foreground"}`}>
                    {cat.shortLabel}
                  </span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 opacity-80">
                    {cat.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===================== CATEGORY 1: COMPANY PROFILE & CONTACTS ===================== */}
      {activeTab === "company" && isSuperOrDev && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-foreground">Official Company Profile & Global Contacts</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  These official contact numbers, email, address, and branding appear on all invoices, automated emails, receipts, and letters.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5" /> Global Sync Active
            </div>
          </div>

          {/* Real-time Notice */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/70 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <b>Real-Time Synchronization:</b> Any changes made here to <b>Company Phone Numbers</b>, <b>Email</b>, <b>Address</b>, or <b>Tax ID</b> immediately take effect everywhere across the entire system — including printed PDF invoices, salary slips, experience letters, and outgoing automated emails.
            </div>
          </div>

          <form onSubmit={saveCompanySettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Company Legal Name */}
              <div className="lg:col-span-2">
                <label className={labelCls}>Company Legal Name *</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    required
                    value={companySettings.company_name || ""}
                    onChange={(e) => setCompanySettings({ ...companySettings, company_name: e.target.value })}
                    placeholder="e.g. Electric Complaint Solutions (Pvt.) Ltd."
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>

              {/* Tax ID / NTN */}
              <div>
                <label className={labelCls}>Tax ID / NTN Number</label>
                <input
                  value={companySettings.tax_id || ""}
                  onChange={(e) => setCompanySettings({ ...companySettings, tax_id: e.target.value })}
                  placeholder="e.g. 3220139033321"
                  className={inputCls}
                />
              </div>

              {/* Official Contact Phone */}
              <div>
                <label className={labelCls}>Official Contact Phone(s) *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    required
                    value={companySettings.company_phone || ""}
                    onChange={(e) => setCompanySettings({ ...companySettings, company_phone: e.target.value })}
                    placeholder="e.g. +92 310 1111 327"
                    className={`${inputCls} pl-9`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">Shown on PDF Invoices header/footer & Email footer</span>
              </div>

              {/* Official Email */}
              <div>
                <label className={labelCls}>Official Company Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={companySettings.company_email || ""}
                    onChange={(e) => setCompanySettings({ ...companySettings, company_email: e.target.value })}
                    placeholder="e.g. ecs.isbpak@gmail.com"
                    className={`${inputCls} pl-9`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">Customer helpline & contact email</span>
              </div>

              {/* Default Resolution Time */}
              <div>
                <label className={labelCls}>Default Resolution Time (Hours)</label>
                <input
                  type="number"
                  min="1"
                  value={companySettings.default_resolution_time || 48}
                  onChange={(e) => setCompanySettings({ ...companySettings, default_resolution_time: parseInt(e.target.value) || 48 })}
                  className={inputCls}
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">Standard SLA printed on complaint receipts</span>
              </div>

              {/* Head Office Address */}
              <div className="lg:col-span-3">
                <label className={labelCls}>Head Office Official Address *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    required
                    value={companySettings.company_address || ""}
                    onChange={(e) => setCompanySettings({ ...companySettings, company_address: e.target.value })}
                    placeholder="e.g. 1st Floor, Zain Plaza, Islamabad, Pakistan"
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>

              {/* Invoice Prefix */}
              <div>
                <label className={labelCls}>Invoice Number Prefix</label>
                <input
                  value={companySettings.invoice_prefix || "ECS-"}
                  onChange={(e) => setCompanySettings({ ...companySettings, invoice_prefix: e.target.value })}
                  placeholder="e.g. ECS-"
                  className={inputCls}
                />
              </div>

              {/* Next Invoice Number */}
              <div>
                <label className={labelCls}>Next Invoice Sequence Number</label>
                <input
                  type="number"
                  value={companySettings.next_invoice_number || 1001}
                  onChange={(e) => setCompanySettings({ ...companySettings, next_invoice_number: parseInt(e.target.value) || 1001 })}
                  className={inputCls}
                />
              </div>

              {/* Authorized Signatory */}
              <div>
                <label className={labelCls}>Authorized Signatory Name</label>
                <input
                  value={companySettings.authorized_signatory || ""}
                  onChange={(e) => setCompanySettings({ ...companySettings, authorized_signatory: e.target.value })}
                  placeholder="e.g. Muhammad Aamir"
                  className={inputCls}
                />
              </div>

              {/* Signatory Designation */}
              <div>
                <label className={labelCls}>Signatory Designation</label>
                <input
                  value={companySettings.signatory_designation || ""}
                  onChange={(e) => setCompanySettings({ ...companySettings, signatory_designation: e.target.value })}
                  placeholder="e.g. Chief Executive Officer"
                  className={inputCls}
                />
              </div>

              {/* Invoice Terms & Conditions */}
              <div className="lg:col-span-2">
                <label className={labelCls}>Invoice Notes / Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={companySettings.terms_and_conditions || ""}
                  onChange={(e) => setCompanySettings({ ...companySettings, terms_and_conditions: e.target.value })}
                  placeholder="Payment is due within 7 days. Thank you for your business."
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                type="submit"
                disabled={savingCompany}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingCompany ? "Saving Changes..." : "Save Company Profile & Contacts"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================== CATEGORY 2: BANK ACCOUNTS & BRANCH MAPPING ===================== */}
      {activeTab === "banking" && isSuperOrDev && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header & Bank Accounts Management */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-display text-foreground">Company Bank Accounts & Multi-Bank Setup</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add multiple bank accounts and designate one as the <b>Default Account</b>. You can assign separate accounts to individual branches.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingBankAccount({
                    id: `acc-${Date.now()}`,
                    bank_name: "",
                    account_title: companySettings.company_name || "ECS (PVT) Ltd",
                    account_number: "",
                    iban: "",
                    branch_name: "",
                    notes: "",
                    is_default: bankAccounts.length === 0
                  });
                  setIsNewAccountModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add New Bank Account
              </button>
            </div>

            {/* List of Configured Bank Accounts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    acc.is_default
                      ? "border-emerald-500 bg-emerald-500/5 shadow-sm ring-1 ring-emerald-500/30"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Landmark className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-sm leading-tight">{acc.bank_name}</h4>
                          <span className="text-[10px] text-muted-foreground">{acc.branch_name || "Main Branch"}</span>
                        </div>
                      </div>

                      {acc.is_default ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Star className="w-3 h-3 fill-emerald-600" /> Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAccount(acc.id)}
                          className="text-[10px] font-bold text-muted-foreground hover:text-emerald-700 bg-muted px-2 py-0.5 rounded-full hover:bg-emerald-50 transition-colors"
                        >
                          Make Default
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Account Title:</span>
                        <span className="font-semibold text-foreground">{acc.account_title}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">IBAN / Account Number:</span>
                        <span className="font-mono font-bold text-primary tracking-wide">{acc.iban || acc.account_number}</span>
                      </div>
                      {acc.notes && (
                        <div className="text-[11px] text-muted-foreground italic pt-1">
                          "{acc.notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBankAccount({ ...acc });
                        setIsNewAccountModal(false);
                      }}
                      className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit Account Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBankAccount(acc.id)}
                      className="p-1.5 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Branch-Wise Bank Account Assignment */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                  Branch-Wise Bank Account Assignment
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                    {branches.length} Branches
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Super Admin can assign a dedicated bank account to each branch. Invoices generated from that branch's portal will automatically display its assigned account.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAssignDefaultToAllBranches}
                  className="px-3 py-2 rounded-xl border border-border bg-muted/60 hover:bg-muted text-xs font-bold text-foreground transition-colors"
                >
                  Assign Default Account to All
                </button>
                <button
                  type="button"
                  disabled={savingBanking}
                  onClick={() => handleSaveBankSettings(bankAccounts, branchMappings)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingBanking ? "Saving..." : "Save Branch Assignments"}
                </button>
              </div>
            </div>

            {branches.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No branches registered yet. Add branches in Branch Management.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-left">
                      <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Branch</th>
                      <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Location / City</th>
                      <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Assigned Bank Account for Invoices</th>
                      <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Invoice Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {branches.map((b) => {
                      const assignedAccId = branchMappings[b.id] || "default";
                      const effectiveAcc =
                        assignedAccId === "default"
                          ? defaultAccount
                          : bankAccounts.find((a) => a.id === assignedAccId) || defaultAccount;

                      return (
                        <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-bold text-foreground block">{b.name}</span>
                            <span className="text-[11px] font-mono text-muted-foreground">{b.branch_code || "Branch Code: —"}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {b.city || b.address || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={assignedAccId}
                              onChange={(e) => {
                                const newMappings = { ...branchMappings, [b.id]: e.target.value };
                                setBranchMappings(newMappings);
                              }}
                              className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary w-full max-w-sm"
                            >
                              <option value="default">
                                ★ Use Default ({defaultAccount?.bank_name} - {defaultAccount?.iban?.slice(-6)})
                              </option>
                              {bankAccounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.bank_name} ({acc.account_title} - {acc.iban})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-primary">{effectiveAcc?.bank_name}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">{effectiveAcc?.iban || effectiveAcc?.account_number}</span>
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

          {/* Add / Edit Bank Account Modal */}
          {editingBankAccount && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">
                        {isNewAccountModal ? "Add New Bank Account" : "Edit Bank Account"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Enter bank title and account details for invoice payment collection.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveAccountModal} className="space-y-4">
                  <div>
                    <label className={labelCls}>Bank Name *</label>
                    <input
                      required
                      value={editingBankAccount.bank_name}
                      onChange={(e) => setEditingBankAccount({ ...editingBankAccount, bank_name: e.target.value })}
                      placeholder="e.g. Habib Bank Limited (HBL), Meezan Bank"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Account Title *</label>
                      <input
                        required
                        value={editingBankAccount.account_title}
                        onChange={(e) => setEditingBankAccount({ ...editingBankAccount, account_title: e.target.value })}
                        placeholder="e.g. ECS (PVT) Ltd"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Bank Branch Name / Code</label>
                      <input
                        value={editingBankAccount.branch_name || ""}
                        onChange={(e) => setEditingBankAccount({ ...editingBankAccount, branch_name: e.target.value })}
                        placeholder="e.g. Blue Area, Islamabad"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Account Number</label>
                      <input
                        value={editingBankAccount.account_number || ""}
                        onChange={(e) => setEditingBankAccount({ ...editingBankAccount, account_number: e.target.value })}
                        placeholder="e.g. 0050417901614255"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>IBAN *</label>
                      <input
                        required
                        value={editingBankAccount.iban}
                        onChange={(e) => setEditingBankAccount({ ...editingBankAccount, iban: e.target.value })}
                        placeholder="e.g. PK00HBL0050417901614255"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Notes / Description</label>
                    <input
                      value={editingBankAccount.notes || ""}
                      onChange={(e) => setEditingBankAccount({ ...editingBankAccount, notes: e.target.value })}
                      placeholder="e.g. Main collection account for North region"
                      className={inputCls}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={editingBankAccount.is_default}
                      onChange={(e) => setEditingBankAccount({ ...editingBankAccount, is_default: e.target.checked })}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                    />
                    <span>Set as Primary Default Account for all branches</span>
                  </label>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setEditingBankAccount(null)}
                      className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-95"
                    >
                      {isNewAccountModal ? "Add Account" : "Update Account"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== CATEGORY 3: EMAIL (SMTP) SERVER CONFIGURATION ===================== */}
      {activeTab === "smtp" && isSuperOrDev && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                  SMTP / Email Server Configuration
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${smtpSettings.enabled ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {smtpSettings.enabled ? "Active" : "Disabled"}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure outbound email credentials to automatically notify customers on registration, complaint creation, status updates, and invoice generation.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={smtpSettings.enabled}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, enabled: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary w-4 h-4"
              />
              Enable Automated Emails
            </label>
          </div>

          {/* Automated Emails Feature Callout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Welcome Email</div>
                <div className="text-[11px] text-muted-foreground leading-tight">Sent automatically when a customer registers.</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Complaint Creation</div>
                <div className="text-[11px] text-muted-foreground leading-tight">Sent with complaint #, tracking ID, and serial #.</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-md bg-amber-50 text-amber-600 shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Status Updates</div>
                <div className="text-[11px] text-muted-foreground leading-tight">Sent on progress, resolution, and solved events.</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-md bg-purple-50 text-purple-600 shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">PDF Invoice Email</div>
                <div className="text-[11px] text-muted-foreground leading-tight">Sent with bill breakdown & branch bank account info.</div>
              </div>
            </div>
          </div>

          <form onSubmit={saveSmtpSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>SMTP Host *</label>
                <div className="relative">
                  <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    required
                    value={smtpSettings.host}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                    placeholder="e.g. smtp.gmail.com or mail.ecs.it.com"
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>SMTP Port *</label>
                <input
                  type="number"
                  required
                  value={smtpSettings.port}
                  onChange={(e) => {
                    const port = parseInt(e.target.value) || 587;
                    setSmtpSettings({
                      ...smtpSettings,
                      port,
                      secure: port === 465
                    });
                  }}
                  placeholder="587, 465, or 25"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Encryption / Security</label>
                <select
                  value={smtpSettings.secure ? "ssl" : "tls"}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, secure: e.target.value === "ssl" })}
                  className={inputCls}
                >
                  <option value="tls">STARTTLS (Port 587 / 25)</option>
                  <option value="ssl">SSL / TLS (Port 465)</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>SMTP Username / Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={smtpSettings.user}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
                    placeholder="sender@example.com"
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>SMTP Password / App Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showSmtpPass ? "text" : "password"}
                    required
                    value={smtpSettings.pass}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, pass: e.target.value })}
                    placeholder="••••••••••••"
                    className={`${inputCls} pl-9 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelCls}>Sender Display Name</label>
                <input
                  value={smtpSettings.sender_name}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, sender_name: e.target.value })}
                  placeholder="e.g. Electric Complaint Solutions"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Sender Email (From Header)</label>
                <input
                  type="email"
                  value={smtpSettings.sender_email}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, sender_email: e.target.value })}
                  placeholder="Defaults to SMTP username if blank"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Test Email Bar */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex-1 max-w-md">
                <label className="text-[11px] font-bold text-blue-900 uppercase block mb-1">Send Test Verification Email</label>
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full rounded-lg border border-blue-200 bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 items-end">
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-blue-300 bg-white text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {testingSmtp ? "Testing Connection..." : "Send Test Email"}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingSmtp}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingSmtp ? "Saving..." : "Save SMTP Settings"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================== CATEGORY 4: USER MANAGEMENT & ROLES ===================== */}
      {activeTab === "users" && isSuperOrDev && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-card-foreground">Add New System User</h3>
                <p className="text-xs text-muted-foreground">Create administrative, branch-level, or staff accounts.</p>
              </div>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const email = (f.elements.namedItem("email") as HTMLInputElement).value;
              const password = (f.elements.namedItem("password") as HTMLInputElement).value;
              const name = (f.elements.namedItem("name") as HTMLInputElement).value;
              const role = (f.elements.namedItem("role") as HTMLSelectElement).value;

              if (!email || !password || !name || !role) { toast({ title: "All fields required", variant: "destructive" }); return; }

              setSavingUser(true);
              try {
                const { data: authData, error: authErr } = await supabase.auth.signUp({
                  email,
                  password,
                  options: { data: { full_name: name } }
                });
                if (authErr) throw authErr;
                if (!authData.user) throw new Error("Failed to create user");

                const res = await fetch(`${API_URL}/api/user_roles`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("ecs_token")}`
                  },
                  body: JSON.stringify({ user_id: authData.user.id, role })
                });
                
                if (!res.ok) {
                  const data = await res.json();
                  throw new Error(data.error || "User created but role assignment failed");
                }

                toast({ title: `${role.replace("_", " ")} created successfully!` });
                f.reset();
                fetchUsers();
              } catch (err: any) {
                toast({ title: err.message, variant: "destructive" });
              } finally {
                setSavingUser(false);
              }
            }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div><label className={labelCls}>Full Name</label><input name="name" required placeholder="User's full name" className={inputCls} /></div>
              <div><label className={labelCls}>Email Address</label><input name="email" type="email" required placeholder="user@company.com" className={inputCls} /></div>
              <div><label className={labelCls}>Password</label><input name="password" type="password" required placeholder="••••••••" className={inputCls} /></div>
              <div>
                <label className={labelCls}>Role Permission</label>
                <select name="role" required className={inputCls}>
                  <option value="">Select Role</option>
                  <option value="branch_admin">Branch Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="view_only">View Only</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button type="submit" disabled={savingUser} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-95">
                  <User className="w-4 h-4" /> Create User
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-bold font-display text-card-foreground mb-4">Existing Users & Permissions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">User</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Role</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => {
                    const currentRole = u.user_roles?.[0]?.role || "";
                    return (
                      <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">{u.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {currentRole.replace("_", " ") || "No role"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={currentRole}
                              onChange={(e) => assignRole(u.user_id, e.target.value)}
                              className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">No Role</option>
                              <option value="branch_admin">Branch Admin</option>
                              <option value="super_admin">Super Admin</option>
                              <option value="view_only">View Only</option>
                            </select>
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setNewCreds({ email: u.email || "", password: "", full_name: u.full_name || "" });
                              }}
                              className="p-1.5 rounded-lg border border-input hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit Credentials"
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== CATEGORY 5: MY PROFILE ===================== */}
      {activeTab === "profile" && (
        <div className="max-w-xl rounded-2xl border border-border bg-card p-6 shadow-card space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-card-foreground">My Profile</h3>
              <p className="text-xs text-muted-foreground">Manage your display name and login information.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Email Address</label>
              <input value={user?.email || ""} disabled className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground" />
            </div>
            <div>
              <label className={labelCls}>Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!isSuperOrDev}
                className={`${inputCls} ${!isSuperOrDev ? "bg-muted text-muted-foreground" : ""}`}
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isSuperOrDev}
                className={`${inputCls} ${!isSuperOrDev ? "bg-muted text-muted-foreground" : ""}`}
              />
            </div>
            <div>
              <label className={labelCls}>Assigned Role</label>
              <input
                value={isDeveloper ? "Developer" : roles.map((r) => r.replace("_", " ")).join(", ") || "No role assigned"}
                disabled
                className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground capitalize"
              />
            </div>

            {isSuperOrDev ? (
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95"
              >
                <Save className="w-4 h-4" /> {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            ) : (
              <div className="p-3 rounded-lg bg-muted border border-border flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                <Shield className="w-3.5 h-3.5" /> Identity editing managed by administrator
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary"><UserCog className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-foreground">Edit User Credentials</h3>
                  <p className="text-xs text-muted-foreground">{editingUser.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={newCreds.full_name}
                    onChange={(e) => setNewCreds({ ...newCreds, full_name: e.target.value })}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={newCreds.email}
                    onChange={(e) => setNewCreds({ ...newCreds, email: e.target.value })}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>New Password (leave blank to keep current)</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newCreds.password}
                    onChange={(e) => setNewCreds({ ...newCreds, password: e.target.value })}
                    placeholder="••••••••"
                    className={`${inputCls} pl-9 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCredentials}
                  disabled={savingUser}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {savingUser ? "Processing..." : "Update User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
