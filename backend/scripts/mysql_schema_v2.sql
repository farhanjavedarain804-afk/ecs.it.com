-- Consolidated MySQL Schema for ECS
-- Converted from Supabase PostgreSQL Migrations
-- Ensure you have created the database 'u168718068_ecs' first.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(36) PRIMARY KEY,
    branch_code VARCHAR(10) UNIQUE, -- added BR-001 format
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
    customer_id VARCHAR(50) NOT NULL UNIQUE, -- verification code format
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
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    designation VARCHAR(100),
    role ENUM('admin', 'technician', 'manager', 'accountant', 'staff') DEFAULT 'staff',
    branch_id VARCHAR(36) NOT NULL,
    is_active BOOLEAN DEFAULT true,
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
    payment_status ENUM('unpaid', 'partially_paid', 'paid', 'void') NOT NULL DEFAULT 'unpaid',
    due_date DATE,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36), -- legacy
    staff_id VARCHAR(36), -- link to staff table
    branch_id VARCHAR(36) NOT NULL,
    attendance_date DATE,
    check_in TIMESTAMP NULL,
    check_out TIMESTAMP NULL,
    location_lat DOUBLE,
    location_lng DOUBLE,
    latitude DOUBLE, -- from overhaul
    longitude DOUBLE, -- from overhaul
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, attendance_date),
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB;

-- 10. Products Table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50),
    price DECIMAL(12, 2) DEFAULT 0,
    quantity DECIMAL(12, 2) DEFAULT 0,
    min_stock_level DECIMAL(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 11. Services Table
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 12. Inventory Logs Table
CREATE TABLE IF NOT EXISTS inventory_logs (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36) NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    type ENUM('in', 'out', 'adjustment') NOT NULL,
    reason TEXT,
    reference_id VARCHAR(36),
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB;

-- 13. Financial Entries Table
CREATE TABLE IF NOT EXISTS financial_entries (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(255) UNIQUE,
    branch_id VARCHAR(36) NOT NULL,
    type ENUM('income', 'expense', 'transfer') NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    bank_amount DECIMAL(12, 2) DEFAULT 0,
    cash_amount DECIMAL(12, 2) DEFAULT 0,
    running_balance DECIMAL(12, 2) DEFAULT 0,
    description TEXT,
    date DATE NOT NULL,
    entry_time VARCHAR(20),
    reference_id VARCHAR(36),
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
