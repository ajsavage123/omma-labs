-- Drop existing policies if they exist so you can run this multiple times without errors
DROP POLICY IF EXISTS "Enable read access for authenticated users on chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users on chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable update for authenticated users on chat" ON public.chat_messages;

-- 1. Create the Chat Messages Table (this is safe to re-run because of "IF NOT EXISTS")
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    parent_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    deleted_for UUID[] DEFAULT '{}',
    is_deleted_everyone BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false
);

-- Index for performance and limit prevention
CREATE INDEX IF NOT EXISTS idx_chat_workspace ON public.chat_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_parent ON public.chat_messages(parent_id);

-- 2. Row Level Security for Messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users on chat"
    ON public.chat_messages FOR SELECT TO authenticated 
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid()));

CREATE POLICY "Enable insert for authenticated users on chat"
    ON public.chat_messages FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id AND workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid()));

CREATE POLICY "Enable update for authenticated users on chat"
    ON public.chat_messages FOR UPDATE TO authenticated 
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid()));

-- 3. Create Chat Reactions Table
CREATE TABLE IF NOT EXISTS public.chat_reactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users on reactions"
    ON public.chat_reactions FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM chat_messages WHERE chat_messages.id = message_id AND chat_messages.workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid())));

CREATE POLICY "Enable insert for authenticated users on reactions"
    ON public.chat_reactions FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM chat_messages WHERE chat_messages.id = message_id AND chat_messages.workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid())));

CREATE POLICY "Enable delete for authenticated users on reactions"
    ON public.chat_reactions FOR DELETE TO authenticated 
    USING (auth.uid() = user_id);

-- 4. Create Chat Read Receipts Table
CREATE TABLE IF NOT EXISTS public.chat_read_receipts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    read_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(message_id, user_id)
);

ALTER TABLE public.chat_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users on receipts"
    ON public.chat_read_receipts FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM chat_messages WHERE chat_messages.id = message_id AND chat_messages.workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid())));

CREATE POLICY "Enable insert for authenticated users on receipts"
    ON public.chat_read_receipts FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM chat_messages WHERE chat_messages.id = message_id AND chat_messages.workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid())));

CREATE POLICY "Enable update for authenticated users on receipts"
    ON public.chat_read_receipts FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id);

-- 5. Free Tier Storage Optimizer: Delete Messages Older Than 7 Days (Updated to handle cascading implicitly via constraints)
CREATE OR REPLACE FUNCTION delete_old_chat_messages()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.chat_messages WHERE created_at < NOW() - INTERVAL '7 days';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_delete_old_chats ON public.chat_messages;
CREATE TRIGGER trigger_delete_old_chats
AFTER INSERT ON public.chat_messages
FOR EACH STATEMENT
EXECUTE FUNCTION delete_old_chat_messages();

-- 6. Enable Supabase Realtime Publication for Chat Tables
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_read_receipts REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  
  -- We add tables if they aren't already in the publication to avoid errors
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_read_receipts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

