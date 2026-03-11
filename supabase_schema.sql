-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL,
    designation TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('partner', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    drive_link TEXT,
    team_members TEXT,
    github_link TEXT,
    created_by UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Stages table
CREATE TABLE IF NOT EXISTS project_stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
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
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_ratings ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for development - adjust based on specific needs later)
CREATE POLICY "Allow authenticated users to read users" ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow users to update their own record" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow authenticated users to read projects" ON projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to create projects" ON projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update projects" ON projects FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read stages" ON project_stages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update stages" ON project_stages FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert stages" ON project_stages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read logs" ON timeline_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert logs" ON timeline_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to read ratings" ON admin_ratings FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Allow admins to insert/update ratings" ON admin_ratings FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
