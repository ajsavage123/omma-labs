-- Create table for storing Web Push Subscriptions
CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(endpoint) -- Prevent duplicate subscriptions for the same endpoint
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view their own push subscriptions"
    ON public.user_push_subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscriptions
CREATE POLICY "Users can insert their own push subscriptions"
    ON public.user_push_subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own subscriptions
CREATE POLICY "Users can delete their own push subscriptions"
    ON public.user_push_subscriptions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster lookups when sending notifications
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.user_push_subscriptions(user_id);
