-- Allow Super Admins to manage all profiles (required for branch admin setup)
CREATE POLICY "Super admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
