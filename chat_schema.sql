-- Drop existing policies if they exist so you can run this multiple times without errors
DROP POLICY IF EXISTS "Enable read access for authenticated users on chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users on chat" ON public.chat_messages;

-- 1. Create the Chat Messages Table (this is safe to re-run because of "IF NOT EXISTS")
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users on chat"
    ON public.chat_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users on chat"
    ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. Free Tier Storage Optimizer: Delete Messages Older Than 5 Days
CREATE OR REPLACE FUNCTION delete_old_chat_messages()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.chat_messages WHERE created_at < NOW() - INTERVAL '5 days';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_delete_old_chats ON public.chat_messages;
CREATE TRIGGER trigger_delete_old_chats
AFTER INSERT ON public.chat_messages
FOR EACH STATEMENT
EXECUTE FUNCTION delete_old_chat_messages();
