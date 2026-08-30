-- Manual apply if `prisma db push` cannot reach the DB.
-- Matches ccasc/prisma/schema.prisma Deposit + RescheduleDateChange models.

CREATE TABLE IF NOT EXISTS `DepositStatus` (
  `deposit_status_id` INT NOT NULL AUTO_INCREMENT,
  `status` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`deposit_status_id`),
  UNIQUE KEY `DepositStatus_status_key` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `DepositStatus` (`status`) VALUES
  ('Pending'),
  ('Held'),
  ('Refunded'),
  ('Forfeited');

CREATE TABLE IF NOT EXISTS `Deposit` (
  `deposit_id` INT NOT NULL AUTO_INCREMENT,
  `booking_id` INT NOT NULL,
  `required_amount` DECIMAL(10, 2) NOT NULL,
  `amount_paid` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `deposit_status_id` INT NOT NULL,
  `payment_id` INT NULL,
  `staff_id` INT NULL,
  `notes` TEXT NULL,
  `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`deposit_id`),
  UNIQUE KEY `Deposit_booking_id_key` (`booking_id`),
  UNIQUE KEY `Deposit_payment_id_key` (`payment_id`),
  CONSTRAINT `Deposit_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `Booking` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Deposit_deposit_status_id_fkey` FOREIGN KEY (`deposit_status_id`) REFERENCES `DepositStatus` (`deposit_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Deposit_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `Payment` (`payment_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Deposit_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff` (`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `RescheduleDateChange` (
  `reschedule_date_change_id` INT NOT NULL AUTO_INCREMENT,
  `reschedule_id` INT NOT NULL,
  `original_date` DATE NOT NULL,
  `requested_date` DATE NOT NULL,
  `reservation_date_id` INT NULL,
  `is_primary` BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (`reschedule_date_change_id`),
  CONSTRAINT `RescheduleDateChange_reschedule_id_fkey` FOREIGN KEY (`reschedule_id`) REFERENCES `RescheduleRequest` (`reschedule_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RescheduleDateChange_reservation_date_id_fkey` FOREIGN KEY (`reservation_date_id`) REFERENCES `ReservationDate` (`reservation_date_id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Link Transaction rows to Deposit (optional FK).
ALTER TABLE `Transaction`
  ADD COLUMN IF NOT EXISTS `deposit_id` INT NULL AFTER `payment_id`;

ALTER TABLE `Transaction`
  ADD CONSTRAINT `Transaction_deposit_id_fkey`
  FOREIGN KEY (`deposit_id`) REFERENCES `Deposit` (`deposit_id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: link transactions to deposit via payment_id when deposit was recorded with that payment.
UPDATE `Transaction` t
INNER JOIN `Deposit` d ON d.`payment_id` = t.`payment_id`
SET t.`deposit_id` = d.`deposit_id`
WHERE t.`deposit_id` IS NULL;

-- Backfill: link remaining transactions to booking deposit row when one exists.
UPDATE `Transaction` t
INNER JOIN `Deposit` d ON d.`booking_id` = t.`booking_id`
SET t.`deposit_id` = d.`deposit_id`
WHERE t.`deposit_id` IS NULL;
