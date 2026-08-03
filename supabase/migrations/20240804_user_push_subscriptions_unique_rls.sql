-- Migration: Add unique constraint on (user_id, endpoint) for user_push_subscriptions
-- This prevents duplicate subscriptions for the same user+browser combination.
-- The existing upsert uses onConflict: 'endpoint' — having both ensures correctness
-- even if the same user subscribes from multiple browsers.

-- 1. Remove any duplicate rows (keep only the latest per user+endpoint pair)
DELETE FROM user_push_subscriptions
WHERE ctid NOT IN (
  SELECT DISTINCT ON (user_id, endpoint) ctid
  FROM user_push_subscriptions
  ORDER BY user_id, endpoint, created_at DESC NULLS LAST
);

-- 2. Add the unique index
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_push_subscriptions_user_endpoint
  ON user_push_subscriptions (user_id, endpoint);

-- 3. Add RLS policy: users may only read/write their own subscriptions
-- (Assumes RLS is already enabled on this table via Supabase dashboard)
DO $$
BEGIN
  -- Policy: SELECT own rows only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_push_subscriptions'
      AND policyname = 'Users can view own push subscriptions'
  ) THEN
    CREATE POLICY "Users can view own push subscriptions"
      ON user_push_subscriptions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- Policy: INSERT own rows only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_push_subscriptions'
      AND policyname = 'Users can insert own push subscriptions'
  ) THEN
    CREATE POLICY "Users can insert own push subscriptions"
      ON user_push_subscriptions
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy: UPDATE own rows only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_push_subscriptions'
      AND policyname = 'Users can update own push subscriptions'
  ) THEN
    CREATE POLICY "Users can update own push subscriptions"
      ON user_push_subscriptions
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy: DELETE own rows only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_push_subscriptions'
      AND policyname = 'Users can delete own push subscriptions'
  ) THEN
    CREATE POLICY "Users can delete own push subscriptions"
      ON user_push_subscriptions
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Enable RLS if not already enabled
ALTER TABLE user_push_subscriptions ENABLE ROW LEVEL SECURITY;
