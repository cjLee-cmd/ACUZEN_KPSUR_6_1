-- ============================================================================
-- Migration 002: Fix report_sections RLS for Master users
--
-- Problem: Master users cannot edit sections of reports created by other users
-- Solution: Add policy that allows Master users to manage all report sections
-- ============================================================================

-- Drop existing policy that only allows report creators
DROP POLICY IF EXISTS "Authors can manage own report sections" ON report_sections;

-- Create new policy that allows:
-- 1. Report creators to manage their own report sections
-- 2. Master users to manage ALL report sections
CREATE POLICY "Users can manage report sections"
ON report_sections FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM reports
    WHERE id = report_sections.report_id
    AND (
      created_by = auth.uid()  -- Report creator
      OR public.get_user_role() = 'Master'  -- Master can manage all
    )
  )
);

-- Also update the SELECT policy to be consistent
DROP POLICY IF EXISTS "Users can view own report sections" ON report_sections;
CREATE POLICY "Users can view report sections"
ON report_sections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reports
    WHERE id = report_sections.report_id
    AND (
      created_by = auth.uid()  -- Report creator
      OR public.get_user_role() IN ('Master', 'Reviewer')  -- Master/Reviewer can view all
    )
  )
);

-- Verify the policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'report_sections';
