-- ============================================================================
-- Migration 003: Fix extracted_data RLS and add unique constraint
--
-- Problems:
-- 1. RLS policy blocks insert for report creators
-- 2. No unique constraint for upsert operation (report_id, data_type, variable_id)
--
-- Solution:
-- 1. Add policy that allows report creators and Master users to manage data
-- 2. Add unique constraint for upsert
-- ============================================================================

-- ============================================
-- STEP 1: Fix RLS Policies
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage extracted data" ON extracted_data;
DROP POLICY IF EXISTS "Users can view extracted data" ON extracted_data;
DROP POLICY IF EXISTS "Authors can manage own extracted data" ON extracted_data;

-- Create policy that allows:
-- 1. Report creators to manage their own report's extracted data
-- 2. Master users to manage ALL extracted data
CREATE POLICY "Users can manage extracted data"
ON extracted_data FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM reports
    WHERE id = extracted_data.report_id
    AND (
      created_by = auth.uid()  -- Report creator
      OR public.get_user_role() = 'Master'  -- Master can manage all
    )
  )
);

-- Create SELECT policy for viewing
CREATE POLICY "Users can view extracted data"
ON extracted_data FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reports
    WHERE id = extracted_data.report_id
    AND (
      created_by = auth.uid()  -- Report creator
      OR public.get_user_role() IN ('Master', 'Reviewer')  -- Master/Reviewer can view all
    )
  )
);

-- ============================================
-- STEP 2: Add Unique Constraint for Upsert
-- ============================================

-- First, remove any duplicate entries if they exist
-- (Keep the most recent one based on updated_at or id)
DELETE FROM extracted_data a
USING extracted_data b
WHERE a.id < b.id
  AND a.report_id = b.report_id
  AND a.data_type = b.data_type
  AND a.variable_id = b.variable_id;

-- Add unique constraint
ALTER TABLE extracted_data
DROP CONSTRAINT IF EXISTS extracted_data_unique_report_type_variable;

ALTER TABLE extracted_data
ADD CONSTRAINT extracted_data_unique_report_type_variable
UNIQUE (report_id, data_type, variable_id);

-- ============================================
-- STEP 3: Verify
-- ============================================

-- Check policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'extracted_data';

-- Check constraints
SELECT
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'extracted_data';
