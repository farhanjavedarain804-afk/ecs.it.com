-- Inventory Schema Fix (FORCE REFRESH)
-- Ensures description column is present and forces PostgREST to reload schema.

-- 1. Ensure description exists in inventory_items
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'description') THEN
        ALTER TABLE public.inventory_items ADD COLUMN description TEXT;
    END IF;
END $$;

-- 2. FORCE REFRESH PostgREST cache
-- Sometimes NOTIFY pgrst, 'reload schema' is not enough.
-- Adding and immediately dropping a dummy column often forces a re-scan.
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS _force_refresh_cache BOOLEAN;
ALTER TABLE public.inventory_items DROP COLUMN IF EXISTS _force_refresh_cache;

-- 3. Standard Notify
NOTIFY pgrst, 'reload schema';

-- 4. Ensure inventory_logs exists and has correct columns
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    staff_id UUID REFERENCES public.staff(id),
    entry_type TEXT NOT NULL CHECK (entry_type IN ('issued', 'received', 'found', 'lost')),
    qty NUMERIC(12,2) NOT NULL DEFAULT 0,
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
