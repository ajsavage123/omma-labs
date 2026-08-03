-- Automatically generate notifications for new Chat Messages
CREATE OR REPLACE FUNCTION trigger_chat_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  w_id UUID;
BEGIN
  -- Get the sender name
  SELECT COALESCE(full_name, username, 'Teammate') INTO sender_name
  FROM public.users WHERE id = NEW.user_id;
  
  -- Get the workspace id
  SELECT workspace_id INTO w_id
  FROM public.users WHERE id = NEW.user_id;

  -- Insert a notification for everyone in the workspace EXCEPT the sender (who triggered this via auth.uid())
  INSERT INTO public.notifications (workspace_id, user_id, category, title, body, target_url, is_read)
  SELECT 
    w_id,
    id,
    'chat',
    '💬 New Message from ' || sender_name,
    COALESCE(NEW.message, 'Sent a message in Workspace Chat'),
    '/?open_chat=true',
    false
  FROM public.users
  WHERE workspace_id = w_id AND id != auth.uid();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_chat_message_insert ON public.chat_messages;
CREATE TRIGGER after_chat_message_insert
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION trigger_chat_notification();


-- Automatically generate notifications for CRM Leads
CREATE OR REPLACE FUNCTION trigger_lead_notification()
RETURNS TRIGGER AS $$
DECLARE
  company TEXT;
BEGIN
  company := COALESCE(NEW.company_name, NEW.contact_person, 'New Lead');

  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_to IS NOT NULL THEN
      -- Notify Assignee ONLY if the assignee didn't create the lead themselves
      IF NEW.assigned_to != auth.uid() THEN
        INSERT INTO public.notifications (workspace_id, user_id, category, title, body, target_url, is_read)
        VALUES (NEW.workspace_id, NEW.assigned_to, 'lead', '💼 New Lead Assigned to You', company || ' added to pipeline', '/crm/leads', false);
      END IF;
    ELSE
      -- Notify Admins if unassigned
      INSERT INTO public.notifications (workspace_id, user_id, category, title, body, target_url, is_read)
      SELECT NEW.workspace_id, id, 'lead', '💼 New CRM Lead Added', company || ' needs to be assigned', '/crm/leads', false
      FROM public.users
      WHERE workspace_id = NEW.workspace_id AND role = 'admin' AND id != auth.uid();
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    -- Notify Assignee of stage change, if the assignee didn't move it themselves
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != auth.uid() THEN
      INSERT INTO public.notifications (workspace_id, user_id, category, title, body, target_url, is_read)
      VALUES (NEW.workspace_id, NEW.assigned_to, 'lead', '🚀 Lead Stage Moved', company || ' moved to "' || NEW.status || '"', '/crm/pipeline', false);
    END IF;
    -- Notify the Creator of stage change, if the creator didn't move it themselves and isn't the assignee
    IF NEW.created_by IS NOT NULL AND NEW.created_by != auth.uid() AND NEW.created_by != NEW.assigned_to THEN
      INSERT INTO public.notifications (workspace_id, user_id, category, title, body, target_url, is_read)
      VALUES (NEW.workspace_id, NEW.created_by, 'lead', '🚀 Lead Stage Moved', company || ' moved to "' || NEW.status || '"', '/crm/pipeline', false);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_lead_change ON public.crm_leads;
CREATE TRIGGER after_lead_change
AFTER INSERT OR UPDATE OF status ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION trigger_lead_notification();


-- Automatically generate notifications for CRM Tasks
CREATE OR REPLACE FUNCTION trigger_task_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Notify Assignee if they didn't create the task themselves
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != auth.uid() THEN
      INSERT INTO public.notifications (workspace_id, user_id, category, title, body, target_url, is_read)
      VALUES (NEW.workspace_id, NEW.assigned_to, 'task', '📋 New Task Assigned to You!', NEW.title || ' (Priority: ' || COALESCE(NEW.priority, 'Medium') || ')', '/crm/tasks', false);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
    -- Notify the creator of the task that it was completed, IF the creator isn't the one who completed it!
    IF NEW.created_by IS NOT NULL AND NEW.created_by != auth.uid() THEN
      INSERT INTO public.notifications (workspace_id, user_id, category, title, body, target_url, is_read)
      VALUES (NEW.workspace_id, NEW.created_by, 'task', '✅ Task Completed!', '"' || NEW.title || '" has been marked as completed by a teammate.', '/crm/tasks', false);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_task_change ON public.crm_tasks;
CREATE TRIGGER after_task_change
AFTER INSERT OR UPDATE OF status ON public.crm_tasks
FOR EACH ROW EXECUTE FUNCTION trigger_task_notification();
