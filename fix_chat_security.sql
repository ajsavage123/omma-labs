-- 1. SECURITY FIX: Prevent users from editing or deleting other people's messages
CREATE OR REPLACE FUNCTION check_chat_message_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If the message text or the soft-delete flag is being changed
  IF (OLD.message != NEW.message OR OLD.is_deleted_everyone != NEW.is_deleted_everyone) THEN
    -- Check if the person making the change is the original author
    IF (auth.uid() != OLD.user_id) THEN
      RAISE EXCEPTION 'Not authorized to edit or delete someone else''s message';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to run BEFORE any update on chat_messages
DROP TRIGGER IF EXISTS enforce_chat_edit_security ON public.chat_messages;
CREATE TRIGGER enforce_chat_edit_security
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION check_chat_message_update();

-- 2. PERFORMANCE FIX: Optimize chat cleanup (Save compute limits)
-- First, drop the horribly inefficient trigger that runs on EVERY message insert
DROP TRIGGER IF EXISTS trigger_delete_old_chats ON public.chat_messages;

-- Redefine the cleanup function to return void (instead of a trigger)
DROP FUNCTION IF EXISTS delete_old_chat_messages();
CREATE OR REPLACE FUNCTION delete_old_chat_messages()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.chat_messages WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule it just in case it already exists to avoid duplicates
-- (Commented out because it throws an error if the job doesn't exist yet)
-- SELECT cron.unschedule('delete_old_chat_messages_job');

-- Schedule the cleanup to run efficiently ONCE a day at midnight (UTC)
SELECT cron.schedule(
    'delete_old_chat_messages_job',
    '0 0 * * *',
    'SELECT public.delete_old_chat_messages();'
);
