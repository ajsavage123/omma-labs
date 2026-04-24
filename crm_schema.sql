-- CRM Module Schema
-- To be executed in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  company_name text NOT NULL,
  contact_person text NOT NULL,
  email text,
  phone text,
  estimated_value integer DEFAULT 0,
  confidence integer DEFAULT 25,
  service_interest text,
  business_type text,
  website text,
  external_link text,
  notes text,
  custom_data jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'New Lead'::text NOT NULL,
  follow_up_date timestamp with time zone,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL
);

-- Add tracking fields if the table already exists via migration safety
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_leads' AND column_name='confidence') THEN
    ALTER TABLE public.crm_leads ADD COLUMN confidence integer DEFAULT 25;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_leads' AND column_name='service_interest') THEN
    ALTER TABLE public.crm_leads ADD COLUMN service_interest text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_leads' AND column_name='follow_up_date') THEN
    ALTER TABLE public.crm_leads ADD COLUMN follow_up_date timestamp with time zone;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_leads' AND column_name='business_type') THEN
    ALTER TABLE public.crm_leads ADD COLUMN business_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_leads' AND column_name='website') THEN
    ALTER TABLE public.crm_leads ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_leads' AND column_name='external_link') THEN
    ALTER TABLE public.crm_leads ADD COLUMN external_link text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_leads' AND column_name='notes') THEN
    ALTER TABLE public.crm_leads ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_leads' AND column_name='custom_data') THEN
    ALTER TABLE public.crm_leads ADD COLUMN custom_data jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL, -- e.g., 'call', 'email', 'note'
  description text
);

-- Enable Row Level Security
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- Policies for crm_leads
DROP POLICY IF EXISTS "Allow crm_leads select" ON public.crm_leads;
CREATE POLICY "Allow crm_leads select" ON public.crm_leads FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Allow crm_leads all" ON public.crm_leads;
CREATE POLICY "Allow crm_leads all" ON public.crm_leads FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Policies for crm_activities
DROP POLICY IF EXISTS "Allow crm_activities all" ON public.crm_activities;
CREATE POLICY "Allow crm_activities all" ON public.crm_activities FOR ALL USING (auth.role() = 'authenticated');

-- Tasks Table
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  due_date timestamp with time zone,
  due_time time, -- Zoho-style timing
  priority text DEFAULT 'Medium', -- High, Medium, Low
  activity_type text DEFAULT 'Task', -- Task, Call, Meeting
  title text NOT NULL,
  status text DEFAULT 'Pending'::text NOT NULL,
  assigned_to uuid REFERENCES auth.users(id),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL
);

-- Migration logic for Zoho-style Activities
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_tasks' AND column_name='due_time') THEN
    ALTER TABLE public.crm_tasks ADD COLUMN due_time time;
    ALTER TABLE public.crm_tasks ADD COLUMN priority text DEFAULT 'Medium';
    ALTER TABLE public.crm_tasks ADD COLUMN activity_type text DEFAULT 'Task';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='last_activity_at') THEN
    ALTER TABLE public.crm_leads ADD COLUMN last_activity_at timestamp with time zone DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='source') THEN
    ALTER TABLE public.crm_leads ADD COLUMN source text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='tags') THEN
    ALTER TABLE public.crm_leads ADD COLUMN tags text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='budget') THEN
    ALTER TABLE public.crm_leads ADD COLUMN budget integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='onboarding_checklist') THEN
    ALTER TABLE public.crm_leads ADD COLUMN onboarding_checklist jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='payment_status') THEN
    ALTER TABLE public.crm_leads ADD COLUMN payment_status text DEFAULT 'Pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='amount_paid') THEN
    ALTER TABLE public.crm_leads ADD COLUMN amount_paid integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='project_milestones_status') THEN
    ALTER TABLE public.crm_leads ADD COLUMN project_milestones_status jsonb DEFAULT '{"Design":"Pending","Development":"Pending","Testing":"Pending","Delivery":"Pending"}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='proposal_date') THEN
    ALTER TABLE public.crm_leads ADD COLUMN proposal_date timestamp with time zone;
  END IF;
END $$;

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow crm_tasks select" ON public.crm_tasks;
CREATE POLICY "Allow crm_tasks select" ON public.crm_tasks FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Allow crm_tasks all" ON public.crm_tasks;
CREATE POLICY "Allow crm_tasks all" ON public.crm_tasks FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Force Supabase PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
