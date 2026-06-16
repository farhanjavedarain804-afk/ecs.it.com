-- Migration to enhance invoices with multi-item and detailed financial fields
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS sales_tax_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_handling NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS advance_paid NUMERIC(12,2) DEFAULT 0;

COMMENT ON COLUMN public.invoices.items IS 'Array of line items: [{description, qty, unitPrice}]';
