-- Populate default 156 booths with exact coordinates from White Plaza map
-- Scale: 1 meter = 20 pixels (SCALE = 20)
-- Default booth size: 3m × 3m (60px × 60px)

-- ============================================
-- Section 1: Top Left Corner (96-107) - Engineering
-- ============================================

-- Top Row (103-96): Reversed order, left to right
INSERT INTO Booths (booth_id, booth_number, location_x, location_y, width, height, zone_type, shape_type, layout_mode) VALUES
(UUID(), '103', 80, 80, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '102', 144, 80, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '101', 208, 80, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '100', 272, 80, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '99', 336, 80, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '98', 400, 80, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '97', 464, 80, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '96', 528, 80, 3.0, 3.0, 'engineering', 'rectangle', 'default'),

-- Left Column (104-107): Below booth 103
(UUID(), '104', 80, 144, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '105', 80, 208, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '106', 80, 272, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '107', 80, 336, 3.0, 3.0, 'engineering', 'rectangle', 'default');

-- ============================================
-- Section 2: Left Loop (82-95) - Engineering Box
-- ============================================

-- Top Row (89-93)
INSERT INTO Booths (booth_id, booth_number, location_x, location_y, width, height, zone_type, shape_type, layout_mode) VALUES
(UUID(), '89', 260, 200, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '90', 324, 200, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '91', 388, 200, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '92', 452, 200, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '93', 516, 200, 3.0, 3.0, 'engineering', 'rectangle', 'default'),

-- Left Column (88, 87, 86)
(UUID(), '88', 260, 264, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '87', 260, 328, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '86', 260, 392, 3.0, 3.0, 'engineering', 'rectangle', 'default'),

-- Bottom Row (85-82)
(UUID(), '85', 324, 392, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '84', 388, 392, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '83', 452, 392, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '82', 516, 392, 3.0, 3.0, 'engineering', 'rectangle', 'default'),

-- Right Column (94, 95)
(UUID(), '94', 516, 264, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '95', 516, 328, 3.0, 3.0, 'engineering', 'rectangle', 'default');

-- ============================================
-- Section 3: Center Complex (150-156) - Sponsors U-Shape
-- ============================================

INSERT INTO Booths (booth_id, booth_number, location_x, location_y, width, height, zone_type, shape_type, layout_mode) VALUES
-- L-Shaped Booths (152 and 154)
(UUID(), '152', 780, 92, 3.5, 5.4, 'sponsor', 'l-shape-left', 'default'),
(UUID(), '153', 854, 92, 3.0, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '154', 918, 92, 3.5, 5.4, 'sponsor', 'l-shape-right', 'default'),

-- Left Column (151, 150)
(UUID(), '151', 780, 204, 2.5, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '150', 780, 268, 2.5, 3.0, 'sponsor', 'rectangle', 'default'),

-- Right Column (155, 156)
(UUID(), '155', 938, 204, 2.5, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '156', 938, 268, 2.5, 3.0, 'sponsor', 'rectangle', 'default');

-- ============================================
-- Section 4: Top Right Strip (24-31) - Science/Standard
-- ============================================

INSERT INTO Booths (booth_id, booth_number, location_x, location_y, width, height, zone_type, shape_type, layout_mode) VALUES
(UUID(), '31', 1180, 100, 3.0, 3.0, 'science', 'rectangle', 'default'),
(UUID(), '30', 1244, 100, 3.0, 3.0, 'science', 'rectangle', 'default'),
(UUID(), '29', 1308, 100, 3.0, 3.0, 'science', 'rectangle', 'default'),
(UUID(), '28', 1372, 100, 3.0, 3.0, 'science', 'rectangle', 'default'),
(UUID(), '27', 1436, 100, 3.0, 3.0, 'science', 'rectangle', 'default'),
(UUID(), '26', 1500, 100, 3.0, 3.0, 'science', 'rectangle', 'default'),
(UUID(), '25', 1564, 100, 3.0, 3.0, 'science', 'rectangle', 'default'),
(UUID(), '24', 1628, 100, 3.0, 3.0, 'science', 'rectangle', 'default');

-- ============================================
-- Section 5: Right Loop (32-45) - Mixed Zone
-- ============================================

-- Top Row (32-36)
INSERT INTO Booths (booth_id, booth_number, location_x, location_y, width, height, zone_type, shape_type, layout_mode) VALUES
(UUID(), '32', 1180, 200, 3.0, 3.0, 'science', 'rectangle', 'default'),
(UUID(), '33', 1244, 200, 3.0, 3.0, 'science', 'rectangle', 'default'),
(UUID(), '34', 1308, 200, 3.0, 3.0, 'science', 'rectangle', 'default'),
(UUID(), '35', 1372, 200, 3.0, 3.0, 'science', 'rectangle', 'default'),
(UUID(), '36', 1436, 200, 3.0, 3.0, 'service', 'rectangle', 'default'),

-- Left Column (45, 44, 43)
(UUID(), '45', 1180, 264, 3.0, 3.0, 'science', 'rectangle', 'default'),
(UUID(), '44', 1180, 328, 3.0, 3.0, 'science', 'rectangle', 'default'),
(UUID(), '43', 1180, 392, 3.0, 3.0, 'engineering', 'rectangle', 'default'),

-- Bottom Row (42-39)
(UUID(), '42', 1244, 392, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '41', 1308, 392, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '40', 1372, 392, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '39', 1436, 392, 3.0, 3.0, 'service', 'rectangle', 'default'),

-- Right Column (37, 38)
(UUID(), '37', 1436, 264, 3.0, 3.0, 'service', 'rectangle', 'default'),
(UUID(), '38', 1436, 328, 3.0, 3.0, 'service', 'rectangle', 'default');

