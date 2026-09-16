-- ============================================================
-- CSASC – Add Sports Complex facilities with quantities (capacity)
-- ============================================================
-- Run this on the live Railway MySQL database.
-- Adds facility rates and facilities for the Sports Complex (venue_id=2).
-- Each facility's `capacity` field stores the available quantity.
-- ============================================================

-- 1. Add missing FacilityRate rows
-- Track Oval (rate_id=5): day=3000, night=3000 (already exists)
-- Swimming Pool: day=2500, night=2500
INSERT IGNORE INTO `FacilityRate` (`rate_id`, `day_rate`, `night_rate`)
VALUES (100, 2500.00, 2500.00);

-- Softball Field / Football Field / Volleyball Court / Tennis Court: day=500, night=500
INSERT IGNORE INTO `FacilityRate` (`rate_id`, `day_rate`, `night_rate`)
VALUES (101, 500.00, 500.00);

-- Concrete Grandstand: day=1200, night=1200
INSERT IGNORE INTO `FacilityRate` (`rate_id`, `day_rate`, `night_rate`)
VALUES (102, 1200.00, 1200.00);

-- Wooden Grandstand: day=500, night=500
INSERT IGNORE INTO `FacilityRate` (`rate_id`, `day_rate`, `night_rate`)
VALUES (103, 500.00, 500.00);

-- Outside Lights & Sound System: day=1000, night=1000
INSERT IGNORE INTO `FacilityRate` (`rate_id`, `day_rate`, `night_rate`)
VALUES (104, 1000.00, 1000.00);

-- Concrete Grandstand (with Lights): day=1700, night=1700
INSERT IGNORE INTO `FacilityRate` (`rate_id`, `day_rate`, `night_rate`)
VALUES (105, 1700.00, 1700.00);

-- Concrete Grandstand (with Sounds): day=2200, night=2200
INSERT IGNORE INTO `FacilityRate` (`rate_id`, `day_rate`, `night_rate`)
VALUES (106, 2200.00, 2200.00);

-- Wooden Grandstand (with Lights): day=1000, night=1000
INSERT IGNORE INTO `FacilityRate` (`rate_id`, `day_rate`, `night_rate`)
VALUES (107, 1000.00, 1000.00);

-- Wooden Grandstand (with Sounds): day=1500, night=1500
INSERT IGNORE INTO `FacilityRate` (`rate_id`, `day_rate`, `night_rate`)
VALUES (108, 1500.00, 1500.00);

-- 2. Get or set rate IDs using variables
SET @rate_2500 = 100;
SET @rate_500 = 101;
SET @rate_1200 = 102;
SET @rate_500_wooden = 103;
SET @rate_1000_lights = 104;
SET @rate_1700 = 105;
SET @rate_2200 = 106;
SET @rate_1000_wooden_lights = 107;
SET @rate_1500_wooden_sounds = 108;

-- 3. Update existing Track Oval capacity to 1
UPDATE `Facility`
SET `capacity` = 1
WHERE `facility_name` = 'Track Oval' AND `venue_id` = 2;

-- 4. Insert new Sports Complex facilities (venue_id=2) with their quantities (capacity)
INSERT IGNORE INTO `Facility` (`facility_name`, `description`, `capacity`, `rate_id`, `status_id`, `venue_id`)
VALUES
('Swimming Pool', 'Olympic-size swimming pool for aquatic events and competitions', 1, @rate_2500, 1, 2),
('Softball Field', 'Standard softball field for tournaments and practice sessions', 1, @rate_500, 1, 2),
('Football Field', 'Regulation football field for matches and training', 1, @rate_500, 1, 2),
('Volleyball Court', 'Volleyball court with net for games and tournaments', 2, @rate_500, 1, 2),
('Tennis Court', 'Tennis court with professional surface for matches', 3, @rate_500, 1, 2),
('Concrete Grandstand', 'Concrete grandstand seating for spectators with roof cover', 1, @rate_1200, 1, 2),
('Concrete Grandstand (with Lights)', 'Concrete grandstand with lighting system for evening events', 1, @rate_1700, 1, 2),
('Concrete Grandstand (with Sounds)', 'Concrete grandstand with sound system for events', 1, @rate_2200, 1, 2),
('Wooden Grandstand', 'Wooden grandstand seating for spectators', 2, @rate_500_wooden, 1, 2),
('Wooden Grandstand (with Lights)', 'Wooden grandstand with lighting system for evening events', 2, @rate_1000_wooden_lights, 1, 2),
('Wooden Grandstand (with Sounds)', 'Wooden grandstand with sound system for events', 2, @rate_1500_wooden_sounds, 1, 2),
('Outside Lights & Sound System', 'Outdoor lighting and sound system for night events and performances', 1, @rate_1000_lights, 1, 2);

-- 5. Update existing Basketball Court capacity to 1
UPDATE `Facility`
SET `capacity` = 1
WHERE `facility_name` = 'Basketball Court' AND `venue_id` = 2;

-- 6. Update existing Boxing Ring capacity to 1
UPDATE `Facility`
SET `capacity` = 1
WHERE `facility_name` = 'Boxing Ring' AND `venue_id` = 2;

SELECT CONCAT('✅ Added ', ROW_COUNT(), ' sports complex facilities with quantities') AS result;