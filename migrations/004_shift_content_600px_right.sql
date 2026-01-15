-- Migration: Shift existing booths and borders to center in 8000px canvas
-- Purpose: Center map content after canvas expansion to 8000px (400m)
-- Date: 2026-01-12
-- Note: This adds 1800px more shift (on top of previous 600px shift = 2400px total)

SET SQL_SAFE_UPDATES = 0;

-- Shift all booths 1800px more to the right
UPDATE booths 
SET location_x = location_x + 1800 
WHERE location_x IS NOT NULL;

-- Shift all borders 1800px more to the right
UPDATE borders 
SET x1 = x1 + 1800, x2 = x2 + 1800 
WHERE x1 IS NOT NULL AND x2 IS NOT NULL;

-- Shift all buildings 1800px more to the right
UPDATE buildings 
SET x = x + 1800 
WHERE x IS NOT NULL;

SET SQL_SAFE_UPDATES = 1;