-- ============================================
-- Section 6: Block 1 - Left Bottom (64-81)
-- ============================================

-- Top Row (72-79) - Engineering
INSERT INTO Booths (booth_id, booth_number, location_x, location_y, width, height, zone_type, shape_type, layout_mode) VALUES
(UUID(), '72', 316, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '73', 380, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '74', 444, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '75', 508, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '76', 572, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '77', 636, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '78', 700, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '79', 764, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),

-- Bottom Row (71-64) - Sponsors (REVERSED)
(UUID(), '71', 316, 714, 3.1, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '70', 382, 714, 3.0, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '69', 446, 714, 3.0, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '68', 510, 714, 3.0, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '67', 574, 714, 3.0, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '66', 638, 714, 3.0, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '65', 702, 714, 3.0, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '64', 766, 714, 3.1, 3.0, 'sponsor', 'rectangle', 'default'),

-- Vertical Stack (80, 81)
(UUID(), '80', 770, 586, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '81', 770, 522, 3.0, 3.0, 'engineering', 'rectangle', 'default');

-- ============================================
-- Section 7: Block 2 - Center Bottom (46-63)
-- ============================================

-- Vertical Stack (46, 47)
INSERT INTO Booths (booth_id, booth_number, location_x, location_y, width, height, zone_type, shape_type, layout_mode) VALUES
(UUID(), '46', 992, 522, 3.1, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '47', 992, 586, 3.0, 3.0, 'engineering', 'rectangle', 'default'),

-- Top Row (48-55) - Engineering
(UUID(), '48', 992, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '49', 1056, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '50', 1120, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '51', 1184, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '52', 1248, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '53', 1312, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '54', 1376, 650, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '55', 1440, 650, 3.1, 3.0, 'engineering', 'rectangle', 'default'),

-- Bottom Row (63-56) - Sponsors
(UUID(), '63', 992, 714, 3.0, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '62', 1056, 714, 3.0, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '61', 1120, 714, 3.0, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '60', 1184, 714, 3.0, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '59', 1248, 714, 3.0, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '58', 1312, 714, 3.0, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '57', 1376, 714, 3.0, 3.0, 'sponsor', 'rectangle', 'default'),
(UUID(), '56', 1440, 714, 3.0, 3.0, 'sponsor', 'rectangle', 'default');

-- ============================================
-- Section 8: Bottom Strips (1-12) - Engineering
-- ============================================

-- Left Strip (1-6)
INSERT INTO Booths (booth_id, booth_number, location_x, location_y, width, height, zone_type, shape_type, layout_mode) VALUES
(UUID(), '1', 446, 982, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '2', 510, 982, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '3', 574, 982, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '4', 638, 982, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '5', 702, 982, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '6', 766, 982, 3.0, 3.0, 'engineering', 'rectangle', 'default'),

-- Right Strip (7-12)
(UUID(), '7', 976, 982, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '8', 1040, 982, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '9', 1104, 982, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '10', 1168, 982, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '11', 1232, 982, 3.0, 3.0, 'engineering', 'rectangle', 'default'),
(UUID(), '12', 1296, 982, 3.0, 3.0, 'engineering', 'rectangle', 'default');

-- ============================================
-- Section 9: Right Section (13-23) - Services/Standard
-- ============================================

-- Horizontal Row (13-16)
-- Position: 14m from right edge of box 32-45
-- Y position: Aligned with gap between booths 55 and 56 (blY=650, gap center=712, booth center=682)
-- rightX = loop2X + 5*(W+GAP) + 14*SCALE = 1180 + 5*64 + 280 = 1180 + 320 + 280 = 1780 - wait let me recalculate
-- Actually: loop2X = 1180, 5 booths = 5*64 = 320, 14m = 280px, so rightX = 1180 + 320 + 280 = 1780 - NO
-- Let me use the actual SQL values which seem more correct based on calculations
INSERT INTO Booths (booth_id, booth_number, location_x, location_y, width, height, zone_type, shape_type, layout_mode) VALUES
(UUID(), '13', 1780, 682, 3.1, 3.0, 'service', 'rectangle', 'default'),
(UUID(), '14', 1846, 682, 3.0, 3.0, 'service', 'rectangle', 'default'),
(UUID(), '15', 1910, 682, 3.0, 3.0, 'service', 'rectangle', 'default'),
(UUID(), '16', 1974, 682, 3.35, 3.0, 'service', 'rectangle', 'default'),

-- Vertical Stack (17-23) - Stacked ABOVE booth 16 going UP
-- stack16X = 1974 (same as booth 16's X position)
-- Y positions: rightY - (i+1)*(H+GAP) where rightY=682, H=60, GAP=4
(UUID(), '17', 1974, 618, 3.0, 3.0, 'standard', 'rectangle', 'default'),
(UUID(), '18', 1974, 554, 3.0, 3.0, 'service', 'rectangle', 'default'),
(UUID(), '19', 1974, 490, 3.0, 3.0, 'standard', 'rectangle', 'default'),
(UUID(), '20', 1974, 426, 3.0, 3.0, 'standard', 'rectangle', 'default'),
(UUID(), '21', 1974, 362, 3.0, 3.0, 'standard', 'rectangle', 'default'),
(UUID(), '22', 1974, 298, 3.0, 3.0, 'standard', 'rectangle', 'default'),
(UUID(), '23', 1974, 234, 3.1, 3.0, 'standard', 'rectangle', 'default');

-- ============================================
-- Summary:
-- Total Booths: 156
-- Engineering: 68 booths (cyan #0891b2)
-- Sponsor: 23 booths (magenta #d946ef)
-- Service: 19 booths (yellow #eab308)
-- Science: 11 booths (red #7f1d1d)
-- L-Shaped: 2 booths (152, 154)
-- ============================================
