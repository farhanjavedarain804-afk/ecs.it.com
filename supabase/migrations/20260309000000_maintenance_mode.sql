-- Maintenance Mode & Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow Super Admins and Developers to manage settings
CREATE POLICY "Super Admins and Developers can manage settings"
ON public.settings
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) OR (
        SELECT email FROM auth.users WHERE id = auth.uid()
    ) = 'farhanjaved357@gmail.com'
);

-- Allow all users to read maintenance_mode setting
CREATE POLICY "Everyone can read settings"
ON public.settings
FOR SELECT
USING (true);

-- Insert initial maintenance_mode setting
INSERT INTO public.settings (key, value)
VALUES ('maintenance_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RPC to update user password (for Super Admin use)
-- This requires high privilege, usually handled via service_role or a security definer function
CREATE OR REPLACE FUNCTION public.admin_update_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the caller is a Super Admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;
END;
$$;
