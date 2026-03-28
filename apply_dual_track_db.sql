-- This script adds the dual-track functionality to your live database safely with backward compatibility.
-- Existing projects will default perfectly to 'internal'.

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'internal' 
CHECK (project_type IN ('internal', 'client'));
