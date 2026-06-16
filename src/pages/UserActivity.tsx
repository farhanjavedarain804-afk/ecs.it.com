import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
    Activity, Search, ShieldCheck, Mail, History,
    MapPin, Monitor, Clock, ShieldAlert, KeyRound,
    Trash2, Filter, Download
} from "lucide-react";

const UserActivity = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const { toast } = useToast();
    const { hasRole, profile, isDeveloper } = useAuth();

    const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const isBranchAdmin = hasRole("branch_admin") && !hasRole("super_admin");
        const branchId = profile?.branch_id;

        try {
            // 1. Fetch Profiles
            let profileQuery = supabase
                .from("profiles")
                .select("*");

            // Note: is_active might be missing, so we handle it gracefully in the UI or fetch all
            if (isBranchAdmin && branchId) {
                profileQuery = profileQuery.eq("branch_id", branchId);
            }

            const { data: profileData, error: profErr } = await profileQuery.order("created_at", { ascending: false });

            if (profErr) throw profErr;

            // 2. Fetch Roles
            const { data: roleData, error: roleErr } = await supabase
                .from("user_roles")
                .select("user_id, role");

            if (roleErr) throw roleErr;

            // 3. Fetch Branches
            let branchQuery = supabase.from("branches").select("id, name");
            if (isBranchAdmin && branchId) {
                branchQuery = branchQuery.eq("id", branchId);
            }
            const { data: branchData } = await branchQuery;

            // 4. Combine data
            const combinedUsers = (profileData || []).map(p => ({
                ...p,
                branch: (branchData || []).find(b => b.id === p.branch_id),
                user_roles: (roleData || []).filter(r => r.user_id === p.user_id)
            }));

            setUsers(combinedUsers);

            // 5. Fetch Logs (Using enhanced backend route)
            let logQuery = supabase
                .from("activity_logs" as any)
                .select("*");

            if (isBranchAdmin && branchId) {
                logQuery = (logQuery as any).eq("branch_id", branchId);
            }

            const { data: logData, error: logErr } = await (logQuery
                .order("created_at", { ascending: false })
                .limit(200) as any);

            if (logErr) throw logErr;
            setLogs(logData || []);
        } catch (err: any) {
            console.error("Fetch error:", err);
            toast({ title: "Error fetching data", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleResetPassword = async (userName: string) => {
        // If we have an email in the logs for this user, we use it
        const userLog = logs.find(l => l.user_id === users.find(u => u.full_name === userName)?.user_id);
        const email = userLog?.user_email || (userName.includes("@") ? userName : null);

        if (!email) {
            toast({ title: "Email not found", description: "Could not find an email address for this user in logs.", variant: "destructive" });
            return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/dashboard/settings`,
        });

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Reset link sent", description: `A password reset link has been sent to ${email}` });
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!hasRole("super_admin")) {
            toast({ title: "Permission Denied", description: "Only super admins can delete users permanently.", variant: "destructive" });
            return;
        }

        const targetUser = users.find(u => u.user_id === userId);
        const isTargetDev = targetUser?.email === "farhanjaved357@gmail.com" || targetUser?.user_roles?.some((r: any) => r.role === 'developer');

        if (isTargetDev && !isDeveloper) {
            toast({ title: "System Protection", description: "Developer accounts cannot be deleted by Super Admins.", variant: "destructive" });
            return;
        }

        if (!window.confirm(`CRITICAL: Are you sure you want to PERMANENTLY delete ${userName}? This will remove their profile, roles, and attendance records.`)) {
            return;
        }

        try {
            const { error } = await (supabase.rpc("delete_user_permanently", { target_user_id: userId }) as any);

            if (error) throw error;

            toast({ title: "User Deleted", description: `${userName} has been removed from the system.` });
            fetchData();
        } catch (err: any) {
            toast({ title: "Deletion Failed", description: err.message, variant: "destructive" });
        }
    };

    const filteredLogs = logs.filter(l => {
        const matchesSearch = !search ||
            l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
            l.ip_address?.includes(search) ||
            l.activity_type?.includes(search);

        const matchesUser = !selectedUserEmail || l.user_email === selectedUserEmail;

        return matchesSearch && matchesUser;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-primary" /> User Activity & Monitoring
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Review system logs, IP addresses, and login history.</p>
                </div>
                <div className="flex gap-2">
                    {selectedUserEmail && (
                        <button
                            onClick={() => setSelectedUserEmail(null)}
                            className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all border border-primary/20"
                        >
                            Show All Logs
                        </button>
                    )}
                    <button onClick={fetchData} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
                        <Download className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><Activity className="w-4 h-4 text-primary" /></div>
                    <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Users</p><p className="text-2xl font-bold text-foreground mt-0.5">{users.length}</p></div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10"><ShieldAlert className="w-4 h-4 text-destructive" /></div>
                    <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Super Admins</p><p className="text-2xl font-bold text-foreground mt-0.5">{users.filter(u => u.user_roles?.some((r: any) => r.role === 'super_admin')).length}</p></div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-warning/10"><ShieldCheck className="w-4 h-4 text-warning" /></div>
                    <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Branch Admins</p><p className="text-2xl font-bold text-foreground mt-0.5">{users.filter(u => u.user_roles?.some((r: any) => r.role === 'branch_admin')).length}</p></div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-success/10"><History className="w-4 h-4 text-success" /></div>
                    <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Log Entries</p><p className="text-2xl font-bold text-foreground mt-0.5">{logs.length}</p></div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left: Active Personnel */}
                <div className="xl:col-span-1 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Active Personnel
                    </h3>
                    <div className="space-y-3">
                        {users.map((u) => {
                            const userEmail = logs.find(l => l.user_id === u.user_id)?.user_email || (u.full_name.includes("@") ? u.full_name : "No email logged");
                            const isSelected = selectedUserEmail === userEmail;

                            return (
                                <div key={u.id}
                                    onClick={() => userEmail !== "No email logged" && setSelectedUserEmail(userEmail)}
                                    className={`bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-all group cursor-pointer ${isSelected ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border'}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                {u.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-foreground text-sm">{u.full_name}</h4>
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <Mail className="w-3 h-3" /> {userEmail}
                                                    </p>
                                                    <p className="text-[10px] text-primary font-bold uppercase tracking-tighter">
                                                        {u.user_roles?.[0]?.role?.replace("_", " ") || "No Role"} {u.branch ? `• ${u.branch.name}` : ""}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleResetPassword(u.full_name); }}
                                                className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                                title="Send Reset Link"
                                            >
                                                <KeyRound className="w-4 h-4" />
                                            </button>
                                            {hasRole("super_admin") && (
                                                (() => {
                                                    const targetEmail = logs.find(l => l.user_id === u.user_id)?.user_email || u.email;
                                                    const isTargetDev = targetEmail === "farhanjaved357@gmail.com" || u.user_roles?.some((r: any) => r.role === 'developer');

                                                    if (isTargetDev && !isDeveloper) {
                                                        return (
                                                            <div className="p-1.5 text-muted-foreground/30" title="System Protected">
                                                                <ShieldAlert className="w-4 h-4" />
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.user_id, u.full_name); }}
                                                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                                                            title="Delete User Permanently"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    );
                                                })()
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Activity Stream */}
                <div className="xl:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <History className="w-4 h-4" /> Audit Logs
                        </h3>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Filter logs..."
                                className="w-full bg-muted/30 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border">
                                        <th className="text-left font-bold text-muted-foreground px-4 py-3 uppercase tracking-wider">User</th>
                                        <th className="text-left font-bold text-muted-foreground px-4 py-3 uppercase tracking-wider">Event</th>
                                        <th className="text-left font-bold text-muted-foreground px-4 py-3 uppercase tracking-wider">IP Address</th>
                                        <th className="text-left font-bold text-muted-foreground px-4 py-3 uppercase tracking-wider">Platform</th>
                                        <th className="text-left font-bold text-muted-foreground px-4 py-3 uppercase tracking-wider">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {loading ? (
                                        <tr><td colSpan={5} className="py-12 text-center text-muted-foreground italic">Updating secure logs...</td></tr>
                                    ) : filteredLogs.length === 0 ? (
                                        <tr><td colSpan={5} className="py-12 text-center text-muted-foreground italic">No activities recorded.</td></tr>
                                    ) : filteredLogs.map((l) => (
                                        <tr key={l.id} className="hover:bg-muted/20 transition-colors group">
                                            <td className="px-4 py-4">
                                                <p className="font-semibold text-foreground">{l.user_email || "System"}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className={`w-fit px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${l.activity_type.includes('CREATED') || l.activity_type.includes('GENERATED') || l.activity_type === 'login' ? 'bg-success/10 text-success border border-success/20' :
                                                        l.activity_type.includes('DELETED') ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                                                            'bg-primary/10 text-primary border border-primary/20'
                                                        }`}>
                                                        {l.activity_type.replace(/_/g, " ")}
                                                    </span>
                                                    {l.metadata?.complaintNumber && <p className="text-[9px] text-muted-foreground">Complaint: {l.metadata.complaintNumber}</p>}
                                                    {l.metadata?.invoiceNumber && <p className="text-[9px] text-muted-foreground">Invoice: {l.metadata.invoiceNumber}</p>}
                                                    {l.metadata?.staffName && <p className="text-[9px] text-muted-foreground">Staff: {l.metadata.staffName}</p>}
                                                    {l.metadata?.customerName && <p className="text-[9px] text-muted-foreground">Customer: {l.metadata.customerName}</p>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                                                    <MapPin className="w-3 h-3" /> {l.ip_address || "Internal"}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-muted-foreground max-w-[150px] truncate" title={l.user_agent}>
                                                    <Monitor className="w-3 h-3" /> {l.user_agent?.split('(')[1]?.split(')')[0] || "Desktop"}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Clock className="w-3 h-3" /> {new Date(l.created_at).toLocaleString()}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                        <ShieldAlert className="w-5 h-5 text-primary" />
                        <p className="text-xs text-primary/80 leading-relaxed font-medium">
                            <strong>Security Protocol:</strong> Plain-text passwords are never stored in the database.
                            To secure an account, use the <strong>Reset Password</strong> action to send a verified reset link to the personnel.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserActivity;
