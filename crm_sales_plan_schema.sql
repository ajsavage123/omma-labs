-- =================================================================
-- OOMA CRM: 7-Day Sales To-Do Feature Schema
-- Table to store weekly cycle task completions and manager sign-offs
-- =================================================================

CREATE TABLE IF NOT EXISTS public.crm_sales_plan_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  cycle_start_date date NOT NULL,
  day_number integer NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  task_id text NOT NULL,
  completed boolean DEFAULT false NOT NULL,
  completed_at timestamp with time zone,
  notes text,
  custom_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(workspace_id, user_id, cycle_start_date, day_number, task_id)
);

-- Table for Day 7 weekly submitted reports & manager audit reviews
CREATE TABLE IF NOT EXISTS public.crm_weekly_sales_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  cycle_start_date date NOT NULL,
  cycle_end_date date NOT NULL,
  leads_created_count integer DEFAULT 0,
  activities_logged_count integer DEFAULT 0,
  meetings_booked_count integer DEFAULT 0,
  deals_progressed_count integer DEFAULT 0,
  summary_notes text,
  manager_status text DEFAULT 'Pending Review' CHECK (manager_status IN ('Pending Review', 'Approved', 'Needs Improvement')),
  manager_feedback text,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamp with time zone,
  submitted_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(workspace_id, user_id, cycle_start_date)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.crm_sales_plan_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_weekly_sales_reports ENABLE ROW LEVEL SECURITY;

-- Policies for crm_sales_plan_progress
DROP POLICY IF EXISTS "Allow crm_sales_plan_progress select" ON public.crm_sales_plan_progress;
CREATE POLICY "Allow crm_sales_plan_progress select" ON public.crm_sales_plan_progress
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Allow crm_sales_plan_progress all" ON public.crm_sales_plan_progress;
CREATE POLICY "Allow crm_sales_plan_progress all" ON public.crm_sales_plan_progress
  FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Policies for crm_weekly_sales_reports
DROP POLICY IF EXISTS "Allow crm_weekly_sales_reports select" ON public.crm_weekly_sales_reports;
CREATE POLICY "Allow crm_weekly_sales_reports select" ON public.crm_weekly_sales_reports
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Allow crm_weekly_sales_reports all" ON public.crm_weekly_sales_reports;
CREATE POLICY "Allow crm_weekly_sales_reports all" ON public.crm_weekly_sales_reports
  FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_crm_sales_plan_cycle 
  ON public.crm_sales_plan_progress (workspace_id, user_id, cycle_start_date);

CREATE INDEX IF NOT EXISTS idx_crm_weekly_reports_cycle 
  ON public.crm_weekly_sales_reports (workspace_id, user_id, cycle_start_date);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
