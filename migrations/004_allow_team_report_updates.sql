-- Migration: Allow team members to update reports
-- Created: 2025-01-15
-- Description: Add RLS policy to allow Author/Reviewer/Master roles to update any report

-- ============================================================================
-- Problem: Current RLS only allows report creator or Master to update reports
-- Solution: Add policy for authenticated users with Author+ role to update
-- ============================================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Authors can manage own reports" ON reports;

-- New policy: Authors can create reports
CREATE POLICY "Authors can create reports"
ON reports FOR INSERT
WITH CHECK (
    created_by = auth.uid() OR
    public.get_user_role() IN ('Master', 'Author')
);

-- New policy: Authors/Reviewers/Master can update any report
CREATE POLICY "Team members can update reports"
ON reports FOR UPDATE
USING (
    -- Allow if user is authenticated and has Author+ role
    public.get_user_role() IN ('Master', 'Author', 'Reviewer')
)
WITH CHECK (
    public.get_user_role() IN ('Master', 'Author', 'Reviewer')
);

-- New policy: Only creator or Master can delete reports
CREATE POLICY "Creators can delete own reports"
ON reports FOR DELETE
USING (
    created_by = auth.uid() OR
    public.get_user_role() = 'Master'
);

-- ============================================================================
-- Also need to ensure get_user_role() works with Supabase Auth
-- Update the function to handle cases where user might not be in users table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- First try to get role from users table by auth.uid()
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  -- If not found, check by email from auth.users
  IF user_role IS NULL THEN
    SELECT u.role INTO user_role
    FROM public.users u
    JOIN auth.users au ON u.email = au.email
    WHERE au.id = auth.uid();
  END IF;

  -- Default to 'Author' if authenticated but not found
  IF user_role IS NULL AND auth.uid() IS NOT NULL THEN
    user_role := 'Author';
  END IF;

  RETURN user_role;
END;
$$;

-- ============================================================================
-- End of Migration
-- ============================================================================
