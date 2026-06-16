-- Storage setup for complaint attachments
-- This migration creates the bucket and sets up recursive access policies.

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-attachments', 'complaint-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS Policies for the bucket
-- Allow public read access to the bucket
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'complaint-attachments' );

-- Allow authenticated users to upload files
CREATE POLICY "Auth Insert Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'complaint-attachments' );

-- Allow authenticated users to delete their own files (or all for admins)
CREATE POLICY "Auth Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'complaint-attachments' );

-- Verification Notice
DO $$ 
BEGIN 
    RAISE NOTICE 'Complaint attachments storage bucket and policies created.';
END $$;
