-- CreateTable
CREATE TABLE `AuditLog` (
    `audit_log_id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(100) NOT NULL,
    `target_user_id` VARCHAR(50) NOT NULL,
    `target_name` VARCHAR(200) NOT NULL,
    `performed_by_id` VARCHAR(50) NOT NULL,
    `performed_by_name` VARCHAR(200) NOT NULL,
    `details` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`audit_log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Staff` (
    `staff_id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(100) NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `middle_name` VARCHAR(100) NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `contact_number` VARCHAR(20) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'Active',
    `profile_photo` VARCHAR(255) NULL,
    `staff_role_id` INTEGER NOT NULL,
    `staff_org_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `otp` VARCHAR(10) NULL,
    `otp_expiration` DATETIME(3) NULL,

    UNIQUE INDEX `Staff_username_key`(`username`),
    UNIQUE INDEX `Staff_email_key`(`email`),
    PRIMARY KEY (`staff_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffRole` (
    `role_id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_name` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffOrganization` (
    `staff_org_id` INTEGER NOT NULL AUTO_INCREMENT,
    `org_name` VARCHAR(200) NOT NULL,

    PRIMARY KEY (`staff_org_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `client_id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(100) NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `middle_name` VARCHAR(100) NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `contact_number` VARCHAR(20) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `id_proof` TEXT NULL,
    `account_status` VARCHAR(50) NOT NULL DEFAULT 'Active',
    `verification_status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `remarks` TEXT NULL,
    `profile_photo` VARCHAR(255) NULL,
    `otp` VARCHAR(10) NULL,
    `otp_expiration` DATETIME(3) NULL,
    `client_role_id` VARCHAR(10) NOT NULL,
    `client_org_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Client_username_key`(`username`),
    UNIQUE INDEX `Client_email_key`(`email`),
    PRIMARY KEY (`client_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientRole` (
    `client_role_id` VARCHAR(10) NOT NULL,
    `role_name` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`client_role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientOrganization` (
    `client_org_id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_name` VARCHAR(200) NOT NULL,

    PRIMARY KEY (`client_org_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Facility` (
    `facility_id` INTEGER NOT NULL AUTO_INCREMENT,
    `facility_name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `capacity` INTEGER NULL,
    `rate_id` INTEGER NOT NULL,
    `status_id` INTEGER NOT NULL,
    `venue_id` INTEGER NOT NULL,

    PRIMARY KEY (`facility_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FacilityRate` (
    `rate_id` INTEGER NOT NULL AUTO_INCREMENT,
    `day_rate` DECIMAL(10, 2) NOT NULL,
    `night_rate` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`rate_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FacilityImage` (
    `facility_image_id` INTEGER NOT NULL AUTO_INCREMENT,
    `image` VARCHAR(255) NOT NULL,
    `facility_id` INTEGER NOT NULL,

    PRIMARY KEY (`facility_image_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FacilityVenue` (
    `venue_id` INTEGER NOT NULL AUTO_INCREMENT,
    `venue` VARCHAR(200) NOT NULL,

    PRIMARY KEY (`venue_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AvailabilityStatus` (
    `status_id` INTEGER NOT NULL AUTO_INCREMENT,
    `status_name` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`status_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Particular` (
    `particular_id` INTEGER NOT NULL AUTO_INCREMENT,
    `particular_name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(100) NOT NULL DEFAULT '',
    `status_id` INTEGER NOT NULL DEFAULT 1,
    `item_id` INTEGER NULL,

    PRIMARY KEY (`particular_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inventory` (
    `item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_name` VARCHAR(200) NOT NULL,
    `unit_cost` DECIMAL(10, 2) NOT NULL,
    `quantity_available` INTEGER NOT NULL,
    `venue_id` INTEGER NOT NULL,
    `status_id` INTEGER NOT NULL,

    PRIMARY KEY (`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Package` (
    `package_id` INTEGER NOT NULL AUTO_INCREMENT,
    `package_name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `day_rate` DECIMAL(10, 2) NULL,
    `night_rate` DECIMAL(10, 2) NULL,
    `led_wall_day_rate` DECIMAL(10, 2) NULL,
    `led_wall_night_rate` DECIMAL(10, 2) NULL,
    `status_id` INTEGER NOT NULL DEFAULT 1,
    `time_slot_id` INTEGER NOT NULL,

    PRIMARY KEY (`package_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimeSlot` (
    `time_slot_id` INTEGER NOT NULL AUTO_INCREMENT,
    `start_time` VARCHAR(20) NOT NULL,
    `end_time` VARCHAR(20) NOT NULL,

    PRIMARY KEY (`time_slot_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PackageInclusion` (
    `package_inclusion_id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantity_available` INTEGER NOT NULL,
    `package_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,

    PRIMARY KEY (`package_inclusion_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Announcement` (
    `announcement_id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `recipient_type` VARCHAR(50) NOT NULL,
    `date_posted` DATETIME(3) NOT NULL,
    `staff_id` INTEGER NOT NULL,
    `status_id` INTEGER NOT NULL,

    PRIMARY KEY (`announcement_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnnouncementStatus` (
    `status_id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`status_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reservation` (
    `reservation_id` INTEGER NOT NULL AUTO_INCREMENT,
    `event_date` DATE NOT NULL,
    `event_type` VARCHAR(200) NOT NULL,
    `reservation_status` VARCHAR(50) NOT NULL,
    `event_status` VARCHAR(50) NOT NULL DEFAULT 'Upcoming',
    `total_amount` DECIMAL(12, 2) NULL,
    `submitted_at` DATETIME(3) NOT NULL,
    `venue_id` INTEGER NOT NULL,
    `client_id` INTEGER NOT NULL,
    `package_id` INTEGER NULL,
    `time_slot_id` INTEGER NOT NULL,
    `notes` TEXT NULL,

    PRIMARY KEY (`reservation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReservationDate` (
    `reservation_date_id` INTEGER NOT NULL AUTO_INCREMENT,
    `reservation_id` INTEGER NOT NULL,
    `event_date` DATE NOT NULL,

    PRIMARY KEY (`reservation_date_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReservedParticular` (
    `reserved_particular_id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantity` INTEGER NOT NULL,
    `reservation_id` INTEGER NOT NULL,
    `particular_id` INTEGER NOT NULL,

    PRIMARY KEY (`reserved_particular_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `booking_id` INTEGER NOT NULL AUTO_INCREMENT,
    `confirmation_date` DATETIME(3) NULL,
    `reservation_id` INTEGER NOT NULL,
    `venue_id` INTEGER NULL,
    `booking_status_id` INTEGER NOT NULL,
    `staff_id` INTEGER NULL,

    PRIMARY KEY (`booking_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingStatus` (
    `booking_status_id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`booking_status_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `payment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount_paid` DECIMAL(10, 2) NOT NULL,
    `payment_status_id` INTEGER NOT NULL,
    `staff_id` INTEGER NULL,
    `booking_id` INTEGER NOT NULL,

    PRIMARY KEY (`payment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DepositStatus` (
    `deposit_status_id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `DepositStatus_status_key`(`status`),
    PRIMARY KEY (`deposit_status_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Deposit` (
    `deposit_id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `required_amount` DECIMAL(10, 2) NOT NULL,
    `amount_paid` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `deposit_status_id` INTEGER NOT NULL,
    `payment_id` INTEGER NULL,
    `staff_id` INTEGER NULL,
    `notes` TEXT NULL,
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Deposit_booking_id_key`(`booking_id`),
    UNIQUE INDEX `Deposit_payment_id_key`(`payment_id`),
    PRIMARY KEY (`deposit_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentStatus` (
    `status_id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`status_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `transaction_id` INTEGER NOT NULL AUTO_INCREMENT,
    `receipt_number` VARCHAR(50) NULL,
    `payment_date` DATETIME(3) NOT NULL,
    `recorded_by` VARCHAR(255) NULL,
    `booking_id` INTEGER NOT NULL,
    `payment_id` INTEGER NOT NULL,
    `deposit_id` INTEGER NULL,

    PRIMARY KEY (`transaction_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `document_id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_type_id` INTEGER NOT NULL,
    `file_path` MEDIUMTEXT NULL,
    `document_status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `remarks` TEXT NULL,
    `submitted_at` DATETIME(3) NOT NULL,
    `booking_id` INTEGER NULL,
    `staff_id` INTEGER NULL,

    PRIMARY KEY (`document_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentType` (
    `document_type_id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`document_type_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LetterStatus` (
    `letter_id` INTEGER NOT NULL AUTO_INCREMENT,
    `letter_remarks` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `reservation_id` INTEGER NOT NULL,
    `approval_status_id` INTEGER NOT NULL,
    `staff_id` INTEGER NULL,

    PRIMARY KEY (`letter_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApprovalStatus` (
    `approval_status_id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`approval_status_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `notification_id` INTEGER NOT NULL AUTO_INCREMENT,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'General',
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `sent_at` DATETIME(3) NOT NULL,
    `staff_id` INTEGER NOT NULL,
    `client_id` INTEGER NOT NULL,

    PRIMARY KEY (`notification_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Schedule` (
    `schedule_id` INTEGER NOT NULL AUTO_INCREMENT,
    `client_id` INTEGER NOT NULL,
    `reservation_id` INTEGER NULL,
    `booking_id` INTEGER NULL,
    `facility_id` INTEGER NOT NULL,

    PRIMARY KEY (`schedule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RescheduleRequest` (
    `reschedule_id` INTEGER NOT NULL AUTO_INCREMENT,
    `reservation_id` INTEGER NOT NULL,
    `requested_date` DATE NOT NULL,
    `reason` TEXT NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `decline_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`reschedule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RescheduleDateChange` (
    `reschedule_date_change_id` INTEGER NOT NULL AUTO_INCREMENT,
    `reschedule_id` INTEGER NOT NULL,
    `original_date` DATE NOT NULL,
    `requested_date` DATE NOT NULL,
    `reservation_date_id` INTEGER NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`reschedule_date_change_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalendarBlock` (
    `block_id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `block_date` DATE NOT NULL,
    `block_type` VARCHAR(50) NOT NULL,
    `venue_id` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`block_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_staff_role_id_fkey` FOREIGN KEY (`staff_role_id`) REFERENCES `StaffRole`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_staff_org_id_fkey` FOREIGN KEY (`staff_org_id`) REFERENCES `StaffOrganization`(`staff_org_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Client` ADD CONSTRAINT `Client_client_role_id_fkey` FOREIGN KEY (`client_role_id`) REFERENCES `ClientRole`(`client_role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Client` ADD CONSTRAINT `Client_client_org_id_fkey` FOREIGN KEY (`client_org_id`) REFERENCES `ClientOrganization`(`client_org_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Facility` ADD CONSTRAINT `Facility_rate_id_fkey` FOREIGN KEY (`rate_id`) REFERENCES `FacilityRate`(`rate_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Facility` ADD CONSTRAINT `Facility_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `AvailabilityStatus`(`status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Facility` ADD CONSTRAINT `Facility_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `FacilityVenue`(`venue_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FacilityImage` ADD CONSTRAINT `FacilityImage_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `Facility`(`facility_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Particular` ADD CONSTRAINT `Particular_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `Inventory`(`item_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Particular` ADD CONSTRAINT `Particular_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `AvailabilityStatus`(`status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `FacilityVenue`(`venue_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `AvailabilityStatus`(`status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Package` ADD CONSTRAINT `Package_time_slot_id_fkey` FOREIGN KEY (`time_slot_id`) REFERENCES `TimeSlot`(`time_slot_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Package` ADD CONSTRAINT `Package_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `AvailabilityStatus`(`status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PackageInclusion` ADD CONSTRAINT `PackageInclusion_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `Package`(`package_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PackageInclusion` ADD CONSTRAINT `PackageInclusion_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `Inventory`(`item_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Announcement` ADD CONSTRAINT `Announcement_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff`(`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Announcement` ADD CONSTRAINT `Announcement_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `AnnouncementStatus`(`status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `FacilityVenue`(`venue_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `Client`(`client_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `Package`(`package_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_time_slot_id_fkey` FOREIGN KEY (`time_slot_id`) REFERENCES `TimeSlot`(`time_slot_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReservationDate` ADD CONSTRAINT `ReservationDate_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `Reservation`(`reservation_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReservedParticular` ADD CONSTRAINT `ReservedParticular_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `Reservation`(`reservation_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReservedParticular` ADD CONSTRAINT `ReservedParticular_particular_id_fkey` FOREIGN KEY (`particular_id`) REFERENCES `Particular`(`particular_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `Reservation`(`reservation_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `FacilityVenue`(`venue_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_booking_status_id_fkey` FOREIGN KEY (`booking_status_id`) REFERENCES `BookingStatus`(`booking_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff`(`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_payment_status_id_fkey` FOREIGN KEY (`payment_status_id`) REFERENCES `PaymentStatus`(`status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff`(`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `Booking`(`booking_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Deposit` ADD CONSTRAINT `Deposit_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `Booking`(`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Deposit` ADD CONSTRAINT `Deposit_deposit_status_id_fkey` FOREIGN KEY (`deposit_status_id`) REFERENCES `DepositStatus`(`deposit_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Deposit` ADD CONSTRAINT `Deposit_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `Payment`(`payment_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Deposit` ADD CONSTRAINT `Deposit_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff`(`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `Booking`(`booking_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `Payment`(`payment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_deposit_id_fkey` FOREIGN KEY (`deposit_id`) REFERENCES `Deposit`(`deposit_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_document_type_id_fkey` FOREIGN KEY (`document_type_id`) REFERENCES `DocumentType`(`document_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `Booking`(`booking_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff`(`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LetterStatus` ADD CONSTRAINT `LetterStatus_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `Reservation`(`reservation_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LetterStatus` ADD CONSTRAINT `LetterStatus_approval_status_id_fkey` FOREIGN KEY (`approval_status_id`) REFERENCES `ApprovalStatus`(`approval_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LetterStatus` ADD CONSTRAINT `LetterStatus_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff`(`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff`(`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `Client`(`client_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Schedule` ADD CONSTRAINT `Schedule_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `Client`(`client_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Schedule` ADD CONSTRAINT `Schedule_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `Reservation`(`reservation_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Schedule` ADD CONSTRAINT `Schedule_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `Booking`(`booking_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Schedule` ADD CONSTRAINT `Schedule_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `Facility`(`facility_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RescheduleRequest` ADD CONSTRAINT `RescheduleRequest_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `Reservation`(`reservation_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RescheduleDateChange` ADD CONSTRAINT `RescheduleDateChange_reschedule_id_fkey` FOREIGN KEY (`reschedule_id`) REFERENCES `RescheduleRequest`(`reschedule_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RescheduleDateChange` ADD CONSTRAINT `RescheduleDateChange_reservation_date_id_fkey` FOREIGN KEY (`reservation_date_id`) REFERENCES `ReservationDate`(`reservation_date_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarBlock` ADD CONSTRAINT `CalendarBlock_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `FacilityVenue`(`venue_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

