-- User Activity and Monitoring System
-- 1. Create Activity Logs Table
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT, -- Flat cache for easy viewing
    activity_type TEXT NOT NULL, -- 'login', 'logout', 'password_reset_request'
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Super Admins can see EVERYTHING
DROP POLICY IF EXISTS "Super admins can manage activity logs" ON public.user_activity_logs;
CREATE POLICY "Super admins can manage activity logs" 
ON public.user_activity_logs FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Any authenticated user can INSERT their own login logs
DROP POLICY IF EXISTS "Users can insert own activity logs" ON public.user_activity_logs;
CREATE POLICY "Users can insert own activity logs" 
ON public.user_activity_logs FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
