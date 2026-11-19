-- Fix Supabase Foreign Key Relationships for PostgREST embedding
-- Resolves PGRST200: "Could not find a relationship between crm_tasks/crm_activities and assigned_to/user_id in schema cache"

-- 1. Ensure crm_tasks.assigned_to references public.users(id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'crm_tasks_assigned_to_fkey'
  ) THEN
    ALTER TABLE public.crm_tasks DROP CONSTRAINT crm_tasks_assigned_to_fkey;
  END IF;
END $$;

ALTER TABLE public.crm_tasks 
  ADD CONSTRAINT crm_tasks_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


-- 2. Ensure crm_activities.user_id references public.users(id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'crm_activities_user_id_fkey'
  ) THEN
    ALTER TABLE public.crm_activities DROP CONSTRAINT crm_activities_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.crm_activities 
  ADD CONSTRAINT crm_activities_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
