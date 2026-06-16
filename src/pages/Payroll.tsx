import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
    Users, Building2, Search, FileText,
    PlusCircle, CheckCircle2, History, Wallet,
    CalendarDays, Download, RefreshCw, Trash2, 
    HandCoins, ReceiptText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generatePDF } from "@/utils/pdfGenerator";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function Payroll() {
    const { profile, hasRole } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("staff");
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>("all");
    const [staff, setStaff] = useState<any[]>([]);
    const [slips, setSlips] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Global Date Selection for Payroll
    const [globalMonth, setGlobalMonth] = useState(months[new Date().getMonth()]);
    const [globalYear, setGlobalYear] = useState(new Date().getFullYear().toString());

    // Slip Generation Modal State
    const [genModalOpen, setGenModalOpen] = useState(false);
    const [targetStaff, setTargetStaff] = useState<any>(null);
    const [genForm, setGenForm] = useState({
        allowances: 0,
        deductions: 0,
        notes: ""
    });
    const [pendingAdvForTarget, setPendingAdvForTarget] = useState<any[]>([]);

    // Advances Tab State
    const [advances, setAdvances] = useState<any[]>([]);
    const [advModalOpen, setAdvModalOpen] = useState(false);
    const [advForm, setAdvForm] = useState({
        staff_id: "",
        amount: 0,
        purpose: "",
        advance_date: new Date().toISOString().split("T")[0]
    });


    const fetchBranches = async () => {
        try {
            const res = await fetch(`${API_URL}/api/branches`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
            });
            const data = await res.json();
            setBranches(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Fetch branches error:", err);
            setBranches([]);
        }
    };

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const url = new URL(`${API_URL}/api/payroll/staff`);
            if (selectedBranch !== "all") url.searchParams.append("branch_id", selectedBranch);

            const res = await fetch(url.toString(), {
                headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
            });
            const data = await res.json();
            setStaff(Array.isArray(data) ? data : []);
        } catch (err) {
            toast({ title: "Error", description: "Failed to fetch staff records", variant: "destructive" });
            setStaff([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSlips = async () => {
        setLoading(true);
        try {
            const url = new URL(`${API_URL}/api/payroll/slips`);
            if (selectedBranch !== "all") url.searchParams.append("branch_id", selectedBranch);

            const res = await fetch(url.toString(), {
                headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
            });
            const data = await res.json();
            setSlips(Array.isArray(data) ? data : []);
        } catch (err) {
            toast({ title: "Error", description: "Failed to fetch salary slips", variant: "destructive" });
            setSlips([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchAdvances = async () => {
        setLoading(true);
        try {
            const url = new URL(`${API_URL}/api/payroll/advances`);
            if (selectedBranch !== "all") url.searchParams.append("branch_id", selectedBranch);

            const res = await fetch(url.toString(), {
                headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
            });
            const data = await res.json();
            setAdvances(Array.isArray(data) ? data : []);
        } catch (err) {
            toast({ title: "Error", description: "Failed to fetch advances", variant: "destructive" });
            setAdvances([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (profile) {
            fetchBranches();
            if (hasRole("branch_admin") && !hasRole("super_admin")) {
                setSelectedBranch(String(profile.branch_id));
            }
        }
    }, [profile]);

    useEffect(() => {
        if (!profile) return;
        if (activeTab === "staff") fetchStaff();
        else if (activeTab === "history") fetchSlips();
        else if (activeTab === "advances") fetchAdvances();
    }, [selectedBranch, activeTab, profile]);

    const fetchPendingAdvances = async (staffId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/payroll/pending-advances/${staffId}`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
            });
            const data = await res.json();
            setPendingAdvForTarget(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Fetch pending advances error:", err);
        }
    };

    const handleGenerateClick = (member: any) => {
        setTargetStaff(member);
        setGenForm({ allowances: 0, deductions: 0, notes: "" });
        fetchPendingAdvances(member.id);
        setGenModalOpen(true);
    };

    const submitGeneration = async () => {
        if (!targetStaff) return;
        try {
            const res = await fetch(`${API_URL}/api/payroll/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("ecs_token")}`
                },
                body: JSON.stringify({
                    staff_id: targetStaff.id,
                    month: globalMonth,
                    year: parseInt(globalYear),
                    basic_salary: targetStaff.salary,
                    allowances: genForm.allowances,
                    deductions: genForm.deductions,
                    notes: genForm.notes
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Generation failed");

            toast({ title: "Success", description: `Salary slip generated for ${targetStaff.full_name}` });
            setGenModalOpen(false);
            setActiveTab("history"); // Switch to history to see the result
        } catch (err: any) {
            toast({ title: "Generation Error", description: err.message, variant: "destructive" });
        }
    };

    const submitAdvance = async () => {
        if (!advForm.staff_id || !advForm.amount || !advForm.advance_date) {
            toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
            return;
        }
        try {
            const res = await fetch(`${API_URL}/api/payroll/advance`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("ecs_token")}`
                },
                body: JSON.stringify(advForm)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to record advance");
            }
            toast({ title: "Recorded", description: "Salary advance recorded successfully" });
            setAdvModalOpen(false);
            setAdvForm({ staff_id: "", amount: 0, purpose: "", advance_date: new Date().toISOString().split("T")[0] });
            fetchAdvances();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    const deleteAdvance = async (id: string) => {
        if (!window.confirm("Are you sure you want to cancel this advance?")) return;
        try {
            const res = await fetch(`${API_URL}/api/payroll/advances/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to cancel advance");
            }
            toast({ title: "Cancelled", description: "Advance has been removed" });
            fetchAdvances();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    const markAsPaid = async (slipId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/payroll/pay/${slipId}`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
            });
            if (!res.ok) throw new Error("Payment failed");
            toast({ title: "Paid", description: "Salary slip marked as paid successfully" });
            fetchSlips();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    const markAdvanceAsPaid = async (advId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/payroll/advance/${advId}/pay`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
            });
            if (!res.ok) throw new Error("Payment failed");
            toast({ title: "Paid", description: "Salary advance marked as paid and recorded in ledger" });
            fetchAdvances();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    const deleteSlip = async (id: string, number: string) => {
        if (!window.confirm(`Are you sure you want to delete salary slip ${number}?`)) return;
        try {
            const res = await fetch(`${API_URL}/api/payroll/slips/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
            });
            if (!res.ok) throw new Error("Deletion failed");
            toast({ title: "Deleted", description: "Salary slip removed successfully" });
            fetchSlips();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    const downloadSlip = async (slip: any) => {
        toast({ title: "Downloading...", description: "Please wait while we generate the PDF" });
        try {
            await generatePDF('salary_slip', {
                ...slip,
                type: 'salary_slip'
            });
        } catch (err) {
            toast({ title: "Download Error", description: "Failed to generate PDF", variant: "destructive" });
        }
    };

    const filteredStaff = (staff || []).filter(s =>
        (s?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s?.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!profile) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="w-8 h-8 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-display font-bold tracking-tight text-foreground">Payroll System</h2>
                    <p className="text-muted-foreground">Manage employee salaries and branch-wise payroll.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {hasRole("super_admin") && (
                        <Button onClick={() => setAdvModalOpen(true)} className="rounded-xl gap-2 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                            <HandCoins className="w-4 h-4" /> Record Advance
                        </Button>
                    )}
                    <Select value={globalMonth} onValueChange={setGlobalMonth}>
                        <SelectTrigger className="w-[140px] bg-card border-border">
                            <CalendarDays className="w-4 h-4 mr-2 text-primary" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={globalYear} onValueChange={setGlobalYear}>
                        <SelectTrigger className="w-[100px] bg-card border-border">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <div className="h-8 w-[1px] bg-border mx-1 hidden md:block" />

                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                        <SelectTrigger className="w-[180px] bg-card border-border">
                            <Building2 className="w-4 h-4 mr-2 text-primary" />
                            <SelectValue placeholder="All Branches" />
                        </SelectTrigger>
                        <SelectContent>
                            {!hasRole("branch_admin") || hasRole("super_admin") ? <SelectItem value="all">All Branches</SelectItem> : null}
                            {Array.isArray(branches) && branches
                                .filter(b => !hasRole("branch_admin") || hasRole("super_admin") || String(b.id) === String(profile?.branch_id))
                                .map(b => (
                                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="staff" className="rounded-lg gap-2"><Users className="w-4 h-4" /> Staff Overview</TabsTrigger>
                    <TabsTrigger value="advances" className="rounded-lg gap-2"><HandCoins className="w-4 h-4" /> Salary Advances</TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg gap-2"><History className="w-4 h-4" /> Payment History</TabsTrigger>
                </TabsList>

                <TabsContent value="staff" className="mt-6">
                    <Card className="border-border shadow-elevated overflow-hidden bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-0 pt-6 px-6">
                            <div className="flex items-center justify-between gap-4 mb-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name or ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 bg-muted/30 border-border focus:bg-background"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/50 text-muted-foreground border-b border-border">
                                            <th className="text-left px-6 py-4 font-bold uppercase tracking-tight">Staff Member</th>
                                            <th className="text-left px-6 py-4 font-bold uppercase tracking-tight">Branch</th>
                                            <th className="text-left px-6 py-4 font-bold uppercase tracking-tight">Designation</th>
                                            <th className="text-right px-6 py-4 font-bold uppercase tracking-tight">Basic Salary</th>
                                            <th className="text-right px-6 py-4 font-bold uppercase tracking-tight w-40">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-20">
                                                    <div className="w-8 h-8 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                                                </td>
                                            </tr>
                                        ) : filteredStaff.length > 0 ? (
                                            Object.entries(
                                                filteredStaff.reduce((acc: any, s) => {
                                                    const b = s.branch_name || "Unassigned";
                                                    if (!acc[b]) acc[b] = [];
                                                    acc[b].push(s);
                                                    return acc;
                                                }, {})
                                            ).map(([branchName, members]: [string, any]) => (
                                                <React.Fragment key={branchName}>
                                                    <tr className="bg-muted/30">
                                                        <td colSpan={5} className="px-6 py-2">
                                                            <div className="flex items-center gap-2">
                                                                <Building2 className="w-3 h-3 text-primary" />
                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{branchName}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {members.map((member: any) => (
                                                        <tr key={member.id} className="hover:bg-muted/10 transition-colors bg-card/30">
                                                            <td className="px-6 py-4 pl-10">
                                                                <p className="font-bold text-foreground">{member.full_name}</p>
                                                                <p className="text-[10px] text-muted-foreground font-display tracking-widest">{member.employee_id}</p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/5 text-primary/70">
                                                                    {member.branch_name}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-muted-foreground">{member.designation || 'N/A'}</td>
                                                            <td className="px-6 py-4 text-right font-bold text-foreground">Rs. {member.salary ? Number(member.salary).toLocaleString() : '0'}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <Button size="sm" onClick={() => handleGenerateClick(member)} className="rounded-xl gap-2 font-bold shadow-lg shadow-primary/20">
                                                                    <PlusCircle className="w-4 h-4" /> Generate Slip
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <tr><td colSpan={5} className="text-center py-20 text-muted-foreground italic">No active staff found for this branch.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="advances" className="mt-6">
                    <Card className="border-border shadow-elevated overflow-hidden bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-4 pt-6 px-6">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    <ReceiptText className="w-5 h-5 text-primary" />
                                    Advance Salary History
                                </CardTitle>
                                <CardDescription>Tracking all employee advances and their deduction status.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/50 text-muted-foreground border-b border-border">
                                            <th className="text-left px-6 py-4 font-bold uppercase tracking-tight">Employee</th>
                                            <th className="text-left px-6 py-4 font-bold uppercase tracking-tight">Branch</th>
                                            <th className="text-left px-6 py-4 font-bold uppercase tracking-tight">Date</th>
                                            <th className="text-left px-6 py-4 font-bold uppercase tracking-tight">Purpose</th>
                                            <th className="text-right px-6 py-4 font-bold uppercase tracking-tight">Amount</th>
                                            <th className="text-center px-6 py-4 font-bold uppercase tracking-tight">Status</th>
                                            <th className="text-right px-6 py-4 font-bold uppercase tracking-tight">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {loading ? (
                                            <tr><td colSpan={7} className="text-center py-20"><div className="w-8 h-8 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></td></tr>
                                        ) : advances.length > 0 ? (
                                            advances.map((adv) => (
                                                <tr key={adv.id} className="hover:bg-muted/10 transition-colors bg-card/30">
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-foreground">{adv.staff_name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{adv.employee_id}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground">{adv.branch_name}</td>
                                                    <td className="px-6 py-4 text-muted-foreground font-medium">{new Date(adv.advance_date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-muted-foreground max-w-[200px] truncate">{adv.purpose || '—'}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-foreground">Rs. {Number(adv.amount).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                                            adv.status === 'paid' ? 'bg-success/10 text-success' :
                                                            adv.status === 'deducted' ? 'bg-indigo-100 text-indigo-700' : 
                                                            adv.status === 'cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                                                        }`}>
                                                            {adv.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {hasRole(["super_admin", "developer"]) && (
                                                                <>
                                                                    {adv.status === 'pending' && (
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="outline" 
                                                                            onClick={() => markAdvanceAsPaid(adv.id)} 
                                                                            className="h-8 w-8 rounded-full border-success/20 text-success hover:bg-success/10" 
                                                                            title="Mark as Paid"
                                                                        >
                                                                            <Wallet className="w-4 h-4" />
                                                                        </Button>
                                                                    )}
                                                                    {(adv.status !== 'deducted' || hasRole(["super_admin", "developer"])) && (
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="outline" 
                                                                            onClick={() => deleteAdvance(adv.id)} 
                                                                            className="h-8 w-8 rounded-full border-destructive/20 text-destructive hover:bg-destructive/10" 
                                                                            title="Cancel/Reverse Advance"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={7} className="text-center py-20 text-muted-foreground italic">No advance history found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                    <Card className="border-border shadow-elevated overflow-hidden bg-card/50 backdrop-blur-sm">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/50 text-muted-foreground border-b border-border">
                                            <th className="text-left px-6 py-4 font-bold uppercase tracking-tight">Slip #</th>
                                            <th className="text-left px-6 py-4 font-bold uppercase tracking-tight">Verification ID</th>
                                            <th className="text-left px-6 py-4 font-bold uppercase tracking-tight">Employee</th>
                                            <th className="text-left px-6 py-4 font-bold uppercase tracking-tight">Period</th>
                                            <th className="text-right px-6 py-4 font-bold uppercase tracking-tight">Net Salary</th>
                                            <th className="text-center px-6 py-4 font-bold uppercase tracking-tight">Status</th>
                                            <th className="text-right px-6 py-4 font-bold uppercase tracking-tight">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-20">
                                                    <div className="w-8 h-8 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                                                </td>
                                            </tr>
                                        ) : slips.length > 0 ? (
                                            slips.map((slip) => (
                                                <tr key={slip.id} className="hover:bg-muted/20 transition-colors bg-card/30">
                                                    <td className="px-6 py-4 font-mono text-xs font-bold text-foreground">{slip.slip_number}</td>
                                                    <td className="px-6 py-4 font-mono text-xs font-bold text-primary">{slip.verification_id}</td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-foreground">{slip.staff_name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{slip.branch_name}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground font-medium">{slip.month} {slip.year}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-primary">Rs. {Number(slip.net_salary).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${slip.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning animate-pulse'
                                                            }`}>
                                                            {slip.status === 'paid' ? (
                                                                <><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</>
                                                            ) : (
                                                                'Pending'
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {slip.status === 'pending' && (
                                                                <Button size="icon" variant="outline" onClick={() => markAsPaid(slip.id)} className="h-8 w-8 rounded-full border-success/20 text-success hover:bg-success/10" title="Mark as Paid">
                                                                    <Wallet className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            <Button size="icon" variant="outline" onClick={() => downloadSlip(slip)} className="h-8 w-8 rounded-full border-primary/20 text-primary hover:bg-primary/10" title="Download Slip">
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                            {hasRole("super_admin") && (
                                                                <Button size="icon" variant="outline" onClick={() => deleteSlip(slip.id, slip.slip_number)} className="h-8 w-8 rounded-full border-destructive/20 text-destructive hover:bg-destructive/10" title="Delete Slip">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={6} className="text-center py-20 text-muted-foreground italic">No salary slips found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Generation Modal */}
            <Dialog open={genModalOpen} onOpenChange={setGenModalOpen}>
                <DialogContent className="sm:max-w-[425px] bg-card border-border rounded-2xl shadow-elevated">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-display font-bold">
                            <CalendarDays className="w-5 h-5 text-primary" />
                            Generate Salary Slip
                        </DialogTitle>
                        <DialogDescription>
                            Creating slip for <span className="font-bold text-foreground">{targetStaff?.full_name || 'Staff Member'}</span>.
                            Basic Salary: <span className="font-bold text-primary">Rs. {targetStaff?.salary ? Number(targetStaff.salary).toLocaleString() : '0'}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Month</label>
                                <div className="px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm font-bold text-foreground">
                                    {globalMonth}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Year</label>
                                <div className="px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm font-bold text-foreground">
                                    {globalYear}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Allowances (Bonus, OT)</label>
                                <Input
                                    type="number"
                                    value={genForm.allowances}
                                    onChange={(e) => setGenForm({ ...genForm, allowances: parseFloat(e.target.value) || 0 })}
                                    className="bg-muted/30 border-border rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Manual Deductions</label>
                                <Input
                                    type="number"
                                    value={genForm.deductions}
                                    onChange={(e) => setGenForm({ ...genForm, deductions: parseFloat(e.target.value) || 0 })}
                                    className="bg-muted/30 border-border rounded-xl"
                                />
                            </div>
                        </div>
                        {pendingAdvForTarget.length > 0 && (
                            <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 flex items-center gap-1">
                                        <HandCoins className="w-3 h-3" /> Paid Advances (Deductible)
                                    </span>
                                    <span className="text-xs font-bold text-foreground">
                                        Rs. {pendingAdvForTarget.reduce((s, a) => s + Number(a.amount), 0).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-tight">These paid advances will be automatically subtracted from the net payable.</p>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admin Notes</label>
                            <Input
                                value={genForm.notes}
                                onChange={(e) => setGenForm({ ...genForm, notes: e.target.value })}
                                placeholder="e.g. Eid Bonus included"
                                className="bg-muted/30 border-border rounded-xl"
                            />
                        </div>

                        <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10 flex justify-between items-center">
                            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Net Payable</span>
                            <span className="text-xl font-display font-black text-primary">
                                Rs. {(
                                    (Number(targetStaff?.salary) || 0) + 
                                    (Number(genForm.allowances) || 0) - 
                                    (Number(genForm.deductions) || 0) - 
                                    pendingAdvForTarget.reduce((s, a) => s + Number(a.amount), 0)
                                ).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGenModalOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                        <Button onClick={submitGeneration} className="rounded-xl font-bold gap-2 px-6 shadow-lg shadow-primary/20">
                            <FileText className="w-4 h-4" /> Issue Salary Slip
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Advance Record Modal */}
            <Dialog open={advModalOpen} onOpenChange={setAdvModalOpen}>
                <DialogContent className="sm:max-w-[425px] bg-card border-border rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HandCoins className="w-5 h-5 text-primary" />
                            Record Salary Advance
                        </DialogTitle>
                        <DialogDescription>Select an employee and record the advance amount to be deducted from their next salary.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Employee</label>
                            <Select value={advForm.staff_id} onValueChange={(val) => setAdvForm({ ...advForm, staff_id: val })}>
                                <SelectTrigger className="bg-muted/30 border-border rounded-xl">
                                    <SelectValue placeholder="Search member..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {staff.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.employee_id})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Advance Amount (Rs.)</label>
                                <Input
                                    type="number"
                                    value={advForm.amount}
                                    onChange={(e) => setAdvForm({ ...advForm, amount: parseFloat(e.target.value) || 0 })}
                                    className="bg-muted/30 border-border rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</label>
                                <Input
                                    type="date"
                                    value={advForm.advance_date}
                                    onChange={(e) => setAdvForm({ ...advForm, advance_date: e.target.value })}
                                    className="bg-muted/30 border-border rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Purpose (Optional)</label>
                            <Input
                                value={advForm.purpose}
                                onChange={(e) => setAdvForm({ ...advForm, purpose: e.target.value })}
                                placeholder="e.g. Medical emergency"
                                className="bg-muted/30 border-border rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAdvModalOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                        <Button onClick={submitAdvance} className="rounded-xl font-bold gap-2 bg-primary">Confirm Advance</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
