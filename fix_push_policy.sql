-- Fix for the 403 Forbidden error during push subscription upsert
-- Supabase upserts require an UPDATE policy if the row already exists.

CREATE POLICY "Users can update their own push subscriptions"
    ON public.user_push_subscriptions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
