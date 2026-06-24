-- FINAL FIX: Add missing DELETE policies for administrators using official is_admin() function
-- Copy and Run this in your Supabase SQL Editor

-- 1. Projects DELETE policy
DROP POLICY IF EXISTS "Allow admins to delete projects" ON projects;
CREATE POLICY "Allow admins to delete projects" ON projects 
FOR DELETE 
USING (is_admin());

-- 2. Project Stages DELETE policy (just in case they aren't cascading)
DROP POLICY IF EXISTS "Allow admins to delete stages" ON project_stages;
CREATE POLICY "Allow admins to delete stages" ON project_stages 
FOR DELETE 
USING (is_admin());

-- 3. Timeline Logs DELETE policy
DROP POLICY IF EXISTS "Allow admins to delete logs" ON timeline_logs;
CREATE POLICY "Allow admins to delete logs" ON timeline_logs 
FOR DELETE 
USING (is_admin());

-- 4. Admin Ratings DELETE policy
DROP POLICY IF EXISTS "Allow admins to delete ratings" ON admin_ratings;
CREATE POLICY "Allow admins to delete ratings" ON admin_ratings 
FOR DELETE 
USING (is_admin());

-- 5. Helper function for workspace ID check to prevent RLS subquery bugs during bulk deletes
CREATE OR REPLACE FUNCTION get_user_workspace_id() RETURNS UUID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT workspace_id FROM users WHERE id = auth.uid();
$$;

-- 6. Leads DELETE policy
DROP POLICY IF EXISTS "Allow delete crm_leads" ON public.crm_leads;
CREATE POLICY "Allow delete crm_leads" ON public.crm_leads 
FOR DELETE 
USING (workspace_id = get_user_workspace_id());

-- 7. Tasks DELETE policy (to ensure cascade deletes on tasks are not blocked by RLS)
DROP POLICY IF EXISTS "Allow delete crm_tasks" ON public.crm_tasks;
CREATE POLICY "Allow delete crm_tasks" ON public.crm_tasks 
FOR DELETE 
USING (workspace_id = get_user_workspace_id());

