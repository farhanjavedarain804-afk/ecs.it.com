-- Automatic Inventory Quantity Updates
-- This script ensures inventory_items.quantity is updated automatically based on inventory_logs.

-- 1. Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.update_inventory_quantity()
RETURNS TRIGGER AS $$
DECLARE
    delta NUMERIC(12,2) := 0;
BEGIN
    -- Determine the direction and amount of change based on entry_type
    -- 'received' or 'found' -> Add to stock
    -- 'issued' or 'lost' -> Subtract from stock
    
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.entry_type IN ('received', 'found')) THEN
            delta := NEW.qty;
        ELSIF (NEW.entry_type IN ('issued', 'lost')) THEN
            delta := -NEW.qty;
        END IF;
        
        UPDATE public.inventory_items 
        SET quantity = quantity + delta
        WHERE id = NEW.item_id;

    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.entry_type IN ('received', 'found')) THEN
            delta := -OLD.qty;
        ELSIF (OLD.entry_type IN ('issued', 'lost')) THEN
            delta := OLD.qty;
        END IF;

        UPDATE public.inventory_items 
        SET quantity = quantity + delta
        WHERE id = OLD.item_id;

    ELSIF (TG_OP = 'UPDATE') THEN
        -- Reverse the OLD entry impact
        IF (OLD.entry_type IN ('received', 'found')) THEN
            delta := -OLD.qty;
        ELSIF (OLD.entry_type IN ('issued', 'lost')) THEN
            delta := OLD.qty;
        END IF;

        -- Apply the NEW entry impact
        IF (NEW.entry_type IN ('received', 'found')) THEN
            delta := delta + NEW.qty;
        ELSIF (NEW.entry_type IN ('issued', 'lost')) THEN
            delta := delta - NEW.qty;
        END IF;

        -- Apply the total net delta
        UPDATE public.inventory_items 
        SET quantity = quantity + delta
        WHERE id = NEW.item_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_inventory_log_change ON public.inventory_logs;

-- 3. Register the trigger for INSERT, UPDATE, and DELETE
CREATE TRIGGER on_inventory_log_change
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_logs
FOR EACH ROW EXECUTE FUNCTION public.update_inventory_quantity();

-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
