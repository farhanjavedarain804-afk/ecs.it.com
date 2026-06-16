-- FIX COMPLAINT STATUS ENUM
-- This migration ensures that 'solved' and 'dismissed' statuses are available in the public.complaint_status enum.

DO $$ 
BEGIN 
    -- Add 'solved' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'complaint_status' AND e.enumlabel = 'solved') THEN
        ALTER TYPE public.complaint_status ADD VALUE 'solved';
    END IF;

    -- Add 'dismissed' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'complaint_status' AND e.enumlabel = 'dismissed') THEN
        ALTER TYPE public.complaint_status ADD VALUE 'dismissed';
    END IF;
END $$;

DO $$ 
BEGIN 
    RAISE NOTICE 'Complaint status enum has been updated to include solved and dismissed.';
END $$;
