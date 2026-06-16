import { useState, useEffect } from "react";
import { BarChart3, Download, TrendingUp, TrendingDown, ClipboardCheck, Users, Building, Package, ArrowUpRight, ArrowDownRight, PieChart, Star, FileText, CheckCircle2 } from "lucide-react";
import { generateDetailedReport } from "@/utils/pdfGenerator";
import { useToast } from "@/hooks/use-toast";

const Reports = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReports = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/analytics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ecs_token')}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const exportPDF = async () => {
    if (!stats) return;
    try {
      await generateDetailedReport(stats);
      toast({ title: "Professional Report Generated" });
    } catch (err) {
      toast({ title: "PDF Generation Failed", variant: "destructive" });
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-muted-foreground">Calculating Real-time Analytics...</p>
    </div>
  );

  if (!stats) return <div className="p-8 text-center text-muted-foreground italic">No data available.</div>;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black font-display text-foreground tracking-tight">Intelligence Hub</h2>
          <p className="text-muted-foreground text-sm mt-1">Real-time performance metrics and financial analysis</p>
        </div>
        <button onClick={exportPDF} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-95">
          <Download className="w-4 h-4" /> Download Full Analytics (PDF)
        </button>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><BarChart3 className="w-12 h-12 text-primary" /></div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Solved Ratio</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h4 className="text-3xl font-black font-display text-foreground">{stats.complaints.ratio.toFixed(1)}%</h4>
            <span className="text-xs font-bold text-success flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> Live</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">{stats.complaints.solved} of {stats.complaints.total} resolved</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp className="w-12 h-12 text-success" /></div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Net Profit</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h4 className={`text-3xl font-black font-display ${stats.financials.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
              Rs. {Math.abs(stats.financials.netProfit).toLocaleString()}
            </h4>
            {stats.financials.netProfit < 0 && <span className="text-[10px] text-destructive uppercase font-bold">Deficit</span>}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">Real-time Income - Expenses</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><ClipboardCheck className="w-12 h-12 text-orange-500" /></div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Unsolved</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h4 className="text-3xl font-black font-display text-foreground">{stats.complaints.unsolved}</h4>
            <span className="text-[10px] font-bold text-orange-500 uppercase">Attention Required</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">Pending vs Resolved ratio: {(stats.complaints.unsolved / stats.complaints.total * 100).toFixed(1)}%</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Star className="w-12 h-12 text-amber-500" /></div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Client Satisfaction</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h4 className="text-3xl font-black font-display text-foreground">{stats.satisfaction?.avg || "0.0"}</h4>
            <span className="text-sm text-muted-foreground font-bold">/ 5.0</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">Based on {stats.satisfaction?.total} customer reviews</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Branch Progress */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold font-display flex items-center gap-2 text-foreground">
              <Building className="w-5 h-5 text-primary" /> Branch Performance (I/O)
            </h3>
            <span className="text-[10px] font-black uppercase bg-primary/10 text-primary px-3 py-1 rounded-full">Real-time Input & Output</span>
          </div>
          <div className="space-y-6">
            {stats.branches.map((b: any) => (
              <div key={b.id} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{b.name}</span>
                    <span className="text-[10px] text-muted-foreground">Solved: {b.resolvedCount}/{b.complaintsCount}</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-black ${b.profit >= 0 ? "text-success" : "text-destructive"} flex items-center gap-1 justify-end`}>
                      {b.profit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      Rs. {Math.abs(b.profit).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Profit Contribution</div>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full relative overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${b.profit >= 0 ? "bg-success" : "bg-destructive"}`} 
                    style={{ width: `${Math.min(100, (b.revenue / (stats.financials.totalRevenue || 1)) * 100)}%` }} 
                  />
                </div>
                <div className="flex items-center justify-between mt-1 px-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Efficiency: {b.resolutionRatio.toFixed(1)}%</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 text-amber-500 fill-current" />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Rating: {b.avgRating || "0.0"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Financial Mix */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
          <h3 className="text-lg font-bold font-display flex items-center gap-2 text-foreground mb-6">
            <PieChart className="w-5 h-5 text-primary" /> Financial Overview
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-success/5 border border-success/10 group hover:bg-success/10 transition-colors">
              <p className="text-[10px] font-bold text-success uppercase tracking-widest mb-1">Invoice Collection</p>
              <h5 className="text-lg font-black text-foreground">Rs. {stats.financials.collectedInv.toLocaleString()}</h5>
              <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-muted-foreground uppercase">
                <ArrowUpRight className="w-3 h-3 text-success" /> Generated from Sales
              </div>
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 group hover:bg-primary/10 transition-colors">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Other Income</p>
              <h5 className="text-lg font-black text-foreground">Rs. {stats.financials.otherIncome.toLocaleString()}</h5>
              <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-muted-foreground uppercase">
                <ArrowUpRight className="w-3 h-3 text-primary" /> Auxiliary Sources
              </div>
            </div>
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 group hover:bg-destructive/10 transition-colors">
              <p className="text-[10px] font-bold text-destructive uppercase tracking-widest mb-1">Total Salaries</p>
              <h5 className="text-lg font-black text-foreground">Rs. {stats.financials.salaries.toLocaleString()}</h5>
              <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-muted-foreground uppercase">
                <ArrowDownRight className="w-3 h-3 text-destructive" /> Payroll Output
              </div>
            </div>
            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 group hover:bg-orange-500/10 transition-colors">
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Operational Exp</p>
              <h5 className="text-lg font-black text-foreground">Rs. {stats.financials.otherExpenses.toLocaleString()}</h5>
              <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-muted-foreground uppercase">
                <ArrowDownRight className="w-3 h-3 text-orange-500" /> Maintenance & Bills
              </div>
            </div>
            <div className="col-span-2 p-5 rounded-2xl bg-muted/30 border border-border mt-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Revenue Integrity</span>
                <span className="text-xs font-bold text-orange-500">Uncollected: Rs. {stats.financials.outstandingInv.toLocaleString()}</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full relative overflow-hidden">
                <div 
                  className="h-full bg-success rounded-full" 
                  style={{ width: `${(stats.financials.totalRevenue / ((stats.financials.totalRevenue + stats.financials.outstandingInv) || 1)) * 100}%` }} 
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic text-center text-balance underline decoration-primary/20 underline-offset-4">
                Percentage of total potential revenue successfully collected and realized.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts & Inventory */}
      {stats.counts.lowStockItems > 0 && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-destructive/10 rounded-lg text-destructive"><Package className="w-5 h-5" /></div>
            <div>
              <p className="text-sm font-black text-destructive leading-tight">INVENTORY CRITICAL ALERT</p>
              <p className="text-xs text-destructive/70">{stats.counts.lowStockItems} core component(s) have dropped below safety thresholds.</p>
            </div>
          </div>
          <button className="text-[10px] font-black uppercase text-destructive border border-destructive/20 px-4 py-2 rounded-xl hover:bg-destructive hover:text-white transition-all">Restock Dispatch</button>
        </div>
      )}
    </div>
  );
};

export default Reports;
