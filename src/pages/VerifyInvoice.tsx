import { useState } from "react";
import { motion } from "framer-motion";
import { QrCode, Search, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface InvoiceResult {
  invoice_number: string;
  total_amount: number;
  payment_status: string;
  issued_at: string;
  branch: { name: string; city: string } | null;
  customer: { name: string; city: string } | null;
}

const VerifyInvoice = () => {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) {
      toast({ title: "Please enter an invoice number", variant: "destructive" });
      return;
    }
    setSearching(true);
    setResult(null);
    setNotFound(false);

    const { data, error } = await supabase
      .from("invoices")
      .select("invoice_number, total_amount, payment_status, issued_at, branches(name, city), customers(name, city)")
      .eq("invoice_number", invoiceNumber.trim().toUpperCase())
      .maybeSingle();

    if (data) {
      setResult({
        invoice_number: data.invoice_number,
        total_amount: data.total_amount,
        payment_status: data.payment_status,
        issued_at: data.issued_at,
        branch: data.branches as any,
        customer: data.customers as any,
      });
    } else {
      setNotFound(true);
    }
    setSearching(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold font-display text-foreground">Invoice Verification</h1>
              <p className="text-muted-foreground mt-2">
                Verify the authenticity of any ECS invoice by entering the invoice number or scanning the QR code.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-card-foreground mb-1.5 block">Invoice Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. INV-2026-00001"
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={searching}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {searching ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <><Search className="w-4 h-4" /> Verify Invoice</>
                  )}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button className="w-full rounded-xl border border-border bg-muted py-3 text-sm font-semibold text-foreground hover:bg-muted/80 transition-all flex items-center justify-center gap-2">
                <QrCode className="w-4 h-4" /> Scan QR Code
              </button>

              {result && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-xl border border-green-300 bg-green-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Invoice Verified ✓</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Invoice #</span><span className="font-medium text-foreground">{result.invoice_number}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium text-foreground">{result.customer?.name || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">City</span><span className="font-medium text-foreground">{result.customer?.city || result.branch?.city || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span className="font-medium text-foreground">{result.branch?.name || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium text-foreground">Rs. {Number(result.total_amount).toLocaleString()}</span></div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className={`font-medium capitalize ${result.payment_status === "paid" ? "text-green-600" : "text-accent"}`}>
                        {result.payment_status}
                      </span>
                    </div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Issue Date</span><span className="font-medium text-foreground">{new Date(result.issued_at).toLocaleDateString()}</span></div>
                  </div>
                </motion.div>
              )}

              {notFound && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Invoice Not Found</p>
                    <p className="text-xs text-muted-foreground mt-1">No invoice matches this number. Please check and try again.</p>
                  </div>
                </motion.div>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              This verification system prevents fake invoices, editing fraud, and duplicate billing.
            </p>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VerifyInvoice;
