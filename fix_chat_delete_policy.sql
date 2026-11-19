-- Fix: Enable Old Chats Deletion
-- Run this in your Supabase SQL Editor to allow client-side cleanups and fix the auto-delete database trigger.

-- 1. Enable DELETE policy for authenticated users so that client-side cleanups don't fail with RLS errors
DROP POLICY IF EXISTS "Enable delete access for authenticated users on chat" ON public.chat_messages;
CREATE POLICY "Enable delete access for authenticated users on chat"
    ON public.chat_messages FOR DELETE TO authenticated 
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid()));

-- 2. Update the auto-delete trigger function (runs with SECURITY DEFINER to bypass RLS restrictions)
-- Sets search_path explicitly to public for security and schema safety
CREATE OR REPLACE FUNCTION delete_old_chat_messages()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.chat_messages WHERE created_at < NOW() - INTERVAL '5 days';
  RETURN NULL; -- statement trigger should return NULL
END;
$$;

-- 3. Re-create the statement trigger
DROP TRIGGER IF EXISTS trigger_delete_old_chats ON public.chat_messages;
CREATE TRIGGER trigger_delete_old_chats
AFTER INSERT ON public.chat_messages
FOR EACH STATEMENT
EXECUTE FUNCTION delete_old_chat_messages();
