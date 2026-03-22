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
