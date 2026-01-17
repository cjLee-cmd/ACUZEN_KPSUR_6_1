-- Migration: 005_extend_source_raw_id.sql
-- Purpose: Extend source_raw_id column to accommodate multiple RAW IDs (e.g., "RAW12+RAW13+RAW14+RAW15")
-- Date: 2026-01-17

-- Extend source_raw_id from varchar(20) to varchar(100)
ALTER TABLE extracted_data
ALTER COLUMN source_raw_id TYPE varchar(100);

-- Verify the change
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name = 'extracted_data' AND column_name = 'source_raw_id';
