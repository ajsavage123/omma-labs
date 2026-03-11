-- Add missing columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update ChatWidget selection safely
-- The following columns should exist based on types/index.ts but might be missing in DB
ALTER TABLE public.admin_ratings ADD COLUMN IF NOT EXISTS innovation_rating INTEGER;
ALTER TABLE public.admin_ratings ADD COLUMN IF NOT EXISTS engineering_rating INTEGER;
ALTER TABLE public.admin_ratings ADD COLUMN IF NOT EXISTS business_rating INTEGER;

-- Ensure chat_messages table exists and has correct columns
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Reset policies to be sure
DROP POLICY IF EXISTS "Enable read access for authenticated users on chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users on chat" ON public.chat_messages;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users on chat"
    ON public.chat_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users on chat"
    ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
