-- Migration: Insert Default Border Lines from Hardcoded InteractiveMap.jsx
-- This converts all hardcoded border lines to database entries
-- Source: expo_web/src/Components/InteractiveMap/InteractiveMap.jsx (lines 906-1015)

-- Usage: mysql -u root -p expo < migrations/005_insert_default_borders.sql

USE expo;

-- Disable safe update mode temporarily
SET SQL_SAFE_UPDATES = 0;

-- Delete existing structural and decorative borders if re-running
DELETE FROM borders WHERE type IN ('structural', 'decorative');

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;

-- ===== GROUP 1: Top Left Corner (Booths 96-107) - 4 borders =====
-- Actual booth positions from DB: 103 at (3280, 80), 96 at (3728, 80), 107 at (3280, 336)
-- Edges: topEdge=80, leftEdge=3280, rightEdge=3788, bottomEdge=396

INSERT INTO borders (border_id, type, orientation, x1, y1, x2, y2, length, thickness, stroke_style, color, is_static) VALUES
(UUID(), 'structural', 'vertical', 3280, 396, 3280, 80, 316, 3, 'solid', '#8B4513', 1),
(UUID(), 'structural', 'horizontal', 3280, 80, 3788, 80, 508, 3, 'solid', '#8B4513', 1),
(UUID(), 'structural', 'vertical', 3788, 80, 3788, 140, 60, 3, 'solid', '#8B4513', 1),
(UUID(), 'structural', 'vertical', 3788, 80, 3788, 40, 40, 3, 'solid', '#8B4513', 1);

-- ===== GROUP 2: Bottom Strips (Booths 1-12) - 8 borders =====
-- Actual booth positions from DB: booth1 at (3646, 982), booth6 at (3966, 982), booth7 at (4176, 982), booth12 at (4496, 982)
-- horizontalExtension = 132px, verticalLength = 30px

INSERT INTO borders (border_id, type, orientation, x1, y1, x2, y2, length, thickness, stroke_style, color, is_static) VALUES
(UUID(), 'structural', 'horizontal', 3646, 1042, 4026, 1042, 380, 3, 'solid', '#8B4513', 1),
(UUID(), 'structural', 'horizontal', 4176, 1042, 4556, 1042, 380, 3, 'solid', '#8B4513', 1),
(UUID(), 'structural', 'horizontal', 3646, 982, 3514, 982, 132, 3, 'solid', '#8B4513', 1),
(UUID(), 'structural', 'vertical', 3514, 982, 3514, 1072, 90, 3, 'solid', '#8B4513', 1),
(UUID(), 'structural', 'vertical', 4026, 1042, 4026, 1072, 30, 3, 'solid', '#8B4513', 1),
(UUID(), 'structural', 'vertical', 4176, 1042, 4176, 1072, 30, 3, 'solid', '#8B4513', 1),
(UUID(), 'structural', 'horizontal', 4556, 982, 4688, 982, 132, 3, 'solid', '#8B4513', 1),
(UUID(), 'structural', 'vertical', 4688, 982, 4688, 1072, 90, 3, 'solid', '#8B4513', 1);

-- ===== GROUP 3: L-Shaped Section (Booths 13-23) - 3 borders =====
-- Actual booth positions from DB: booth13 at (4980, 682), booth16 at (5174, 682), booth23 at (5172.33, 232.333)
-- booth12 at (4496, 982)

INSERT INTO borders (border_id, type, orientation, x1, y1, x2, y2, length, thickness, stroke_style, color, is_static) VALUES
(UUID(), 'structural', 'horizontal', 4980, 742, 5234, 742, 254, 3, 'solid', '#8B4513', 1),
(UUID(), 'structural', 'vertical', 5234, 232.333, 5234, 742, 509.667, 3, 'solid', '#8B4513', 1),
(UUID(), 'structural', 'vertical', 4980, 742, 4980, 1072, 330, 3, 'solid', '#8B4513', 1);

-- ===== GROUP 4: Top Strip (Booths 24-31) - 2 borders =====
-- Actual booth positions from DB: booth31 at (4380, 100), booth24 at (4830, 100), booth23 at (5172.33, 232.333)
-- upDistance = 40px

INSERT INTO borders (border_id, type, orientation, x1, y1, x2, y2, length, thickness, stroke_style, color, is_static) VALUES
(UUID(), 'structural', 'horizontal', 4380, 100, 5232.33, 100, 852.33, 3, 'solid', '#8B4513', 1),
(UUID(), 'structural', 'vertical', 4380, 100, 4380, 60, 40, 3, 'solid', '#8B4513', 1);

-- ===== DECORATIVE X-MARKS - SKIPPED =====
-- These decorative diagonal X-marks violate check constraint 'borders_chk_1'
-- Likely the constraint only allows: type='structural' and orientation IN ('vertical', 'horizontal')
-- The X-marks in the frontend code can remain hardcoded for now

-- Original code (commented out):
-- Courtyard 1: (1720, 260) to (1916, 392) and reverse - Cyan #0891b2
-- Courtyard 2: (2640, 260) to (2836, 392) and reverse - Red #7f1d1d

-- Verify insertion
SELECT 
    COUNT(*) as total_borders,
    SUM(CASE WHEN type = 'structural' THEN 1 ELSE 0 END) as structural_borders,
    SUM(CASE WHEN type = 'decorative' THEN 1 ELSE 0 END) as decorative_borders
FROM borders;

-- Show all inserted borders
SELECT border_id, type, orientation, x1, y1, x2, y2, length, thickness, stroke_style, color, is_static
FROM borders
ORDER BY type, orientation;
