-- The database is using a strict custom ENUM type called "ooma_pipeline_stage".
-- This script converts those columns safely to standard TEXT, instantly fixing the 400 error
-- and allowing the new Venture Studio tracks to function beautifully.

ALTER TABLE public.project_stages ALTER COLUMN stage_name TYPE TEXT USING stage_name::TEXT;
ALTER TABLE public.timeline_logs ALTER COLUMN stage TYPE TEXT USING stage::TEXT;

-- Optional: Clean up the old restrictive enum safely
DROP TYPE IF EXISTS ooma_pipeline_stage CASCADE;
