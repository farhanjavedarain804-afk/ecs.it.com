-- PHASE 3: INVOICE & FINANCIAL MANAGEMENT
-- Centralized Branding, Banking, and Auto-Invoicing

-- 1. Enhance Company Settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT 'Elite Cooling Solutions',
ADD COLUMN IF NOT EXISTS company_email TEXT DEFAULT 'info@elite cooling.com',
ADD COLUMN IF NOT EXISTS company_phone TEXT DEFAULT '+92 3XX XXXXXXX',
ADD COLUMN IF NOT EXISTS company_address TEXT DEFAULT 'Main Street, Lahore, Pakistan',
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'ECS-',
ADD COLUMN IF NOT EXISTS next_invoice_number INTEGER DEFAULT 1001;

-- 2. Enhanced Invoices Table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT now(),
ALTER COLUMN invoice_number DROP NOT NULL; -- Allow trigger to set it

-- 3. Auto-Incrementing Invoice Number Function
CREATE OR REPLACE FUNCTION public.generate_next_invoice_number() 
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
    next_num INTEGER;
BEGIN
    -- Get prefix and next number from settings
    SELECT invoice_prefix, next_invoice_number 
    INTO prefix, next_num 
    FROM public.company_settings 
    LIMIT 1;

    -- Set the invoice number if not provided
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := prefix || TO_CHAR(next_num, 'FM0000');
        
        -- Increment the counter in settings
        UPDATE public.company_settings 
        SET next_invoice_number = next_invoice_number + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-invoicing
DROP TRIGGER IF EXISTS trigger_generate_invoice_number ON public.invoices;
CREATE TRIGGER trigger_generate_invoice_number
BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.generate_next_invoice_number();

-- 4. Overdue Indicators (Helper view or just use SQL logic in frontend)
-- No table changes needed for indicators, will handle in UI logic based on due_date.

-- 5. Update existing invoices if any (optional, but good for consistency)
-- UPDATE public.invoices SET invoice_number = 'ECS-' || TO_CHAR(ROW_NUMBER() OVER (ORDER BY created_at) + 1000, 'FM0000') WHERE invoice_number IS NULL OR invoice_number = '';

RAISE NOTICE 'Phase 3 Schema Updates Applied Successfully.';
