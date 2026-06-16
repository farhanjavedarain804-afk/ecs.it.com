-- Restrict Services & Products Management to Super Admins
-- This ensures branch admins can only view services/products but not modify them.

-- 1. Drop existing management policies for services
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;

-- 2. Create new restricted management policy for services
CREATE POLICY "Super Admins can manage services" ON public.services
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'super_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 3. Drop existing management policies for products
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

-- 4. Create new restricted management policy for products
CREATE POLICY "Super Admins can manage products" ON public.products
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'super_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Note: Existing "Authenticated users can view services/products" FOR SELECT policies remain intact.
