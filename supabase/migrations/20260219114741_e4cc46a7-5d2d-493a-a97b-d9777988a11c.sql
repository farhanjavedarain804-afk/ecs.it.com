
-- Make complaint_number nullable with default so the trigger can set it
ALTER TABLE public.complaints ALTER COLUMN complaint_number SET DEFAULT '';

-- Make invoice_number nullable with default so the trigger can set it  
ALTER TABLE public.invoices ALTER COLUMN invoice_number SET DEFAULT '';

-- Add a financial_entries table for income/expense tracking
CREATE TABLE public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  payment_method TEXT DEFAULT 'cash',
  reference_id UUID,
  created_by UUID REFERENCES auth.users(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view financial entries" ON public.financial_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert financial entries" ON public.financial_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update financial entries" ON public.financial_entries FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_financial_entries_updated_at BEFORE UPDATE ON public.financial_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
