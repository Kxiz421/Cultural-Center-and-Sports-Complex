-- Manual apply if `prisma db push` cannot reach the DB.
-- Payment discounts + deposit consume/pullout.

ALTER TABLE `Payment`
  ADD COLUMN `base_amount` DECIMAL(12, 2) NULL,
  ADD COLUMN `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `discount_percent` DECIMAL(5, 2) NULL,
  ADD COLUMN `amount_after_discount` DECIMAL(12, 2) NULL;

ALTER TABLE `Deposit`
  ADD COLUMN `amount_after_deductions` DECIMAL(10, 2) NULL,
  ADD COLUMN `pulled_out_at` DATETIME(3) NULL;

UPDATE `Deposit`
SET `amount_after_deductions` = `required_amount`
WHERE `amount_after_deductions` IS NULL;

INSERT IGNORE INTO `DepositStatus` (`status`) VALUES
  ('Deducted'),
  ('Fully Deducted'),
  ('Pulled Out');

CREATE TABLE IF NOT EXISTS `DepositDeduction` (
  `deduction_id` INT NOT NULL AUTO_INCREMENT,
  `deposit_id` INT NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `reason` VARCHAR(500) NOT NULL,
  `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `staff_id` INT NULL,
  PRIMARY KEY (`deduction_id`),
  KEY `DepositDeduction_deposit_id_idx` (`deposit_id`),
  CONSTRAINT `DepositDeduction_deposit_id_fkey` FOREIGN KEY (`deposit_id`) REFERENCES `Deposit` (`deposit_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `DepositDeduction_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff` (`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Transaction`
  MODIFY `payment_id` INT NULL;

ALTER TABLE `Transaction`
  ADD COLUMN `entry_type` VARCHAR(30) NOT NULL DEFAULT 'payment',
  ADD COLUMN `release_amount` DECIMAL(10, 2) NULL;
