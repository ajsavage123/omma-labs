-- This forcefully removes any generic backend auto-inserters so your new, dynamic
-- React-driven Dual-Track architecture takes full control of pipeline creation!

-- Drop the hidden trigger (Names may vary, so this targets common generic names)
DROP TRIGGER IF EXISTS on_project_created ON public.projects;
DROP FUNCTION IF EXISTS handle_new_project();
DROP FUNCTION IF EXISTS handle_new_project_stages();
DROP TRIGGER IF EXISTS insert_default_stages_trigger ON public.projects;
DROP FUNCTION IF EXISTS insert_default_stages();

-- Also permanently grant DELETE permissions so your React app can safely wipe arrays if needed
CREATE POLICY "Allow deleting workspace stages" 
ON public.project_stages 
FOR DELETE 
USING (workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid()));
