-- Enhance Products table with stock fields and flexible ID generation
-- 1. Add quantity and min_stock_level to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS quantity NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC(12,2) DEFAULT 0;

-- 2. Modify generate_product_id trigger function
-- Only auto-generate if product_id is NULL or empty
CREATE OR REPLACE FUNCTION public.generate_product_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_num INTEGER;
BEGIN
  IF NEW.product_id IS NULL OR NEW.product_id = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(product_id FROM 'PRD-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num FROM public.products;
    NEW.product_id := 'PRD-' || LPAD(next_num::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Modify generate_service_id trigger function for consistency
-- Only auto-generate if service_id is NULL or empty
CREATE OR REPLACE FUNCTION public.generate_service_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_num INTEGER;
BEGIN
  IF NEW.service_id IS NULL OR NEW.service_id = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(service_id FROM 'SRV-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num FROM public.services;
    NEW.service_id := 'SRV-' || LPAD(next_num::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;
