-- Migration: Move approval status from offerings to companies
-- Description: This migration adds status column to companies table and migrates existing approval data
-- Date: 2026-01-18

-- Step 1: Add status column to companies table
ALTER TABLE companies 
ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER company_id;

-- Step 2: Migrate existing data - Set companies to 'approved' if they have any approved offering
UPDATE companies c
SET status = 'approved'
WHERE company_id IN (
    SELECT DISTINCT company_id 
    FROM offering 
    WHERE status = 'approved'
);

-- Step 3: Set remaining companies (those without any offerings or only rejected offerings) to 'approved'
-- This ensures existing companies in the system remain functional
UPDATE companies 
SET status = 'approved'
WHERE status = 'pending';

-- Step 4: For NEW companies going forward, they will default to 'pending' (handled by DEFAULT in column definition)
-- No action needed here, just documenting the behavior

-- Step 5: Remove status column from offerings table
-- IMPORTANT: Run this AFTER updating all application code
-- Uncomment the line below when ready to execute:
-- ALTER TABLE offering DROP COLUMN status;

-- Step 6: Add index on status column for performance
CREATE INDEX idx_companies_status ON companies(status);

-- Verification queries (run these to verify migration):
-- SELECT status, COUNT(*) FROM companies GROUP BY status;
-- SELECT COUNT(*) FROM offering; -- Should show all offerings remain intact
-- SELECT c.company_name, c.status, COUNT(o.offering_id) as offering_count 
-- FROM companies c 
-- LEFT JOIN offering o ON c.company_id = o.company_id 
-- GROUP BY c.company_id;
