-- Safe SQL Migration Script for Universal Workspace Realtime Notifications
-- Copy & Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Create Notifications Table if not exists
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('chat', 'task', 'lead', 'activity', 'project', 'system')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_url TEXT DEFAULT '/',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Row Level Security Policies
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications 
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. Automatic Trigger Function: Notify on Task Assignment
CREATE OR REPLACE FUNCTION notify_on_task_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR 
       (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
        INSERT INTO public.notifications (workspace_id, user_id, category, title, body, target_url)
        VALUES (
            NEW.workspace_id,
            NEW.assigned_to,
            'task',
            '📋 New Task Assigned to You!',
            COALESCE(NEW.title, 'You have a new workspace task.'),
            '/crm/tasks'
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_task_assignment ON public.crm_tasks;
CREATE TRIGGER trigger_notify_task_assignment
AFTER INSERT OR UPDATE ON public.crm_tasks
FOR EACH ROW
EXECUTE FUNCTION notify_on_task_assignment();

-- 4. Enable Realtime Replication for Notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
