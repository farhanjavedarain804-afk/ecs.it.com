-- Attendance Overhaul: 12 PM Pivot and One-Entry-Per-Day Logic

-- 1. Add attendance_date column
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS attendance_date DATE;

-- 2. Function to calculate attendance date based on 12 PM pivot
CREATE OR REPLACE FUNCTION public.calculate_attendance_date(ts TIMESTAMPTZ)
RETURNS DATE AS $$
BEGIN
    -- If time is before 12:00 PM, consider it part of the previous day's shift
    IF EXTRACT(HOUR FROM ts AT TIME ZONE 'UTC') < 7 THEN -- 12 PM PKT is 7 AM UTC (PKT is UTC+5)
        -- Wait, let's use the local time if possible or just assume PKT for this specific business
        -- Better yet: Use current_setting('timezone') or just assume input is what we want.
        -- Let's stick to the user's logic: 12 PM pivot.
        -- Assuming the database TIMESTAMP is stored in UTC but we want to pivot at 12 PM PKT (7 AM UTC).
        IF EXTRACT(HOUR FROM ts AT TIME ZONE 'Asia/Karachi') < 12 THEN
            RETURN (ts AT TIME ZONE 'Asia/Karachi' - interval '1 day')::date;
        ELSE
            RETURN (ts AT TIME ZONE 'Asia/Karachi')::date;
        END IF;
    END IF;
    
    -- Fallback simple logic if timezone is tricky
    IF EXTRACT(HOUR FROM ts AT TIME ZONE 'Asia/Karachi') < 12 THEN
        RETURN (ts AT TIME ZONE 'Asia/Karachi' - interval '1 day')::date;
    ELSE
        RETURN (ts AT TIME ZONE 'Asia/Karachi')::date;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Trigger function to auto-populate attendance_date
CREATE OR REPLACE FUNCTION public.update_attendance_date_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.attendance_date := public.calculate_attendance_date(NEW.check_in);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS tr_update_attendance_date ON public.attendance;
CREATE TRIGGER tr_update_attendance_date
BEFORE INSERT OR UPDATE OF check_in ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.update_attendance_date_trigger();

-- 5. Backfill and Clean Data
-- 5.1 Calculate attendance_date for all records
UPDATE public.attendance SET attendance_date = public.calculate_attendance_date(check_in) WHERE attendance_date IS NULL;

-- 5.2 Fix records where check_out is before check_in (Prevents Constraint Violation)
UPDATE public.attendance SET check_out = NULL WHERE check_out IS NOT NULL AND check_out <= check_in;

-- 5.3 Handle duplicates before adding UNIQUE constraint
-- Keep only the first entry (earliest check_in) for any given employee on a given attendance_date
DELETE FROM public.attendance a
WHERE a.id NOT IN (
    SELECT id
    FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY staff_id, attendance_date ORDER BY check_in ASC) as rn
        FROM public.attendance
    ) t
    WHERE t.rn = 1
);

-- 6. Add UNIQUE constraint to prevent duplicate attendance per day per staff
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS unique_staff_attendance_per_day;
ALTER TABLE public.attendance ADD CONSTRAINT unique_staff_attendance_per_day UNIQUE (staff_id, attendance_date);

-- 7. Ensure check_out is after check_in
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS check_out_after_check_in;
ALTER TABLE public.attendance ADD CONSTRAINT check_out_after_check_in CHECK (check_out IS NULL OR check_out > check_in);

-- 8. Add index for reporting performance
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_date ON public.attendance(staff_id, attendance_date);
