-- Shift all map items 800px to the right
-- Migration: Shift booths, borders, and buildings to clear left side
-- Date: 2026-01-11

-- Disable safe update mode temporarily
SET SQL_SAFE_UPDATES = 0;

-- Shift all booths 800px to the right
UPDATE booths 
SET location_x = location_x + 800
WHERE location_x IS NOT NULL;

-- Shift all borders 800px to the right (both x1 and x2 coordinates)
UPDATE borders 
SET x1 = x1 + 800,
    x2 = x2 + 800
WHERE x1 IS NOT NULL AND x2 IS NOT NULL;

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;

-- Note: Buildings are stored in frontend constants (buildings.js) and have been updated there
