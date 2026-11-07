import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, Shield, Save, Building, Landmark, ListChecks, Key, Mail, 
  UserCog, Eye, EyeOff, Send, Server, CheckCircle2, AlertCircle, RefreshCw, Lock
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const Settings = () => {
  const { user, profile, roles, hasRole, isDeveloper } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // User management (super admin)
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newCreds, setNewCreds] = useState({ email: "", password: "", full_name: "" });

  // Company Settings (super admin)
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);

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

  const API_URL = import.meta.env.VITE_API_URL ?? '';

  useEffect(() => {
    setFullName(profile?.full_name || "");
    if (hasRole("super_admin") || isDeveloper) {
      fetchUsers();
      fetchCompanySettings();
      fetchSmtpSettings();
    }
  }, [profile, roles, isDeveloper]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data } = await supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoadingUsers(false);
  };

  const fetchCompanySettings = async () => {
    setLoadingCompany(true);
    const { data } = await supabase.from("company_settings" as any).select("*").single();
    if (data) setCompanySettings(data);
    setLoadingCompany(false);
  };

  const fetchSmtpSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/smtp_settings`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.value) {
          setSmtpSettings(prev => ({ ...prev, ...data.value }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch SMTP settings:", e);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("user_id", user.id);
    if (error) { toast({ title: error.message, variant: "destructive" }); }
    else { toast({ title: "Profile updated!" }); }
    setSaving(false);
  };

  const handleUpdateCredentials = async () => {
    if (!editingUser) return;
    setSaving(true);
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
      setSaving(false);
    }
  };

  const saveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("company_settings" as any).update(companySettings).eq("id", companySettings.id);
    if (error) { toast({ title: error.message, variant: "destructive" }); }
    else { toast({ title: "Company settings updated!" }); }
    setSaving(false);
  };

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
        title: "SMTP Settings Saved!", 
        description: "Automated customer emails (welcome note, complaint receipt, status update, invoice) will use these credentials." 
      });
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
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

  const assignRole = async (userId: string, role: string) => {
    try {
      const resDel = await fetch(`${API_URL}/api/user_roles/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ecs_token')}`
        }
      });
      
      const delData = await resDel.json();
      if (!resDel.ok && resDel.status !== 404) {
        throw new Error(delData.error || "Failed to remove old role");
      }

      if (role) {
        const resAdd = await fetch(`${API_URL}/api/user_roles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('ecs_token')}`
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

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";
  const labelCls = "text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold font-display text-foreground">System Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your profile, company identity, SMTP email configuration, and user permissions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
            <h3 className="text-lg font-semibold font-display text-card-foreground">My Profile</h3>
          </div>
          <div className="space-y-4">
            <div><label className={labelCls}>Email Address</label><input value={user?.email || ""} disabled className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground" /></div>
            <div>
              <label className={labelCls}>Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!hasRole("super_admin")}
                className={`${inputCls} ${!hasRole("super_admin") ? "bg-muted text-muted-foreground" : ""}`}
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!hasRole("super_admin")}
                className={`${inputCls} ${!hasRole("super_admin") ? "bg-muted text-muted-foreground" : ""}`}
              />
            </div>
            <div><label className={labelCls}>Role</label><input value={isDeveloper ? "Developer" : roles.map((r) => r.replace("_", " ")).join(", ") || "No role assigned"} disabled className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground capitalize" /></div>

            {hasRole("super_admin") ? (
              <button onClick={saveProfile} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Profile"}
              </button>
            ) : (
              <div className="p-3 rounded-lg bg-muted border border-border flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                <Shield className="w-3.5 h-3.5" /> Identity editing restricted by administrator
              </div>
            )}
          </div>
        </div>

        {/* Company Settings (Super Admin Only) */}
        {hasRole("super_admin") && companySettings && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building className="w-5 h-5 text-primary" /></div>
              <h3 className="text-lg font-semibold font-display text-card-foreground">Company Profile & Banking</h3>
            </div>
            <form onSubmit={saveCompanySettings} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Company Name</label>
                  <input value={companySettings.company_name || ""} onChange={(e) => setCompanySettings({ ...companySettings, company_name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input value={companySettings.company_phone || ""} onChange={(e) => setCompanySettings({ ...companySettings, company_phone: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input value={companySettings.company_email || ""} onChange={(e) => setCompanySettings({ ...companySettings, company_email: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Tax ID / NTN</label>
                  <input value={companySettings.tax_id || ""} onChange={(e) => setCompanySettings({ ...companySettings, tax_id: e.target.value })} placeholder="1234567-8" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Address</label>
                  <input value={companySettings.company_address || ""} onChange={(e) => setCompanySettings({ ...companySettings, company_address: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Default Resolution Time (Hours)</label>
                  <input type="number" value={companySettings.default_resolution_time || 24} onChange={(e) => setCompanySettings({ ...companySettings, default_resolution_time: parseInt(e.target.value) })} className={inputCls} />
                </div>
                <div className="col-span-2 p-3 bg-muted/30 rounded-lg border border-border mt-2">
                  <h4 className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase mb-3"><Landmark className="w-3 h-3" /> Bank Details (Invoice Footer)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] font-bold text-muted-foreground uppercase">Bank Name</label><input value={companySettings.bank_name || ""} onChange={(e) => setCompanySettings({ ...companySettings, bank_name: e.target.value })} placeholder="HBL" className={inputCls} /></div>
                    <div><label className="text-[10px] font-bold text-muted-foreground uppercase">Account Title</label><input value={companySettings.account_title || ""} onChange={(e) => setCompanySettings({ ...companySettings, account_title: e.target.value })} placeholder="Elite Cooling Solutions" className={inputCls} /></div>
                    <div className="col-span-2"><label className="text-[10px] font-bold text-muted-foreground uppercase">IBAN / Account #</label><input value={companySettings.iban || ""} onChange={(e) => setCompanySettings({ ...companySettings, iban: e.target.value })} placeholder="PK00HBL00..." className={inputCls} /></div>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Invoice Prefix</label>
                  <input value={companySettings.invoice_prefix || ""} onChange={(e) => setCompanySettings({ ...companySettings, invoice_prefix: e.target.value })} placeholder="ECS-" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Next Number</label>
                  <input type="number" value={companySettings.next_invoice_number || ""} onChange={(e) => setCompanySettings({ ...companySettings, next_invoice_number: parseInt(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Authorized Signatory</label>
                  <input value={companySettings.authorized_signatory || ""} onChange={(e) => setCompanySettings({ ...companySettings, authorized_signatory: e.target.value })} placeholder="Authorized Signatory Name" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Signatory Designation</label>
                  <input value={companySettings.signatory_designation || ""} onChange={(e) => setCompanySettings({ ...companySettings, signatory_designation: e.target.value })} placeholder="e.g. HR Manager" className={inputCls} />
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-95">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Update Company Branding"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* SMTP / IMAP Email Configuration (Super Admin & Developer) */}
      {(hasRole("super_admin") || isDeveloper) && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold font-display text-card-foreground flex items-center gap-2">
                  SMTP / Email Server Configuration
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${smtpSettings.enabled ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {smtpSettings.enabled ? "Active" : "Disabled"}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure your email credentials to automatically send welcome notes, complaint receipts, status updates, and PDF invoices to customers.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 p-4 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Welcome Email</div>
                <div className="text-[11px] text-muted-foreground leading-tight">Sent automatically when a new customer registers.</div>
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
                <div className="text-[11px] text-muted-foreground leading-tight">Sent with bill summary, bank transfer details & helpline info.</div>
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
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingSmtp ? "Saving..." : "Save SMTP Settings"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Management (Super Admin) */}
      {hasRole("super_admin") && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Shield className="w-5 h-5 text-primary" /></div>
              <h3 className="text-lg font-semibold font-display text-card-foreground">Add New System User</h3>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const email = (f.elements.namedItem('email') as HTMLInputElement).value;
              const password = (f.elements.namedItem('password') as HTMLInputElement).value;
              const name = (f.elements.namedItem('name') as HTMLInputElement).value;
              const role = (f.elements.namedItem('role') as HTMLSelectElement).value;

              if (!email || !password || !name || !role) { toast({ title: "All fields required", variant: "destructive" }); return; }

              setSaving(true);
              try {
                const { data: authData, error: authErr } = await supabase.auth.signUp({
                  email,
                  password,
                  options: { data: { full_name: name } }
                });
                if (authErr) throw authErr;
                if (!authData.user) throw new Error("Failed to create user");

                const res = await fetch(`${API_URL}/api/user_roles`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('ecs_token')}`
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
                setSaving(false);
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
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-95">
                  <User className="w-4 h-4" /> Create User
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold font-display text-card-foreground mb-4">Existing Users & Permissions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">User</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Role</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                </tr></thead>
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
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {saving ? "Processing..." : "Update User"}
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
