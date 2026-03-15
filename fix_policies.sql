BEGIN;

DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;
CREATE POLICY "Allow authenticated users to read users" ON users FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow users to update their own record" ON users;
CREATE POLICY "Allow users to update their own record" ON users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to insert their own record" ON users;
CREATE POLICY "Allow users to insert their own record" ON users FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow authenticated users to read projects" ON projects;
CREATE POLICY "Allow authenticated users to read projects" ON projects FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to create projects" ON projects;
CREATE POLICY "Allow authenticated users to create projects" ON projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to update projects" ON projects;
CREATE POLICY "Allow authenticated users to update projects" ON projects FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to read stages" ON project_stages;
CREATE POLICY "Allow authenticated users to read stages" ON project_stages FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to update stages" ON project_stages;
CREATE POLICY "Allow authenticated users to update stages" ON project_stages FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to insert stages" ON project_stages;
CREATE POLICY "Allow authenticated users to insert stages" ON project_stages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to read logs" ON timeline_logs;
CREATE POLICY "Allow authenticated users to read logs" ON timeline_logs FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to insert logs" ON timeline_logs;
CREATE POLICY "Allow authenticated users to insert logs" ON timeline_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

COMMIT;
