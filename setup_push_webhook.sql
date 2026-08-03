-- Setup Supabase Database Webhook to trigger the Edge Function "send-push"
-- NOTE: This requires pg_net extension to be enabled if doing manually via SQL,
-- BUT usually you should set this up in the Supabase Dashboard -> Database -> Webhooks.
-- 
-- If you want to do it via SQL using the pg_net extension:

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION trigger_send_push_webhook()
RETURNS TRIGGER AS $$
DECLARE
  request_id BIGINT;
  user_role TEXT;
BEGIN
  -- Safely fetch current role or fallback to service_role to avoid malformed json headers
  user_role := COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'service_role');

  -- We use pg_net to call the edge function asynchronously.
  SELECT net.http_post(
      url:='https://uswknwkxdzkrkaimwqvf.supabase.co/functions/v1/send-push',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'webhook-secret', 'my-super-secret-webhook-key',
        'Authorization', 'Bearer ' || user_role
      ),
      body:=json_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW),
        'old_record', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE null END
      )::jsonb
  ) INTO request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Notifications (Ignore 'chat' category to save Supabase limits)
DROP TRIGGER IF EXISTS on_notification_insert_send_push ON public.notifications;
CREATE TRIGGER on_notification_insert_send_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.category != 'chat')
  EXECUTE FUNCTION trigger_send_push_webhook();

-- Trigger for Chat Messages
DROP TRIGGER IF EXISTS on_chat_message_insert_send_push ON public.chat_messages;
CREATE TRIGGER on_chat_message_insert_send_push
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_push_webhook();
