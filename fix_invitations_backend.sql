-- FIX FOR INVITATIONS AND MULTIPLE DEPARTMENTS
-- Execute this in the Supabase SQL Editor

-- 1. Ensure Designation columns are flexible TEXT (no Enums/Constraints)
ALTER TABLE IF EXISTS public.invitations ALTER COLUMN designation TYPE TEXT;
ALTER TABLE IF EXISTS public.users ALTER COLUMN designation TYPE TEXT;

-- 2. Add Missing RLS Policies for Invitations
-- This fixes the "invalid or expired code" error caused by RLS blocking the read
DROP POLICY IF EXISTS "Allow reading invitations for workspace" ON public.invitations;
CREATE POLICY "Allow reading invitations for workspace" ON public.invitations 
FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.users WHERE public.users.id = auth.uid()) 
    OR used = false
);

DROP POLICY IF EXISTS "Allow admins to create invitations" ON public.invitations;
CREATE POLICY "Allow admins to create invitations" ON public.invitations 
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Allow updating used status" ON public.invitations;
CREATE POLICY "Allow updating used status" ON public.invitations 
FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow deleting invitations" ON public.invitations;
CREATE POLICY "Allow deleting invitations" ON public.invitations 
FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Add Missing RLS Policies for Admin Ratings
DROP POLICY IF EXISTS "Allow admins to manage ratings" ON public.admin_ratings;
CREATE POLICY "Allow admins to manage ratings" ON public.admin_ratings 
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Allow members to view ratings" ON public.admin_ratings;
CREATE POLICY "Allow members to view ratings" ON public.admin_ratings 
FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
