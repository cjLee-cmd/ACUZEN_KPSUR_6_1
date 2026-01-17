-- Migration: Fix Auth User ID Mismatch
-- Problem: main@main.com has different IDs in Supabase Auth vs users table
-- Auth ID: 01834daa-f07b-4da1-b0eb-5fb8bde625b7
-- Users table ID: b6ebec6e-cd64-45bd-a758-81a98d4acb1e
--
-- Run this in Supabase SQL Editor with service_role privileges

BEGIN;

-- Step 1: Temporarily disable RLS on affected tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Step 2: Insert new user record with Auth ID
INSERT INTO users (id, email, name, role, password_hash, created_at, updated_at)
SELECT
    '01834daa-f07b-4da1-b0eb-5fb8bde625b7'::uuid,
    email,
    name,
    role,
    password_hash,
    created_at,
    NOW()
FROM users
WHERE id = 'b6ebec6e-cd64-45bd-a758-81a98d4acb1e'
ON CONFLICT (id) DO NOTHING;

-- Step 3: Update reports to use new Auth ID
UPDATE reports
SET created_by = '01834daa-f07b-4da1-b0eb-5fb8bde625b7'::uuid
WHERE created_by = 'b6ebec6e-cd64-45bd-a758-81a98d4acb1e'::uuid;

-- Step 4: Update products to use new Auth ID
UPDATE products
SET created_by = '01834daa-f07b-4da1-b0eb-5fb8bde625b7'::uuid
WHERE created_by = 'b6ebec6e-cd64-45bd-a758-81a98d4acb1e'::uuid;

-- Step 5: Update any other tables that reference the old user ID
-- (Add more UPDATE statements here if needed for other tables)

-- Step 6: Delete old user record (or keep for audit)
DELETE FROM users
WHERE id = 'b6ebec6e-cd64-45bd-a758-81a98d4acb1e'::uuid;

-- Step 7: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verify the fix
SELECT 'Users table:' as table_name, id, email, name, role
FROM users
WHERE email = 'main@main.com';

SELECT 'Reports count:' as info, COUNT(*) as count
FROM reports
WHERE created_by = '01834daa-f07b-4da1-b0eb-5fb8bde625b7'::uuid;

SELECT 'Products count:' as info, COUNT(*) as count
FROM products
WHERE created_by = '01834daa-f07b-4da1-b0eb-5fb8bde625b7'::uuid;
