-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users ON DELETE SET NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT NOT NULL,
    designation TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('partner', 'admin')),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('partner', 'admin')),
    designation TEXT NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    project_type TEXT NOT NULL DEFAULT 'internal' CHECK (project_type IN ('internal', 'client')),
    description TEXT,
    deadline DATE,
    client_name TEXT,
    client_phone TEXT,
    drive_link TEXT,
    team_members TEXT,
    github_link TEXT,
    created_by UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'rejected', 'code_red', 'paused')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Stages table
CREATE TABLE IF NOT EXISTS project_stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    stage_name TEXT NOT NULL,
    assigned_team TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    UNIQUE(project_id, stage_name)
);

-- Timeline Logs table
CREATE TABLE IF NOT EXISTS timeline_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    user_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    stage TEXT NOT NULL,
    update_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Ratings table
CREATE TABLE IF NOT EXISTS admin_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    problem_importance INTEGER CHECK (problem_importance >= 1 AND problem_importance <= 10),
    technical_feasibility INTEGER CHECK (technical_feasibility >= 1 AND technical_feasibility <= 10),
    market_demand INTEGER CHECK (market_demand >= 1 AND market_demand <= 10),
    impact_potential INTEGER CHECK (impact_potential >= 1 AND impact_potential <= 10),
    development_complexity INTEGER CHECK (development_complexity >= 1 AND development_complexity <= 10),
    innovation_score NUMERIC,
    notes TEXT,
    rated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_ratings ENABLE ROW LEVEL SECURITY;

-- Helper function for admin check (resolves recursion)
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Workspace Policies
CREATE POLICY "Allow users to read their workspace" ON workspaces FOR SELECT USING (
    id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid())
);
CREATE POLICY "Allow authenticated to insert workspace" ON workspaces FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- User Policies
CREATE POLICY "Allow users to read users in same workspace" ON users FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users u WHERE u.id = auth.uid()) OR id = auth.uid()
);
CREATE POLICY "Allow users to update their own record" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow authenticated to insert user" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow admins to update users in same workspace" ON users FOR UPDATE USING (is_admin());

-- Invitation Policies
CREATE POLICY "Allow reading invitations for workspace" ON invitations FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid()) OR NOT used
);
CREATE POLICY "Allow admins to create invitations" ON invitations FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Allow updating used status" ON invitations FOR UPDATE USING (auth.role() = 'authenticated');

-- Project Policies
CREATE POLICY "Allow reading workspace projects" ON projects FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid())
);
CREATE POLICY "Allow Innovation team to create projects" ON projects FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND designation = 'Innovation & Research Team' AND workspace_id = projects.workspace_id)
);
CREATE POLICY "Allow updating workspace projects" ON projects FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid())
);

-- Project Stages Policies
CREATE POLICY "Allow reading workspace stages" ON project_stages FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid())
);
CREATE POLICY "Allow updating workspace stages" ON project_stages FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid())
);
CREATE POLICY "Allow inserting workspace stages" ON project_stages FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid())
);

-- Timeline Logs Policies
CREATE POLICY "Allow reading workspace logs" ON timeline_logs FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid())
);
CREATE POLICY "Allow inserting workspace logs" ON timeline_logs FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid())
);

-- Admin Ratings Policies
CREATE POLICY "Allow admins to read workspace ratings" ON admin_ratings FOR SELECT USING (is_admin());
CREATE POLICY "Allow admins to insert/update workspace ratings" ON admin_ratings FOR ALL USING (is_admin());

-- Migration Script for Existing Data
DO $$
DECLARE
    default_workspace_id UUID;
BEGIN
    -- Only run migration if there are users without a workspace
    IF EXISTS (SELECT 1 FROM users WHERE workspace_id IS NULL) THEN
        -- Create a default workspace
        INSERT INTO workspaces (name) VALUES ('Default Workspace') RETURNING id INTO default_workspace_id;

        -- Update Users
        UPDATE users SET workspace_id = default_workspace_id WHERE workspace_id IS NULL;
        
        -- Update Projects
        UPDATE projects SET workspace_id = default_workspace_id WHERE workspace_id IS NULL;
        
        -- Update existing stages
        UPDATE project_stages SET workspace_id = default_workspace_id WHERE workspace_id IS NULL;
        
        -- Update existing logs
        UPDATE timeline_logs SET workspace_id = default_workspace_id WHERE workspace_id IS NULL;
        
        -- Update admin ratings
        UPDATE admin_ratings SET workspace_id = default_workspace_id WHERE workspace_id IS NULL;
    END IF;
END $$;
