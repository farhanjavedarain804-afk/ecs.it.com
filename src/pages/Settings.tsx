import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Shield, Save, Building, Landmark, ListChecks, Key, Mail, UserCog, Eye, EyeOff } from "lucide-react";
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

  useEffect(() => {
    setFullName(profile?.full_name || "");
    if (hasRole("super_admin")) {
      fetchUsers();
      fetchCompanySettings();
    }
  }, [profile, roles]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data } = await supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoadingUsers(false);
  };

  const fetchCompanySettings = async () => {
    setLoadingCompany(true);
    const { data, error } = await supabase.from("company_settings" as any).select("*").single();
    if (data) setCompanySettings(data);
    setLoadingCompany(false);
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
      // 1. Update Full Name if changed
      if (newCreds.full_name !== editingUser.full_name) {
        const { error } = await supabase.rpc("admin_update_user_full_name" as any, {
          target_user_id: editingUser.user_id,
          new_full_name: newCreds.full_name
        });
        if (error) throw error;
      }

      // 2. Update Email if changed
      if (newCreds.email !== editingUser.email) {
        const { error } = await supabase.rpc("admin_update_user_email" as any, {
          target_user_id: editingUser.user_id,
          new_email: newCreds.email
        });
        if (error) throw error;
      }

      // 3. Update Password if provided
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

  const assignRole = async (userId: string, role: string) => {
    try {
      // First delete current role (backend will handle protection)
      const resDel = await fetch(`${import.meta.env.VITE_API_URL}/api/user_roles/${userId}`, {
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
        const resAdd = await fetch(`${import.meta.env.VITE_API_URL}/api/user_roles`, {
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
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold font-display text-foreground mb-6">System Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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
                // 1. Create Auth User & Profile
                const { data: authData, error: authErr } = await supabase.auth.signUp({
                  email,
                  password,
                  options: { data: { full_name: name } }
                });
                if (authErr) throw authErr;
                if (!authData.user) throw new Error("Failed to create user");

                // 2. Assign Role via Backend API
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user_roles`, {
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
            }} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div><label className={labelCls}>Full Name</label><input name="name" placeholder="Farhan Javed" className={inputCls} /></div>
              <div><label className={labelCls}>Email</label><input name="email" type="email" placeholder="user@example.com" className={inputCls} /></div>
              <div><label className={labelCls}>Password</label><input name="password" type="password" className={inputCls} /></div>
              <div>
                <label className={labelCls}>Access Level</label>
                <select name="role" className={inputCls}>
                  <option value="super_admin">Super Admin (Full Access)</option>
                  {isDeveloper && <option value="developer">Developer (System)</option>}
                </select>
              </div>
              <div className="sm:col-span-4">
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  <Shield className="w-4 h-4" /> {saving ? "Creating..." : "Create System User"}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center"><ListChecks className="w-5 h-5 text-secondary" /></div>
              <h3 className="text-lg font-semibold font-display text-card-foreground">User Permissions Hub</h3>
            </div>
            {loadingUsers ? (
              <div className="flex justify-center py-8"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-sm">No users found.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Name</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Current Role</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Assign Role</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Credentials</th>
                  </tr></thead>
                  <tbody>
                    {users.map((u) => {
                      const isTargetDeveloper = u.email === "farhanjaved357@gmail.com";
                      const canManage = isDeveloper || !isTargetDeveloper;

                      return (
                        <tr key={u.id} className="border-t border-border hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{u.full_name}</div>
                            <div className="text-[10px] text-muted-foreground">{u.email}</div>
                          </td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md text-xs font-medium ${u.is_active ? "bg-green-100 text-green-700" : "bg-destructive/10 text-destructive"}`}>{u.is_active ? "Active" : "Inactive"}</span></td>
                          <td className="px-4 py-3 capitalize text-foreground">{u.user_roles?.[0]?.role?.replace("_", " ") || "None"}</td>
                          <td className="px-4 py-3">
                            <select
                                value={u.user_roles?.[0]?.role || ""}
                                onChange={(e) => assignRole(u.user_id, e.target.value)}
                                disabled={!canManage}
                                className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                              >
                                <option value="">No Role</option>
                                <option value="super_admin">Super Admin</option>
                                <option value="branch_admin">Branch Admin</option>
                                <option value="developer" disabled={!isDeveloper}>Developer</option>
                              </select>
                          </td>
                          <td className="px-4 py-3">
                            {canManage ? (
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setNewCreds({ email: u.email || "", password: "", full_name: u.full_name || "" });
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/5 px-2.5 py-1.5 rounded-lg border border-primary/10"
                              >
                                <UserCog className="w-3.5 h-3.5" /> Manage
                              </button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 border border-border px-2 py-1.5 rounded-lg italic">
                                <Shield className="w-3 h-3" /> System Restricted
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md border border-border rounded-2xl shadow-elevated overflow-hidden scale-in-center">
            <div className="p-6 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary"><UserCog className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-foreground">Manage Credentials</h3>
                  <p className="text-[11px] text-muted-foreground">Modify sensitive user information</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Full Name</label>
                <input
                  value={newCreds.full_name}
                  onChange={(e) => setNewCreds({ ...newCreds, full_name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
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
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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

