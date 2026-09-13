-- ============================================================
-- CSASC – Add Boxing Ring facility & move Basketball to Sports Complex
-- ============================================================
-- Run this on the live Railway MySQL database to match the seed
-- changes made in prisma/seed.mjs
-- ============================================================

-- 1. Add a new FacilityRate row for Boxing Ring (day: 2000, night: 3000)
INSERT INTO `FacilityRate` (`day_rate`, `night_rate`)
VALUES (2000.00, 3000.00);

-- 2. Move Basketball Court from Cultural Center (venue_id=1) to Sports Complex (venue_id=2)
UPDATE `Facility`
SET `venue_id` = 2
WHERE `facility_name` = 'Basketball Court';

-- 3. Fetch the new rate_id for Boxing (the last inserted row)
SET @boxing_rate_id = LAST_INSERT_ID();

-- 4. Add Boxing Ring facility to Sports Complex
INSERT INTO `Facility` (`facility_name`, `description`, `capacity`, `rate_id`, `status_id`, `venue_id`)
VALUES ('Boxing Ring', 'Professional boxing ring with ropes and padded corners for boxing matches and training', 0, @boxing_rate_id, 1, 2);

SELECT '✅ Boxing Ring added and Basketball Court moved to Sports Complex' AS result;