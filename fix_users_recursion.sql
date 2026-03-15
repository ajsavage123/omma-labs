-- 1. Remove all existing policies on the users table that might be causing the recursion loop
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- 2. Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Create fresh, safe, non-recursive policies for the users table
CREATE POLICY "Allow authenticated to read users" 
    ON public.users 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own record" 
    ON public.users 
    FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Allow users to insert their own record" 
    ON public.users 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- 4. Just in case, fix the is_admin() function to explicitly bypass RLS by searching softly
-- By redefining it clearly and ensuring it works even if policies change
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $func$
    SELECT EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    );
$func$;
