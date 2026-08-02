-- Safe Migration Script to add Advanced Chat Features to Supabase
-- Copy and run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Add missing columns to chat_messages if they do not exist yet
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_deleted_everyone BOOLEAN DEFAULT false;

-- 2. Enable DELETE and UPDATE access for authenticated users on chat_messages
DROP POLICY IF EXISTS "Allow chat delete" ON public.chat_messages;
CREATE POLICY "Allow chat delete" ON public.chat_messages FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow chat update" ON public.chat_messages;
CREATE POLICY "Allow chat update" ON public.chat_messages FOR UPDATE TO authenticated USING (true);

-- 3. Create Chat Reactions Table if not exists
CREATE TABLE IF NOT EXISTS public.chat_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS for chat_reactions
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for reactions" ON public.chat_reactions;
CREATE POLICY "Enable read access for reactions" ON public.chat_reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for reactions" ON public.chat_reactions;
CREATE POLICY "Enable insert for reactions" ON public.chat_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for reactions" ON public.chat_reactions;
CREATE POLICY "Enable delete for reactions" ON public.chat_reactions FOR DELETE USING (auth.uid() = user_id);

-- 4. Auto-delete chat messages older than 6 days to optimize free-tier storage
CREATE OR REPLACE FUNCTION delete_old_chat_messages()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.chat_messages WHERE created_at < NOW() - INTERVAL '6 days';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_delete_old_chats ON public.chat_messages;
CREATE TRIGGER trigger_delete_old_chats
AFTER INSERT ON public.chat_messages
FOR EACH STATEMENT
EXECUTE FUNCTION delete_old_chat_messages();
