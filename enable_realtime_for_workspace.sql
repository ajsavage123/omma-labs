-- Safe SQL Script to Enable Supabase Realtime for Workspace Tables
-- Copy & Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Supabase requires tables to be explicitly added to the 'supabase_realtime' publication
-- in order for the frontend 'postgres_changes' subscriptions to work.

-- Add projects to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

-- Add chat messages to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Add CRM tables to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;

-- (Optional) If you want DELETE/UPDATE events to send the full old row data (useful for some notifications),
-- set Replica Identity to FULL.
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.crm_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.crm_leads REPLICA IDENTITY FULL;
