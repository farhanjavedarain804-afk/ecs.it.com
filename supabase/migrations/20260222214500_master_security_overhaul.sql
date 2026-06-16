-- MASTER SECURITY OVERHAUL
-- Run this in your Supabase SQL Editor to fix RLS issues for Super Admins

DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- 1. Ensure target user has super_admin role
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'farhanjaved357@gmail.com';

    IF target_user_id IS NOT NULL THEN
        -- Ensure profile exists
        INSERT INTO public.profiles (user_id, full_name, is_active)
        VALUES (target_user_id, 'Master Admin', true)
        ON CONFLICT (user_id) DO UPDATE SET is_active = true;

        -- Assign super_admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'super_admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Role super_admin assigned to farhanjaved357@gmail.com';
    END IF;
END $$;

-- 2. Drop any potentially conflicting restrictive policies for Super Admins
-- (We will add clean 'FOR ALL' policies below)

-- 3. APPLY MASTER POLICIES FOR SUPER ADMINS
-- This grants Super Admins UNCONDITIONAL access to all rows in all tables

-- Branches
DROP POLICY IF EXISTS "Super admins can manage branches" ON public.branches;
CREATE POLICY "Super admins can manage branches" ON public.branches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Profiles
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
CREATE POLICY "Super admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- User Roles
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Customers
DROP POLICY IF EXISTS "Super admins can manage customers" ON public.customers;
CREATE POLICY "Super admins can manage customers" ON public.customers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Complaints
DROP POLICY IF EXISTS "Super admins can manage complaints" ON public.complaints;
CREATE POLICY "Super admins can manage complaints" ON public.complaints FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Invoices
DROP POLICY IF EXISTS "Super admins can manage invoices" ON public.invoices;
CREATE POLICY "Super admins can manage invoices" ON public.invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Invoice Items
DROP POLICY IF EXISTS "Super admins can manage invoice items" ON public.invoice_items;
CREATE POLICY "Super admins can manage invoice items" ON public.invoice_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Staff
DROP POLICY IF EXISTS "Admins can manage staff" ON public.staff;
CREATE POLICY "Admins can manage staff" ON public.staff FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'branch_admin'));

-- Services
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Admins can manage services" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'branch_admin'));

-- Products
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'branch_admin'));

-- Inventory
DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON public.inventory_items;
CREATE POLICY "Authenticated users can manage inventory" ON public.inventory_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'store_manager') OR public.has_role(auth.uid(), 'branch_admin'));

-- Financial Entries
DROP POLICY IF EXISTS "Super admins can manage financial" ON public.financial_entries;
CREATE POLICY "Super admins can manage financial" ON public.financial_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- System Logs
DROP POLICY IF EXISTS "Super admins can view system logs" ON public.system_logs;
CREATE POLICY "Super admins can view system logs" ON public.system_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

RAISE NOTICE 'Security overhaul complete. All core tables now have Super Admin bypass policies.';
