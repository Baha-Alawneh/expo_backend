-- Rollback Migration: Move approval status back from companies to offerings
-- Description: This script reverts the changes if needed
-- Date: 2026-01-18

-- Step 1: Re-add status column to offerings table if it was removed
ALTER TABLE offering 
ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved';

-- Step 2: Update offering status based on company status
UPDATE offering o
INNER JOIN companies c ON o.company_id = c.company_id
SET o.status = c.status;

-- Step 3: Remove status column from companies table
ALTER TABLE companies 
DROP COLUMN status;

-- Step 4: Remove index on companies status
DROP INDEX idx_companies_status ON companies;

-- Verification queries:
-- SELECT status, COUNT(*) FROM offering GROUP BY status;
-- SELECT COUNT(*) FROM companies;
