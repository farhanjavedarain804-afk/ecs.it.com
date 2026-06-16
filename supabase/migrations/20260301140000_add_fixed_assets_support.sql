-- Add Fixed Assets Support for Inventory
-- This migration adds an item_type column to distinguish between consumable inventory and fixed assets/tools.

-- 1. Add item_type column
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'inventory' CHECK (item_type IN ('inventory', 'fixed_item'));

-- 2. Update existing items to 'inventory' type (already handled by default but for safety)
UPDATE public.inventory_items SET item_type = 'inventory' WHERE item_type IS NULL;

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
