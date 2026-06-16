-- 1. Add helper_id to complaints
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS assigned_helper UUID REFERENCES public.staff(id);

-- 2. Add default_resolution_time to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS default_resolution_time INTEGER DEFAULT 24;

-- 3. Update attachments column to be TEXT[] (array of URLs/paths)
-- Note: It might already be TEXT[] from previous migrations, but ensuring here.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'attachments') THEN
        ALTER TABLE public.complaints ADD COLUMN attachments TEXT[] DEFAULT '{}';
    END IF;
END $$;
