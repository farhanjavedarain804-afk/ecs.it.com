-- FIX INVENTORY SKU CONSTRAINT
-- This migration removes the global unique constraint on SKU and replaced it with a per-branch unique constraint.

DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN 
    -- Find the unique constraint on the sku column
    SELECT conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    WHERE con.contype = 'u' 
      AND con.conrelid = 'public.inventory_items'::regclass
      AND att.attname = 'sku';

    -- Drop if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.inventory_items DROP CONSTRAINT ' || constraint_name;
    END IF;
    
    -- In case it was named specifically in the error as "inventory_item_sku_key" or "inventory_items_sku_key"
    ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_item_sku_key;
    ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_sku_key;

    -- Add the new composite constraint
    ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_sku_branch_key UNIQUE (sku, branch_id);

END $$;
