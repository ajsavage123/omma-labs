-- Disable generic Task Assignment Notification Trigger
-- This removes the 'New Task Assigned to You' notification completely from the database layer,
-- since the CRM is fully self-scheduling and users are now alerted to their due tasks directly in the UI.

CREATE OR REPLACE FUNCTION trigger_task_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- We ONLY trigger on task completion now to alert the creator
  IF TG_OP = 'UPDATE' AND NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
    -- Notify the creator of the task that it was completed, IF the creator isn't the one who completed it!
    IF NEW.created_by IS NOT NULL AND NEW.created_by != auth.uid() THEN
      INSERT INTO public.notifications (workspace_id, user_id, category, title, body, target_url, is_read)
      VALUES (NEW.workspace_id, NEW.created_by, 'task', '✅ Task Completed!', '"' || NEW.title || '" has been marked as completed by a teammate.', '/crm/tasks', false);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
