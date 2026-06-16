-- Fix Products & Services Schema
-- Aligns DB with the backend expectations (v1 schema)

SET FOREIGN_KEY_CHECKS = 0;

-- Fix Products Table
-- Add product_id if not exists, rename price to rate if exists
ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS product_id VARCHAR(50) AFTER id,
    MODIFY COLUMN name VARCHAR(255) NOT NULL,
    CHANGE COLUMN IF EXISTS price rate DECIMAL(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'piece' AFTER category,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true AFTER unit,
    ADD COLUMN IF NOT EXISTS quantity DECIMAL(12, 2) DEFAULT 0 AFTER is_active,
    ADD COLUMN IF NOT EXISTS min_stock_level DECIMAL(12, 2) DEFAULT 0 AFTER quantity;

-- Add UNIQUE constraint to product_id if it's missing (might fail if duplicate Nulls exist, but we'll handle it)
ALTER TABLE products ADD UNIQUE INDEX IF NOT EXISTS (product_id);

-- Fix Services Table
-- Add service_id if not exists, rename base_price to rate if exists
ALTER TABLE services 
    ADD COLUMN IF NOT EXISTS service_id VARCHAR(50) AFTER id,
    MODIFY COLUMN name VARCHAR(255) NOT NULL,
    CHANGE COLUMN IF EXISTS base_price rate DECIMAL(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true AFTER rate;

-- Add UNIQUE constraint to service_id if it's missing
ALTER TABLE services ADD UNIQUE INDEX IF NOT EXISTS (service_id);

SET FOREIGN_KEY_CHECKS = 1;
