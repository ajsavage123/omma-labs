-- =========================================================================
-- SECURE WORKSPACE ISOLATION RLS POLICIES
-- =========================================================================

-- 1. Create a fast, non-recursive helper function to get the current user's workspace
CREATE OR REPLACE FUNCTION public.get_my_workspace_id() 
RETURNS UUID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT workspace_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

-- =========================================================================
-- 2. APPLY STRICT WORKSPACE ISOLATION TO ALL CORE TABLES
-- =========================================================================

-- users Table
DROP POLICY IF EXISTS "Allow authenticated read users" ON public.users;
CREATE POLICY "Allow authenticated read users" ON public.users FOR SELECT USING (
    workspace_id = public.get_my_workspace_id() OR id = auth.uid()
);

-- projects Table
DROP POLICY IF EXISTS "Allow project read" ON public.projects;
CREATE POLICY "Allow project read" ON public.projects FOR SELECT USING (workspace_id = public.get_my_workspace_id());

DROP POLICY IF EXISTS "Allow project insert" ON public.projects;
CREATE POLICY "Allow project insert" ON public.projects FOR INSERT WITH CHECK (workspace_id = public.get_my_workspace_id());

DROP POLICY IF EXISTS "Allow project update" ON public.projects;
CREATE POLICY "Allow project update" ON public.projects FOR UPDATE USING (workspace_id = public.get_my_workspace_id());

-- project_stages Table
DROP POLICY IF EXISTS "Allow stage read" ON public.project_stages;
CREATE POLICY "Allow stage read" ON public.project_stages FOR SELECT USING (workspace_id = public.get_my_workspace_id());

DROP POLICY IF EXISTS "Allow stage mod" ON public.project_stages;
CREATE POLICY "Allow stage mod" ON public.project_stages FOR ALL USING (workspace_id = public.get_my_workspace_id());

-- timeline_logs Table
DROP POLICY IF EXISTS "Allow logs select" ON public.timeline_logs;
CREATE POLICY "Allow logs select" ON public.timeline_logs FOR SELECT USING (workspace_id = public.get_my_workspace_id());

DROP POLICY IF EXISTS "Allow logs insert" ON public.timeline_logs;
CREATE POLICY "Allow logs insert" ON public.timeline_logs FOR INSERT WITH CHECK (workspace_id = public.get_my_workspace_id());

-- admin_ratings Table
DROP POLICY IF EXISTS "Allow members to view ratings" ON public.admin_ratings;
CREATE POLICY "Allow members to view ratings" ON public.admin_ratings FOR SELECT USING (workspace_id = public.get_my_workspace_id());

-- crm_activities Table
DROP POLICY IF EXISTS "Allow crm_activities all" ON public.crm_activities;
CREATE POLICY "Allow crm_activities all" ON public.crm_activities FOR ALL USING (workspace_id = public.get_my_workspace_id());

-- crm_leads Table (Optional: replace subquery with helper)
DROP POLICY IF EXISTS "Allow crm_leads select" ON public.crm_leads;
CREATE POLICY "Allow crm_leads select" ON public.crm_leads FOR SELECT USING (workspace_id = public.get_my_workspace_id());

DROP POLICY IF EXISTS "Allow crm_leads all" ON public.crm_leads;
CREATE POLICY "Allow crm_leads all" ON public.crm_leads FOR ALL USING (workspace_id = public.get_my_workspace_id());

-- crm_tasks Table
DROP POLICY IF EXISTS "Allow crm_tasks select" ON public.crm_tasks;
CREATE POLICY "Allow crm_tasks select" ON public.crm_tasks FOR SELECT USING (workspace_id = public.get_my_workspace_id());

DROP POLICY IF EXISTS "Allow crm_tasks all" ON public.crm_tasks;
CREATE POLICY "Allow crm_tasks all" ON public.crm_tasks FOR ALL USING (workspace_id = public.get_my_workspace_id());

-- ideas Table
DROP POLICY IF EXISTS "Allow ideas select" ON public.ideas;
CREATE POLICY "Allow ideas select" ON public.ideas FOR SELECT USING (workspace_id = public.get_my_workspace_id());

DROP POLICY IF EXISTS "Allow ideas insert" ON public.ideas;
CREATE POLICY "Allow ideas insert" ON public.ideas FOR INSERT WITH CHECK (workspace_id = public.get_my_workspace_id());

-- client_contacts Table
DROP POLICY IF EXISTS "Allow contacts select" ON public.client_contacts;
CREATE POLICY "Allow contacts select" ON public.client_contacts FOR SELECT USING (workspace_id = public.get_my_workspace_id());

DROP POLICY IF EXISTS "Allow contacts all" ON public.client_contacts;
CREATE POLICY "Allow contacts all" ON public.client_contacts FOR ALL USING (workspace_id = public.get_my_workspace_id());

-- chat_messages Table
DROP POLICY IF EXISTS "Enable read access for authenticated users on chat" ON public.chat_messages;
CREATE POLICY "Enable read access for authenticated users on chat" ON public.chat_messages FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());

DROP POLICY IF EXISTS "Enable insert for authenticated users on chat" ON public.chat_messages;
CREATE POLICY "Enable insert for authenticated users on chat" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND workspace_id = public.get_my_workspace_id());

DROP POLICY IF EXISTS "Enable update for authenticated users on chat" ON public.chat_messages;
CREATE POLICY "Enable update for authenticated users on chat" ON public.chat_messages FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id());

-- invitations Table
DROP POLICY IF EXISTS "Allow updating used status" ON public.invitations;
CREATE POLICY "Allow updating used status" ON public.invitations FOR UPDATE USING (workspace_id = public.get_my_workspace_id());

-- Force Supabase PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
