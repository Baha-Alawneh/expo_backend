-- Check what zone_type values exist in Booths table
SELECT zone_type, COUNT(*) as booth_count 
FROM Booths 
GROUP BY zone_type 
ORDER BY booth_count DESC;

-- Show sample booths with their zone_type
SELECT booth_number, zone_type, assigned_to_project, assigned_to_company
FROM Booths 
ORDER BY booth_number 
LIMIT 20;
