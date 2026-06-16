-- INVENTORY & STOCK AGGREGATION VIEWS
-- This migration provides helper functions and views for aggregating stock across master products and branch inventory.

-- Ensure inventory_items.sku matches products.product_id or similar unique identifiers
-- (Assuming mapping is via sku/product_id string)

CREATE OR REPLACE VIEW public.product_stock_summary AS
SELECT 
    p.id as product_internal_id,
    p.product_id as product_code,
    p.name,
    p.quantity as master_stock,
    COALESCE(SUM(i.quantity), 0) as branch_stock,
    (p.quantity + COALESCE(SUM(i.quantity), 0)) as total_stock
FROM 
    public.products p
LEFT JOIN 
    public.inventory_items i ON p.product_id = i.sku
GROUP BY 
    p.id, p.product_id, p.name, p.quantity;

-- Grant access to the view
GRANT SELECT ON public.product_stock_summary TO authenticated;
GRANT SELECT ON public.product_stock_summary TO service_role;

COMMENT ON VIEW public.product_stock_summary IS 'Aggregated stock view for Super Admins showing Master (Warehouse) vs Branch stock totals.';
