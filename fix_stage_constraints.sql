-- Fix 400 Bad Request on inserting new project stages.
-- If the Supabase Dashboard "Restrict to these values" was used, it creates hidden constraints. This disables them to allow the new Client Agency Pipeline shapes.

ALTER TABLE public.project_stages DROP CONSTRAINT IF EXISTS project_stages_stage_name_check;
ALTER TABLE public.timeline_logs DROP CONSTRAINT IF EXISTS timeline_logs_stage_check;
ALTER TABLE public.timeline_logs DROP CONSTRAINT IF EXISTS timeline_logs_designation_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_designation_check;
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_designation_check;
