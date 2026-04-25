-- Drop existing policies if they exist so you can run this multiple times without errors
DROP POLICY IF EXISTS "Enable read access for authenticated users on chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users on chat" ON public.chat_messages;

-- 1. Create the Chat Messages Table (this is safe to re-run because of "IF NOT EXISTS")
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for performance and limit prevention
CREATE INDEX IF NOT EXISTS idx_chat_workspace ON public.chat_messages(workspace_id);

-- 2. Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users on chat"
    ON public.chat_messages FOR SELECT TO authenticated 
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid()));

CREATE POLICY "Enable insert for authenticated users on chat"
    ON public.chat_messages FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id AND workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid()));

-- 3. Free Tier Storage Optimizer: Delete Messages Older Than 7 Days
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
