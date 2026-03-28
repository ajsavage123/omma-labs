-- Critical Fix: This allows your application to use 'code_red' and 'paused' without Supabase throwing a 500 error.

-- 1. Drop the old broken constraint. (In Supabase, inline constraints are automatically named table_column_check)
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

-- 2. Add the new properly configured constraint
ALTER TABLE public.projects 
ADD CONSTRAINT projects_status_check 
CHECK (status IN ('active', 'completed', 'rejected', 'code_red', 'paused'));
