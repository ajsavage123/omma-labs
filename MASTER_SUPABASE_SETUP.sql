-- ==========================================
-- MASTER SUPABASE SETUP SCRIPT (CONSOLIDATED)
-- ==========================================
-- 1. EXTENSIONS & HELPER FUNCTIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Recursive-safe Admin Check (from fix_users_recursion.sql)
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- ==========================================
-- 2. CORE TABLES
-- ==========================================

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users ON DELETE SET NULL
);

-- Users (Profile)
CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT NOT NULL,
    full_name TEXT,
    designation TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('partner', 'admin')),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations
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

-- Projects (with Dual-Track additions)
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

-- Project Stages
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

-- Timeline Logs
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

-- Admin Ratings
CREATE TABLE IF NOT EXISTS admin_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    problem_importance INTEGER CHECK (problem_importance >= 1 AND problem_importance <= 10),
    technical_feasibility INTEGER CHECK (technical_feasibility >= 1 AND technical_feasibility <= 10),
    market_demand INTEGER CHECK (market_demand >= 1 AND market_demand <= 10),
    impact_potential INTEGER CHECK (impact_potential >= 1 AND impact_potential <= 10),
    development_complexity INTEGER CHECK (development_complexity >= 1 AND development_complexity <= 10),
    innovation_rating INTEGER,
    engineering_rating INTEGER,
    business_rating INTEGER,
    innovation_score NUMERIC,
    notes TEXT,
    rated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id)
);

-- Idea Vault (from ideas_contacts_schema.sql)
CREATE TABLE IF NOT EXISTS ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  drive_link TEXT,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Client Contacts (from ideas_contacts_schema.sql)
CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_number TEXT,
  website_link TEXT,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Chat Messages (from chat_schema.sql)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 3. SECURITY (RLS & POLICIES)
-- ==========================================

-- Enable RLS on everything
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Consolidated Policies (Latest optimized versions from fix_policies.sql)
DROP POLICY IF EXISTS "Allow authenticated read users" ON users;
CREATE POLICY "Allow authenticated read users" ON users FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow users update own record" ON users;
CREATE POLICY "Allow users update own record" ON users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Allow initial signup" ON users;
CREATE POLICY "Allow initial signup" ON users FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow workspace read" ON workspaces;
CREATE POLICY "Allow workspace read" ON workspaces FOR SELECT USING (id IN (SELECT workspace_id FROM users WHERE users.id = auth.uid()));
DROP POLICY IF EXISTS "Allow workspace creation" ON workspaces;
CREATE POLICY "Allow workspace creation" ON workspaces FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow project read" ON projects;
CREATE POLICY "Allow project read" ON projects FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow project insert" ON projects;
CREATE POLICY "Allow project insert" ON projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow project update" ON projects;
CREATE POLICY "Allow project update" ON projects FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow project delete" ON projects;
CREATE POLICY "Allow project delete" ON projects FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Allow stage read" ON project_stages;
CREATE POLICY "Allow stage read" ON project_stages FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow stage mod" ON project_stages;
CREATE POLICY "Allow stage mod" ON project_stages FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow deleting workspace stages" ON project_stages;
CREATE POLICY "Allow deleting workspace stages" ON project_stages FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Allow logs select" ON timeline_logs;
CREATE POLICY "Allow logs select" ON timeline_logs FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow logs insert" ON timeline_logs;
CREATE POLICY "Allow logs insert" ON timeline_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow logs delete" ON timeline_logs;
CREATE POLICY "Allow logs delete" ON timeline_logs FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Allow ideas select" ON ideas;
CREATE POLICY "Allow ideas select" ON ideas FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Allow ideas insert" ON ideas;
CREATE POLICY "Allow ideas insert" ON ideas FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Allow ideas delete" ON ideas;
CREATE POLICY "Allow ideas delete" ON ideas FOR DELETE USING (created_by = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Allow contacts select" ON client_contacts;
CREATE POLICY "Allow contacts select" ON client_contacts FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Allow contacts all" ON client_contacts;
CREATE POLICY "Allow contacts all" ON client_contacts FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Allow chat read" ON chat_messages;
CREATE POLICY "Allow chat read" ON chat_messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow chat insert" ON chat_messages;
CREATE POLICY "Allow chat insert" ON chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 4. TRIGGERS (MAINTENANCE)
-- ==========================================

-- Auto-delete chat messages older than 5 days
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
