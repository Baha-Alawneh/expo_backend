-- Reset all booth positions to their original coordinates
-- Run this to restore booths to default layout

-- Update Top Left Corner (96-107)
UPDATE Booths SET location_x = 80, location_y = 80 WHERE booth_number = '103';
UPDATE Booths SET location_x = 144, location_y = 80 WHERE booth_number = '102';
UPDATE Booths SET location_x = 208, location_y = 80 WHERE booth_number = '101';
UPDATE Booths SET location_x = 272, location_y = 80 WHERE booth_number = '100';
UPDATE Booths SET location_x = 336, location_y = 80 WHERE booth_number = '99';
UPDATE Booths SET location_x = 400, location_y = 80 WHERE booth_number = '98';
UPDATE Booths SET location_x = 464, location_y = 80 WHERE booth_number = '97';
UPDATE Booths SET location_x = 528, location_y = 80 WHERE booth_number = '96';
UPDATE Booths SET location_x = 80, location_y = 144 WHERE booth_number = '104';
UPDATE Booths SET location_x = 80, location_y = 208 WHERE booth_number = '105';
UPDATE Booths SET location_x = 80, location_y = 272 WHERE booth_number = '106';
UPDATE Booths SET location_x = 80, location_y = 336 WHERE booth_number = '107';

-- Update Left Loop (82-95)
UPDATE Booths SET location_x = 260, location_y = 200 WHERE booth_number = '89';
UPDATE Booths SET location_x = 324, location_y = 200 WHERE booth_number = '90';
UPDATE Booths SET location_x = 388, location_y = 200 WHERE booth_number = '91';
UPDATE Booths SET location_x = 452, location_y = 200 WHERE booth_number = '92';
UPDATE Booths SET location_x = 516, location_y = 200 WHERE booth_number = '93';
UPDATE Booths SET location_x = 260, location_y = 264 WHERE booth_number = '88';
UPDATE Booths SET location_x = 260, location_y = 328 WHERE booth_number = '87';
UPDATE Booths SET location_x = 260, location_y = 392 WHERE booth_number = '86';
UPDATE Booths SET location_x = 324, location_y = 392 WHERE booth_number = '85';
UPDATE Booths SET location_x = 388, location_y = 392 WHERE booth_number = '84';
UPDATE Booths SET location_x = 452, location_y = 392 WHERE booth_number = '83';
UPDATE Booths SET location_x = 516, location_y = 392 WHERE booth_number = '82';
UPDATE Booths SET location_x = 516, location_y = 264 WHERE booth_number = '94';
UPDATE Booths SET location_x = 516, location_y = 328 WHERE booth_number = '95';

-- Update Center Complex (150-156)
UPDATE Booths SET location_x = 780, location_y = 92 WHERE booth_number = '152';
UPDATE Booths SET location_x = 854, location_y = 92 WHERE booth_number = '153';
UPDATE Booths SET location_x = 918, location_y = 92 WHERE booth_number = '154';
UPDATE Booths SET location_x = 780, location_y = 204 WHERE booth_number = '151';
UPDATE Booths SET location_x = 780, location_y = 268 WHERE booth_number = '150';
UPDATE Booths SET location_x = 938, location_y = 204 WHERE booth_number = '155';
UPDATE Booths SET location_x = 938, location_y = 268 WHERE booth_number = '156';

-- Update Top Right Strip (24-31)
UPDATE Booths SET location_x = 1180, location_y = 100 WHERE booth_number = '31';
UPDATE Booths SET location_x = 1244, location_y = 100 WHERE booth_number = '30';
UPDATE Booths SET location_x = 1308, location_y = 100 WHERE booth_number = '29';
UPDATE Booths SET location_x = 1372, location_y = 100 WHERE booth_number = '28';
UPDATE Booths SET location_x = 1436, location_y = 100 WHERE booth_number = '27';
UPDATE Booths SET location_x = 1500, location_y = 100 WHERE booth_number = '26';
UPDATE Booths SET location_x = 1564, location_y = 100 WHERE booth_number = '25';
UPDATE Booths SET location_x = 1628, location_y = 100 WHERE booth_number = '24';

-- Update Right Loop (32-45) - THIS IS THE BOX WE NEED TO FIX
UPDATE Booths SET location_x = 1180, location_y = 200 WHERE booth_number = '32';
UPDATE Booths SET location_x = 1244, location_y = 200 WHERE booth_number = '33';
UPDATE Booths SET location_x = 1308, location_y = 200 WHERE booth_number = '34';
UPDATE Booths SET location_x = 1372, location_y = 200 WHERE booth_number = '35';
UPDATE Booths SET location_x = 1436, location_y = 200 WHERE booth_number = '36';
UPDATE Booths SET location_x = 1180, location_y = 264 WHERE booth_number = '45';
UPDATE Booths SET location_x = 1180, location_y = 328 WHERE booth_number = '44';
UPDATE Booths SET location_x = 1180, location_y = 392 WHERE booth_number = '43';
UPDATE Booths SET location_x = 1244, location_y = 392 WHERE booth_number = '42';
UPDATE Booths SET location_x = 1308, location_y = 392 WHERE booth_number = '41';
UPDATE Booths SET location_x = 1372, location_y = 392 WHERE booth_number = '40';
UPDATE Booths SET location_x = 1436, location_y = 392 WHERE booth_number = '39';
UPDATE Booths SET location_x = 1436, location_y = 264 WHERE booth_number = '37';
UPDATE Booths SET location_x = 1436, location_y = 328 WHERE booth_number = '38';

-- Continue with other sections if needed...
