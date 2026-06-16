-- Force Schema Refresh for Inventory
-- This migration ensures item_type exists and forces the API cache to reload.

-- 1. Ensure item_type exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'item_type') THEN
        ALTER TABLE public.inventory_items ADD COLUMN item_type TEXT DEFAULT 'inventory' CHECK (item_type IN ('inventory', 'fixed_item'));
    END IF;
END $$;

-- 2. FORCE REFRESH PostgREST cache
-- We add and immediately drop a dummy column to trigger a physical table change that PostgREST cannot ignore.
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS _force_reload_cache_v2 BOOLEAN;
ALTER TABLE public.inventory_items DROP COLUMN IF EXISTS _force_reload_cache_v2;

-- 3. Standard Notify (Extra layer of security)
NOTIFY pgrst, 'reload schema';
