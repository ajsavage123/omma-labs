-- Create CRM access table
CREATE TABLE IF NOT EXISTS crm_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, workspace_id)
);

-- Add policy for access
ALTER TABLE crm_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own access requests"
  ON crm_access FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view and update all requests"
  ON crm_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
