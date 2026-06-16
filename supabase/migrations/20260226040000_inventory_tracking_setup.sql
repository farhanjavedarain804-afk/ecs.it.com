-- Inventory Tracking System Setup
-- Adds description to inventory_items and creates inventory_logs for movement tracking

-- 1. Add description to inventory_items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Create inventory_logs table
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    staff_id UUID REFERENCES public.staff(id),
    entry_type TEXT NOT NULL CHECK (entry_type IN ('issued', 'received')),
    qty NUMERIC(12,2) NOT NULL DEFAULT 0,
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS on inventory_logs
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for inventory_logs
CREATE POLICY "Authenticated users can view inventory logs" ON public.inventory_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage inventory logs" ON public.inventory_logs FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'branch_admin') OR 
  public.has_role(auth.uid(), 'store_manager')
);

-- 5. Trigger to update inventory_items quantity automatically
CREATE OR REPLACE FUNCTION public.update_inventory_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.entry_type = 'received') THEN
            UPDATE public.inventory_items 
            SET quantity = quantity + NEW.qty
            WHERE id = NEW.item_id;
        ELSIF (NEW.entry_type = 'issued') THEN
            UPDATE public.inventory_items 
            SET quantity = quantity - NEW.qty
            WHERE id = NEW.item_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.entry_type = 'received') THEN
            UPDATE public.inventory_items 
            SET quantity = quantity - OLD.qty
            WHERE id = OLD.item_id;
        ELSIF (OLD.entry_type = 'issued') THEN
            UPDATE public.inventory_items 
            SET quantity = quantity + OLD.qty
            WHERE id = OLD.item_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_inventory_log_change
AFTER INSERT OR DELETE ON public.inventory_logs
FOR EACH ROW EXECUTE FUNCTION public.update_inventory_quantity();
