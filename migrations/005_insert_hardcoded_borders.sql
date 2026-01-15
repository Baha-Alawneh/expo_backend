-- Migration: Insert hardcoded borders into database
-- Purpose: Migrate hardcoded borders from InteractiveMap.jsx to database
-- Date: 2026-01-13

-- Note: Coordinates are calculated based on typical booth positions
-- Adjust if booths have been moved

-- Top-Left Section (Booths 96-107) Borders
-- Left vertical (from 107 bottom to 103 top, extends to booth 1 level)
INSERT INTO borders (border_id, type, orientation, x1, y1, x2, y2, length, thickness, stroke_style, color, is_static)
VALUES 
(UUID(), 'structural', 'vertical', 3080, 892, 3080, 3080, 109, 3, 'solid', '#8B4513', true),

-- Top horizontal (from 103 to 96)
(UUID(), 'structural', 'horizontal', 3080, 892, 3460, 892, 19, 3, 'solid', '#8B4513', true),

-- Right vertical (top section of booth 96)
(UUID(), 'structural', 'vertical', 3460, 892, 3460, 952, 3, 3, 'solid', '#8B4513', true),

-- Right vertical extension (upward from booth 96)
(UUID(), 'structural', 'vertical', 3460, 892, 3460, 852, 2, 3, 'solid', '#8B4513', true);

-- Bottom Strips (Booths 1-12) Borders
-- Bottom horizontal under booths 1-6
INSERT INTO borders (border_id, type, orientation, x1, y1, x2, y2, length, thickness, stroke_style, color, is_static)
VALUES
(UUID(), 'structural', 'horizontal', 3080, 3140, 3464, 3140, 19.2, 3, 'solid', '#8B4513', true),

-- Bottom horizontal under booths 7-12
(UUID(), 'structural', 'horizontal', 3528, 3140, 3912, 3140, 19.2, 3, 'solid', '#8B4513', true),

-- Left horizontal extension from booth 1
(UUID(), 'structural', 'horizontal', 2948, 3080, 3080, 3080, 6.6, 3, 'solid', '#8B4513', true),

-- Left vertical down
(UUID(), 'structural', 'vertical', 2948, 3080, 2948, 3170, 4.5, 3, 'solid', '#8B4513', true),

-- Vertical from booth 6 bottom going down
(UUID(), 'structural', 'vertical', 3464, 3140, 3464, 3170, 1.5, 3, 'solid', '#8B4513', true),

-- Vertical from booth 7 bottom going down
(UUID(), 'structural', 'vertical', 3528, 3140, 3528, 3170, 1.5, 3, 'solid', '#8B4513', true),

-- Right horizontal extension from booth 12
(UUID(), 'structural', 'horizontal', 3912, 3080, 4044, 3080, 6.6, 3, 'solid', '#8B4513', true),

-- Right vertical down
(UUID(), 'structural', 'vertical', 4044, 3080, 4044, 3170, 4.5, 3, 'solid', '#8B4513', true);

-- Right Section (Booths 13-23) Borders
-- Bottom horizontal under booths 13-16
INSERT INTO borders (border_id, type, orientation, x1, y1, x2, y2, length, thickness, stroke_style, color, is_static)
VALUES
(UUID(), 'structural', 'horizontal', 4734, 3014, 4995, 3014, 13.05, 3, 'solid', '#8B4513', true),

-- Right vertical (from booth 23 top to booth 16 bottom)
(UUID(), 'structural', 'vertical', 4995, 2574, 4995, 3014, 22, 3, 'solid', '#8B4513', true),

-- Left vertical extension down from booth 13 (to align with booth 12 border)
(UUID(), 'structural', 'vertical', 4734, 3014, 4734, 3170, 7.8, 3, 'solid', '#8B4513', true);

-- Top Strip (Booths 24-31) Borders
-- Top horizontal extending from booth 31 to booth 23
INSERT INTO borders (border_id, type, orientation, x1, y1, x2, y2, length, thickness, stroke_style, color, is_static)
VALUES
(UUID(), 'structural', 'horizontal', 4270, 892, 4995, 892, 36.25, 3, 'solid', '#8B4513', true),

-- Vertical extension up from booth 31
(UUID(), 'structural', 'vertical', 4270, 892, 4270, 852, 2, 3, 'solid', '#8B4513', true);

-- Verification query
SELECT 
    border_id,
    type,
    orientation,
    CONCAT('(', x1, ', ', y1, ') to (', x2, ', ', y2, ')') as coordinates,
    length,
    color
FROM borders
WHERE is_static = true
ORDER BY x1, y1;
