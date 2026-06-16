-- Add resolution_time column to complaints table
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS resolution_time TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.complaints.resolution_time IS 'Expected time to resolve the complaint (e.g., "24 Hours")';
