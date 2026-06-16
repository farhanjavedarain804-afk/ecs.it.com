-- Consolidation and Fix Migration for Invoices
-- This ensures all columns required for the enhanced invoice system are present
-- and reloads the schema cache to avoid "column not found" errors.

-- 1. Ensure all columns exist
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS sales_tax_rate NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_handling NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS advance_paid NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0;

-- 2. Force a schema cache reload for PostgREST
-- This is a standard Supabase/PostgREST way to signal a cache refresh
NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE public.invoices IS 'Enhanced invoice records with multi-item support and detailed financial fields.';
