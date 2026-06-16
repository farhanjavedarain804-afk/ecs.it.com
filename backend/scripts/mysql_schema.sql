-- Consolidated MySQL Schema for ECS
-- Converted from Supabase PostgreSQL Migrations
-- Ensure you have created the database 'u168718068_ecs' first.

SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing tables to ensure clean re-import
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS financial_entries;
DROP TABLE IF EXISTS inventory_logs;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS company_settings;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;

-- 0. Users Table (Authentication)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(36) PRIMARY KEY,
    branch_code VARCHAR(10) UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    latitude DOUBLE,
    longitude DOUBLE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    email TEXT,
    phone VARCHAR(50),
    branch_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 3. User Roles Table
CREATE TABLE IF NOT EXISTS user_roles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('super_admin', 'branch_admin', 'manager', 'accountant', 'technician', 'store_manager') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role)
) ENGINE=InnoDB;

-- 4. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    area VARCHAR(100),
    city VARCHAR(100) DEFAULT 'Lahore',
    branch_id VARCHAR(36) NOT NULL,
    welcome_note_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB;

-- 5. Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    father_name VARCHAR(255),
    cnic VARCHAR(50),
    designation VARCHAR(100),
    branch_id VARCHAR(36) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    joining_date DATE,
    salary DECIMAL(12, 2) DEFAULT 0,
    contact_1 VARCHAR(50),
    contact_2 VARCHAR(50),
    address TEXT,
    user_id VARCHAR(36),
    latitude DOUBLE,
    longitude DOUBLE,
    welcome_letter_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB;

-- 6. Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id VARCHAR(36) PRIMARY KEY,
    complaint_number VARCHAR(50) NOT NULL UNIQUE,
    verification_id VARCHAR(255) UNIQUE,
    customer_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36) NOT NULL,
    assigned_to VARCHAR(36),
    assigned_helper VARCHAR(36),
    complaint_type ENUM('installation', 'repair', 'maintenance') NOT NULL DEFAULT 'repair',
    priority ENUM('low', 'medium', 'high', 'emergency') NOT NULL DEFAULT 'medium',
    status ENUM('registered', 'assigned', 'in_progress', 'completed', 'solved', 'invoice_generated', 'closed', 'dismissed') NOT NULL DEFAULT 'registered',
    description TEXT NOT NULL,
    location_lat DOUBLE,
    location_lng DOUBLE,
    warranty_type VARCHAR(50) DEFAULT 'non_warranty',
    resolution_time VARCHAR(100),
    notes TEXT,
    attachments JSON, -- Array of URLs
    photo_urls JSON, -- Array of URLs
    receipt_generated BOOLEAN DEFAULT false,
    resolved_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (assigned_to) REFERENCES staff(id),
    FOREIGN KEY (assigned_helper) REFERENCES staff(id)
) ENGINE=InnoDB;

-- 7. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE,
    verification_id VARCHAR(255) UNIQUE,
    complaint_id VARCHAR(36),
    customer_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36) NOT NULL,
    technician_id VARCHAR(36),
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    payment_status ENUM('unpaid', 'partially_paid', 'paid', 'void', 'partial') NOT NULL DEFAULT 'unpaid',
    due_date DATE,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL,
    items JSON, -- Array of items if cached
    sales_tax_rate DECIMAL(5, 2) DEFAULT 0,
    shipping_handling DECIMAL(12, 2) DEFAULT 0,
    advance_paid DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (technician_id) REFERENCES staff(id)
) ENGINE=InnoDB;

-- 8. Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
    id VARCHAR(36) PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Matches Supabase
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(36) PRIMARY KEY,
    staff_id VARCHAR(36),
    branch_id VARCHAR(36) NOT NULL,
    attendance_date DATE,
    check_in TIMESTAMP NULL,
    check_out TIMESTAMP NULL,
    latitude DOUBLE,
    longitude DOUBLE,
    location_lat DOUBLE,
    location_lng DOUBLE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, attendance_date),
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB;

-- 10. Products Table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rate DECIMAL(12, 2) DEFAULT 0,
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'piece',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    quantity DECIMAL(12, 2) DEFAULT 0,
    min_stock_level DECIMAL(12, 2) DEFAULT 0
) ENGINE=InnoDB;

-- 11. Services Table
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(36) PRIMARY KEY,
    service_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rate DECIMAL(12, 2) DEFAULT 0,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 12. Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'piece',
    quantity DECIMAL(12, 2) NOT NULL DEFAULT 0,
    min_stock_level DECIMAL(12, 2) NOT NULL DEFAULT 0,
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    branch_id VARCHAR(36),
    is_active BOOLEAN NOT NULL DEFAULT true,
    item_type ENUM('inventory', 'fixed_item') DEFAULT 'inventory',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB;

-- 13. Inventory Logs Table
CREATE TABLE IF NOT EXISTS inventory_logs (
    id VARCHAR(36) PRIMARY KEY,
    item_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36),
    staff_id VARCHAR(36),
    entry_type VARCHAR(50) NOT NULL,
    qty DECIMAL(12, 2) NOT NULL DEFAULT 0,
    date DATETIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id)
) ENGINE=InnoDB;

-- 14. Financial Entries Table
CREATE TABLE IF NOT EXISTS financial_entries (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(255) UNIQUE,
    branch_id VARCHAR(36) NOT NULL,
    entry_type VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    bank_amount DECIMAL(12, 2) DEFAULT 0,
    cash_amount DECIMAL(12, 2) DEFAULT 0,
    running_balance DECIMAL(12, 2) DEFAULT 0,
    description TEXT,
    payment_method VARCHAR(50) DEFAULT 'cash',
    reference_id VARCHAR(36),
    created_by VARCHAR(36),
    entry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB;

-- 14. Company Settings Table (Branding)
CREATE TABLE IF NOT EXISTS company_settings (
    id VARCHAR(36) PRIMARY KEY,
    company_name TEXT,
    company_email TEXT,
    company_phone TEXT,
    company_address TEXT,
    tax_id TEXT,
    invoice_prefix TEXT DEFAULT 'ECS-',
    next_invoice_number INT DEFAULT 1001,
    invoice_footer_notes TEXT,
    logo_url TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 15. Settings Table (General)
CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(100) PRIMARY KEY,
    value JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(36)
) ENGINE=InnoDB;

-- 16. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 17. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(36),
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
