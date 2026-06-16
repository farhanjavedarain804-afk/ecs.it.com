-- Real-Time Notifications System
-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Optional: target a specific user
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE, -- Branch context
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'destructive'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb -- For links or extra IDs
);

-- 2. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Users can see notifications for their branch or global ones
DROP POLICY IF EXISTS "Users can view relevant notifications" ON public.notifications;
CREATE POLICY "Users can view relevant notifications"
ON public.notifications FOR SELECT TO authenticated
USING (
    (public.has_role(auth.uid(), 'super_admin')) OR 
    (branch_id IS NULL) OR 
    (branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Users can mark their own notifications as read
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Notification Triggers
-- A. Trigger for New Complaints
CREATE OR REPLACE FUNCTION public.notify_new_complaint()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (branch_id, title, message, type, metadata)
    VALUES (
        NEW.branch_id, 
        'New Complaint Registered', 
        'Complaint ' || NEW.complaint_number || ' has been registered.', 
        'info',
        jsonb_build_object('complaint_id', NEW.id, 'complaint_number', NEW.complaint_number)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_complaint_registered
    AFTER INSERT ON public.complaints
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_complaint();

-- B. Trigger for Resolved Complaints
CREATE OR REPLACE FUNCTION public.notify_complaint_resolved()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status != 'solved' AND NEW.status = 'solved') THEN
        INSERT INTO public.notifications (branch_id, title, message, type, metadata)
        VALUES (
            NEW.branch_id, 
            'Complaint Solved', 
            'Complaint ' || NEW.complaint_number || ' has been marked as solved.', 
            'success',
            jsonb_build_object('complaint_id', NEW.id, 'complaint_number', NEW.complaint_number)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_complaint_solved
    AFTER UPDATE ON public.complaints
    FOR EACH ROW EXECUTE FUNCTION public.notify_complaint_resolved();

-- C. Trigger for Low Stock
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.quantity < NEW.min_stock_level AND (OLD.quantity >= NEW.min_stock_level OR OLD.quantity IS NULL)) THEN
        INSERT INTO public.notifications (branch_id, title, message, type, metadata)
        VALUES (
            NEW.branch_id, 
            'Low Stock Alert', 
            'Item ' || NEW.name || ' is below minimum stock level.', 
            'warning',
            jsonb_build_object('item_id', NEW.id, 'sku', NEW.sku)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_low_stock
    AFTER UPDATE OR INSERT ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock();
