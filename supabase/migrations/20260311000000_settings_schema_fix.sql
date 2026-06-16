-- CRITICAL FIX: Settings Table Sync
-- This migration ensures the 'settings' table exists and is properly configured for Maintenance Mode
-- Run this if you see "could not find table public.settings in schema cache"

-- 1. Create Settings Table (Re-asserting)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 3. Clear existing conflicting policies
DROP POLICY IF EXISTS "Super Admins and Developers can manage settings" ON public.settings;
DROP POLICY IF EXISTS "Everyone can read settings" ON public.settings;

-- 4. Re-create Policies
-- Privileged management
CREATE POLICY "Super Admins and Developers can manage settings"
ON public.settings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) OR (
        SELECT email FROM auth.users WHERE id = auth.uid()
    ) = 'farhanjaved357@gmail.com'
);

-- Public read access for apps
CREATE POLICY "Everyone can read settings"
ON public.settings
FOR SELECT
TO authenticated
USING (true);

-- 5. Ensure Maintenance Mode Key Exists
INSERT INTO public.settings (key, value)
VALUES ('maintenance_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Verification Notice
DO $$ 
BEGIN 
    RAISE NOTICE 'Settings table and maintenance_mode successfully synchronized.';
END $$;
