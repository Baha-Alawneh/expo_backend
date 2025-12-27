-- Check all projects and their assignment status
SELECT 
    project_id,
    title,
    type,
    booth,
    status,
    CASE 
        WHEN booth IS NULL OR booth = '' THEN 'Not Assigned'
        ELSE 'Assigned'
    END as assignment_status
FROM Projects
ORDER BY type, title;

-- Count by status
SELECT 
    status,
    COUNT(*) as count,
    SUM(CASE WHEN booth IS NULL OR booth = '' THEN 1 ELSE 0 END) as unassigned_count,
    SUM(CASE WHEN booth IS NOT NULL AND booth != '' THEN 1 ELSE 0 END) as assigned_count
FROM Projects
GROUP BY status;

-- Show unassigned approved projects (what auto-assign will use)
SELECT 
    project_id,
    title,
    type,
    booth,
    status
FROM Projects
WHERE (booth IS NULL OR booth = '') AND status = 'approved'
ORDER BY type, title;
