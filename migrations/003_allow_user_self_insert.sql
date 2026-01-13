-- Migration: Allow users to insert/update their own record
-- Purpose: Fix reports.created_by FK constraint violation
-- When a user registers via Supabase Auth, they need to create their own record in users table
-- to satisfy the foreign key constraint on reports.created_by

-- Add position column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS position text DEFAULT '';

-- Policy: Allow authenticated users to insert their own record
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
ON users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy: Allow authenticated users to update their own record
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Verify policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
