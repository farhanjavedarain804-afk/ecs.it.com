
-- Create services table
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id text NOT NULL UNIQUE DEFAULT '',
  name text NOT NULL,
  description text,
  rate numeric NOT NULL DEFAULT 0,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create trigger for auto service_id
CREATE OR REPLACE FUNCTION public.generate_service_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(service_id FROM 'SRV-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num FROM public.services;
  NEW.service_id := 'SRV-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_service_id_trigger
  BEFORE INSERT ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.generate_service_id();

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Admins can manage services" ON public.services FOR ALL USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'branch_admin'));

-- Create products table
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL UNIQUE DEFAULT '',
  name text NOT NULL,
  description text,
  rate numeric NOT NULL DEFAULT 0,
  category text,
  unit text NOT NULL DEFAULT 'piece',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.generate_product_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(product_id FROM 'PRD-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num FROM public.products;
  NEW.product_id := 'PRD-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_product_id_trigger
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.generate_product_id();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'branch_admin'));

-- Create staff table
CREATE TABLE public.staff (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id text NOT NULL UNIQUE DEFAULT '',
  full_name text NOT NULL,
  father_name text,
  cnic text,
  designation text,
  branch_id uuid REFERENCES public.branches(id),
  status text NOT NULL DEFAULT 'active',
  joining_date date NOT NULL DEFAULT CURRENT_DATE,
  salary numeric NOT NULL DEFAULT 0,
  contact_1 text,
  contact_2 text,
  address text,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_num INTEGER;
BEGIN
  IF NEW.employee_id IS NULL OR NEW.employee_id = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(employee_id FROM 'EMP-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num FROM public.staff;
    NEW.employee_id := 'EMP-' || LPAD(next_num::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_employee_id_trigger
  BEFORE INSERT ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.generate_employee_id();

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view staff" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Admins can manage staff" ON public.staff FOR ALL USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'branch_admin'));

-- Create invoice_items table for line items
CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view invoice items" ON public.invoice_items FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert invoice items" ON public.invoice_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update invoice items" ON public.invoice_items FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete invoice items" ON public.invoice_items FOR DELETE USING (true);

-- Add warranty_type to complaints
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS warranty_type text DEFAULT 'non_warranty';

-- Add assigned_helper to complaints
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS assigned_helper uuid;

-- Add customer_id auto-gen
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_id text UNIQUE DEFAULT '';

CREATE OR REPLACE FUNCTION public.generate_customer_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_num INTEGER;
BEGIN
  IF NEW.customer_id IS NULL OR NEW.customer_id = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(customer_id FROM 'A-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num FROM public.customers;
    NEW.customer_id := 'A-' || TO_CHAR(NOW(), 'YYYY') || LPAD(next_num::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_customer_id_trigger
  BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.generate_customer_id();

-- Add advance_paid and shipping_handling to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS advance_paid numeric DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS shipping_handling numeric DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sales_tax_rate numeric DEFAULT 0;

-- Update triggers for updated_at
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
