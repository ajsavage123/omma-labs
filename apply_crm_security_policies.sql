-- This script applies the "Signal over Noise" strict deletion rules to the CRM
-- It adds a created_by field for accountability and limits who can delete leads and tasks.

-- 1. Add created_by column to CRM tables if they don't exist, defaulting to the current user
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_leads' AND column_name='created_by') THEN
    ALTER TABLE public.crm_leads ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_tasks' AND column_name='created_by') THEN
    ALTER TABLE public.crm_tasks ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_activities' AND column_name='created_by') THEN
    ALTER TABLE public.crm_activities ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
  END IF;
END $$;

-- 2. Drop the old dangerous "FOR ALL" policies
DROP POLICY IF EXISTS "Allow crm_leads all" ON public.crm_leads;
DROP POLICY IF EXISTS "Allow crm_tasks all" ON public.crm_tasks;
DROP POLICY IF EXISTS "Allow crm_activities all" ON public.crm_activities;

-- 3. Create granular SELECT, INSERT, UPDATE policies (so everyone in the workspace can still collaborate)
-- Leads
DROP POLICY IF EXISTS "Allow crm_leads select" ON public.crm_leads;
DROP POLICY IF EXISTS "Allow crm_leads insert" ON public.crm_leads;
DROP POLICY IF EXISTS "Allow crm_leads update" ON public.crm_leads;
CREATE POLICY "Allow crm_leads select" ON public.crm_leads FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Allow crm_leads insert" ON public.crm_leads FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Allow crm_leads update" ON public.crm_leads FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.users WHERE id = auth.uid()));

-- Tasks
DROP POLICY IF EXISTS "Allow crm_tasks select" ON public.crm_tasks;
DROP POLICY IF EXISTS "Allow crm_tasks insert" ON public.crm_tasks;
DROP POLICY IF EXISTS "Allow crm_tasks update" ON public.crm_tasks;
CREATE POLICY "Allow crm_tasks select" ON public.crm_tasks FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Allow crm_tasks insert" ON public.crm_tasks FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Allow crm_tasks update" ON public.crm_tasks FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.users WHERE id = auth.uid()));

-- Activities
DROP POLICY IF EXISTS "Allow crm_activities select" ON public.crm_activities;
DROP POLICY IF EXISTS "Allow crm_activities insert" ON public.crm_activities;
DROP POLICY IF EXISTS "Allow crm_activities update" ON public.crm_activities;
CREATE POLICY "Allow crm_activities select" ON public.crm_activities FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Allow crm_activities insert" ON public.crm_activities FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Allow crm_activities update" ON public.crm_activities FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.users WHERE id = auth.uid()));

-- 4. Create strictly enforced DELETE policies (Only Creator or Admin)
-- For historical data where created_by might be NULL, only admins will be able to delete.
DROP POLICY IF EXISTS "Allow crm_leads delete" ON public.crm_leads;
CREATE POLICY "Allow crm_leads delete" ON public.crm_leads FOR DELETE 
USING (created_by = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Allow crm_tasks delete" ON public.crm_tasks;
CREATE POLICY "Allow crm_tasks delete" ON public.crm_tasks FOR DELETE 
USING (created_by = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Allow crm_activities delete" ON public.crm_activities;
CREATE POLICY "Allow crm_activities delete" ON public.crm_activities FOR DELETE 
USING (created_by = auth.uid() OR user_id = auth.uid() OR is_admin());

-- Force schema reload for PostgREST
NOTIFY pgrst, 'reload schema';
