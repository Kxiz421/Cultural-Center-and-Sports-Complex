-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: May 20, 2026 at 09:44 PM
-- Server version: 8.4.7
-- PHP Version: 8.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ccasc`
--

-- --------------------------------------------------------

--
-- Table structure for table `announcement`
--

DROP TABLE IF EXISTS `announcement`;
CREATE TABLE IF NOT EXISTS `announcement` (
  `announcement_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_posted` datetime(3) NOT NULL,
  `staff_id` int NOT NULL,
  `status_id` int NOT NULL,
  PRIMARY KEY (`announcement_id`),
  KEY `Announcement_staff_id_fkey` (`staff_id`),
  KEY `Announcement_status_id_fkey` (`status_id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `announcement`
--

INSERT INTO `announcement` (`announcement_id`, `title`, `content`, `recipient_type`, `date_posted`, `staff_id`, `status_id`) VALUES
(1, 'Main Gymnasium Maintenance Schedule', 'The Main Gymnasium will undergo routine maintenance and cleaning on April 5 2026. No bookings will be accommodated on this date.', 'All', '2026-03-01 00:00:00.000', 1, 1),
(2, 'Air Conditioning Unit Inspection Notice', 'All air conditioning units in the South Cotabato Gymnasium and Cultural Center will be inspected and serviced on April 8 2026.', 'All', '2026-03-02 01:00:00.000', 1, 1),
(3, 'LED Wall Maintenance Advisory', 'The LED Wall composed of 117 panels will be undergoing calibration and maintenance on April 12 2026. Reservations requiring the LED Wall on this date will not be accommodated.', 'Clients', '2026-03-03 02:00:00.000', 1, 1),
(4, 'Restroom Renovation Notice', 'Restroom facilities will be temporarily closed for renovation from April 15 to April 17 2026. Alternative arrangements will be provided for confirmed bookings.', 'All', '2026-03-04 00:30:00.000', 1, 1),
(5, 'Lights and Sound System Check', 'The lights and sound system including the 12 PAR64 lights and microphone equipment will be tested and serviced on April 20 2026.', 'Staff', '2026-03-04 23:00:00.000', 1, 3);

-- --------------------------------------------------------

--
-- Table structure for table `announcementstatus`
--

DROP TABLE IF EXISTS `announcementstatus`;
CREATE TABLE IF NOT EXISTS `announcementstatus` (
  `status_id` int NOT NULL AUTO_INCREMENT,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`status_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `announcementstatus`
--

INSERT INTO `announcementstatus` (`status_id`, `status`) VALUES
(1, 'Active'),
(2, 'Archived'),
(3, 'Inactive');

-- --------------------------------------------------------

--
-- Table structure for table `approvalstatus`
--

DROP TABLE IF EXISTS `approvalstatus`;
CREATE TABLE IF NOT EXISTS `approvalstatus` (
  `approval_status_id` int NOT NULL AUTO_INCREMENT,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`approval_status_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `approvalstatus`
--

INSERT INTO `approvalstatus` (`approval_status_id`, `status`) VALUES
(1, 'Declined'),
(2, 'Pending'),
(3, 'Approved');

-- --------------------------------------------------------

--
-- Table structure for table `availabilitystatus`
--

DROP TABLE IF EXISTS `availabilitystatus`;
CREATE TABLE IF NOT EXISTS `availabilitystatus` (
  `status_id` int NOT NULL AUTO_INCREMENT,
  `status_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`status_id`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `availabilitystatus`
--

INSERT INTO `availabilitystatus` (`status_id`, `status_name`) VALUES
(1, 'Archived'),
(2, 'Available'),
(3, 'Unavailable'),
(4, 'Under Maintenance');

-- --------------------------------------------------------

--
-- Table structure for table `booking`
--

DROP TABLE IF EXISTS `booking`;
CREATE TABLE IF NOT EXISTS `booking` (
  `booking_id` int NOT NULL AUTO_INCREMENT,
  `confirmation_date` datetime(3) DEFAULT NULL,
  `reservation_id` int NOT NULL,
  `booking_status_id` int NOT NULL,
  `staff_id` int DEFAULT NULL,
  PRIMARY KEY (`booking_id`),
  KEY `Booking_reservation_id_fkey` (`reservation_id`),
  KEY `Booking_booking_status_id_fkey` (`booking_status_id`),
  KEY `Booking_staff_id_fkey` (`staff_id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `booking`
--

INSERT INTO `booking` (`booking_id`, `confirmation_date`, `reservation_id`, `booking_status_id`, `staff_id`) VALUES
(1, '2026-03-09 07:00:00.000', 2, 2, 2),
(2, '2026-03-08 05:00:00.000', 5, 1, 2),
(3, '2026-03-07 01:00:00.000', 1, 1, 2),
(4, '2026-03-06 03:00:00.000', 3, 3, NULL),
(5, '2026-03-05 02:00:00.000', 1, 1, 2);

-- --------------------------------------------------------

--
-- Table structure for table `bookingstatus`
--

DROP TABLE IF EXISTS `bookingstatus`;
CREATE TABLE IF NOT EXISTS `bookingstatus` (
  `booking_status_id` int NOT NULL AUTO_INCREMENT,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`booking_status_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `bookingstatus`
--

INSERT INTO `bookingstatus` (`booking_status_id`, `status`) VALUES
(1, 'Confirmed'),
(2, 'Cancelled'),
(3, 'Pending');

-- --------------------------------------------------------

--
-- Table structure for table `client`
--

DROP TABLE IF EXISTS `client`;
CREATE TABLE IF NOT EXISTS `client` (
  `client_id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `middle_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_proof` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `profile_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `client_role_id` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_org_id` int NOT NULL,
  PRIMARY KEY (`client_id`),
  UNIQUE KEY `Client_email_key` (`email`),
  KEY `Client_client_role_id_fkey` (`client_role_id`),
  KEY `Client_client_org_id_fkey` (`client_org_id`)
) ENGINE=MyISAM AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `client`
--

INSERT INTO `client` (`client_id`, `first_name`, `middle_name`, `last_name`, `email`, `contact_number`, `password`, `id_proof`, `account_status`, `profile_photo`, `client_role_id`, `client_org_id`) VALUES
(1, 'Carlo', 'Santos', 'Mendoza', 'carlo@email.com', '09170111222', 'pass321', 'id1.jpg', 'Active', 'client1.jpg', 'PROV', 1),
(2, 'Beatriz', 'Reyes', 'Lopez', 'beatriz@email.com', '09171222333', 'pass654', 'id2.jpg', 'Active', 'client2.jpg', 'PUB', 2),
(3, 'Daniel', 'Gomez', 'Flores', 'daniel@email.com', '09172333444', 'pass987', 'id3.jpg', 'Active', 'client3.jpg', 'PUB', 3),
(4, 'Katrina', 'Beltran', 'Villanueva', 'katrina@email.com', '09173444555', 'pass159', 'id4.jpg', 'Active', 'client4.jpg', 'PROV', 4),
(5, 'Mark', 'Dizon', 'Bautista', 'mark@email.com', '09174555666', 'pass753', 'id5.jpg', 'Deactivated', 'client5.jpg', 'PUB', 5),
(6, 'Mikael Jules', 'Puello', 'Balabag', 'puellokyle@gmail.com', '', 'Skyhigh1', NULL, 'Active', NULL, 'PUB', 1),
(7, 'Mikael2 Jules', 'Puello', 'Balabag', 'dasdasd@gmail.com', '', '$2b$12$M.3WR5zMi6RXPW6YieSHnu0nCE7NSClMD6O/0LGcmNvDX8zj28oKi', NULL, 'Deactivated', NULL, 'PROV', 1),
(8, 'ree', 'rer', 'rer', 'werer', '7589094585', '$2b$12$9.m3LezJHXHJo683A5DgGeBGuvfqoI/7U4g7hVF223Jmjb/SlC3bS', NULL, 'Active', NULL, 'PROV', 1);

-- --------------------------------------------------------

--
-- Table structure for table `clientorganization`
--

DROP TABLE IF EXISTS `clientorganization`;
CREATE TABLE IF NOT EXISTS `clientorganization` (
  `client_org_id` int NOT NULL AUTO_INCREMENT,
  `organization_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`client_org_id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `clientorganization`
--

INSERT INTO `clientorganization` (`client_org_id`, `organization_name`) VALUES
(1, 'Notre Dame of Marbel University'),
(2, 'South Cotabato State College'),
(3, 'Mendoza Catering Services'),
(4, 'STI College Koronadal'),
(5, 'Villanueva Events Management');

-- --------------------------------------------------------

--
-- Table structure for table `clientrole`
--

DROP TABLE IF EXISTS `clientrole`;
CREATE TABLE IF NOT EXISTS `clientrole` (
  `client_role_id` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`client_role_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `clientrole`
--

INSERT INTO `clientrole` (`client_role_id`, `role_name`) VALUES
('PUB', 'Public Client'),
('PROV', 'Provincial Government');

-- --------------------------------------------------------

--
-- Table structure for table `document`
--

DROP TABLE IF EXISTS `document`;
CREATE TABLE IF NOT EXISTS `document` (
  `document_id` int NOT NULL AUTO_INCREMENT,
  `document_type_id` int NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `submitted_at` datetime(3) NOT NULL,
  `booking_id` int NOT NULL,
  `staff_id` int DEFAULT NULL,
  PRIMARY KEY (`document_id`),
  KEY `Document_document_type_id_fkey` (`document_type_id`),
  KEY `Document_booking_id_fkey` (`booking_id`),
  KEY `Document_staff_id_fkey` (`staff_id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `document`
--

INSERT INTO `document` (`document_id`, `document_type_id`, `file_path`, `document_status`, `remarks`, `submitted_at`, `booking_id`, `staff_id`) VALUES
(1, 1, 'docs/request_letter_booking1.pdf', 'Verified', 'Governor approved the request letter for Recognition Ceremony', '2026-03-02 02:30:00.000', 1, 4),
(2, 5, 'docs/receipt_booking2.pdf', 'Awaiting Submission', 'Initial 50 percent payment receipt must be submitted 7 days before the event', '2026-03-03 03:25:00.000', 2, NULL),
(3, 4, 'docs/billing_booking2.pdf', 'Pending', 'Please resubmit billing statement with complete breakdown of charges', '2026-03-03 03:20:00.000', 2, 2),
(4, 2, 'docs/contract_booking1.pdf', 'Verified', 'Contract of lease issued by Local Treasury Operations Officer', '2026-03-05 02:35:00.000', 1, 2),
(5, 3, 'docs/cert_booking1.pdf', 'Verified', 'Certification issued by Provincial Treasurers Office', '2026-03-05 02:40:00.000', 1, 2);

-- --------------------------------------------------------

--
-- Table structure for table `documenttype`
--

DROP TABLE IF EXISTS `documenttype`;
CREATE TABLE IF NOT EXISTS `documenttype` (
  `document_type_id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`document_type_id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `documenttype`
--

INSERT INTO `documenttype` (`document_type_id`, `type`) VALUES
(1, 'Billing Statement'),
(2, 'Contract of Lease'),
(3, 'Certification'),
(4, 'Request Letter'),
(5, 'Official Receipt');

-- --------------------------------------------------------

--
-- Table structure for table `facility`
--

DROP TABLE IF EXISTS `facility`;
CREATE TABLE IF NOT EXISTS `facility` (
  `facility_id` int NOT NULL AUTO_INCREMENT,
  `facility_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `rate_id` int NOT NULL,
  `status_id` int NOT NULL,
  `venue_id` int NOT NULL,
  PRIMARY KEY (`facility_id`),
  KEY `Facility_rate_id_fkey` (`rate_id`),
  KEY `Facility_status_id_fkey` (`status_id`),
  KEY `Facility_venue_id_fkey` (`venue_id`)
) ENGINE=MyISAM AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `facility`
--

INSERT INTO `facility` (`facility_id`, `facility_name`, `description`, `rate_id`, `status_id`, `venue_id`) VALUES
(1, 'Gym Lobby', 'Event space suitable for small gatherings, exhibits, and formal registrations', 4, 2, 1),
(2, 'Stage Area', 'Stage area for cultural presentations and program performances', 3, 3, 1),
(3, 'Basketball Court', 'Court for basketball games with shot clock support', 2, 2, 1),
(4, 'Track Oval', 'Used for jogging or sprints', 5, 1, 2),
(5, 'South Cotabato Gymnasium and Cultural Center', 'Primary venue located at 26 Rafael Alunan Avenue Zone IV Koronadal City South Cotabato', 1, 1, 1),
(6, 'New', 'sfefsdf', 2, 2, 1),
(7, 'gjhg', 'gjdftutf', 1, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `facilityimage`
--

DROP TABLE IF EXISTS `facilityimage`;
CREATE TABLE IF NOT EXISTS `facilityimage` (
  `facility_image_id` int NOT NULL AUTO_INCREMENT,
  `image` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `facility_id` int NOT NULL,
  PRIMARY KEY (`facility_image_id`),
  KEY `FacilityImage_facility_id_fkey` (`facility_id`)
) ENGINE=MyISAM AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `facilityimage`
--

INSERT INTO `facilityimage` (`facility_image_id`, `image`, `facility_id`) VALUES
(1, 'scgcc_main.jpg', 1),
(2, 'scgcc_side.jpg', 1),
(3, 'scgcc_front.jpg', 1),
(4, 'basketball_court.jpg', 2),
(5, 'stage_area.jpg', 3),
(6, 'gym_lobby.jpg', 4),
(7, 'track_oval.jpg', 5);

-- --------------------------------------------------------

--
-- Table structure for table `facilityrate`
--

DROP TABLE IF EXISTS `facilityrate`;
CREATE TABLE IF NOT EXISTS `facilityrate` (
  `rate_id` int NOT NULL AUTO_INCREMENT,
  `day_rate` decimal(10,2) NOT NULL,
  `night_rate` decimal(10,2) NOT NULL,
  PRIMARY KEY (`rate_id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `facilityrate`
--

INSERT INTO `facilityrate` (`rate_id`, `day_rate`, `night_rate`) VALUES
(1, 1500.00, 2000.00),
(2, 20000.00, 25000.00),
(3, 20000.00, 25000.00),
(4, 1000.00, 1500.00),
(5, 3000.00, 3000.00);

-- --------------------------------------------------------

--
-- Table structure for table `facilityvenue`
--

DROP TABLE IF EXISTS `facilityvenue`;
CREATE TABLE IF NOT EXISTS `facilityvenue` (
  `venue_id` int NOT NULL AUTO_INCREMENT,
  `venue` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`venue_id`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `facilityvenue`
--

INSERT INTO `facilityvenue` (`venue_id`, `venue`) VALUES
(1, 'South Cotabato Gymnasium and Cultural Center'),
(2, 'South Cotabato Sports Complex');

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
CREATE TABLE IF NOT EXISTS `inventory` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `item_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `unit_cost` decimal(10,2) NOT NULL,
  `quantity_available` int NOT NULL,
  `venue_id` int NOT NULL,
  `status_id` int NOT NULL,
  `particular_id` int NOT NULL,
  PRIMARY KEY (`item_id`),
  KEY `Inventory_venue_id_fkey` (`venue_id`),
  KEY `Inventory_status_id_fkey` (`status_id`),
  KEY `Inventory_particular_id_fkey` (`particular_id`)
) ENGINE=MyISAM AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `inventory`
--

INSERT INTO `inventory` (`item_id`, `item_name`, `description`, `unit_cost`, `quantity_available`, `venue_id`, `status_id`, `particular_id`) VALUES
(1, 'Hurdles', 'A physical barrier jumped over in athletic races', 5.00, 75, 2, 1, 1),
(2, 'Wired Microphone', 'Wired microphone for program presentations 10 units available', 1200.00, 10, 1, 1, 4),
(3, 'Table', 'Standard rectangular table for events up to 8 units available', 258.00, 8, 1, 2, 2),
(4, 'Chair', 'Plastic monoblock chair for seating arrangements up to 700 units available', 5.00, 700, 1, 1, 1),
(5, 'Compressor', 'Air conditioning system suitable for events with a capacity of 250 per pax.', 800.00, 10, 1, 3, 6),
(6, 'Wireless Microphone', 'Wireless handheld microphone for program presentations 4 units available', 1200.00, 4, 1, 1, 3),
(7, 'LED Wall', 'LED wall composed of 117 panels available for visual display during events', 20000.00, 1, 1, 2, 5);

-- --------------------------------------------------------

--
-- Table structure for table `letterstatus`
--

DROP TABLE IF EXISTS `letterstatus`;
CREATE TABLE IF NOT EXISTS `letterstatus` (
  `letter_id` int NOT NULL AUTO_INCREMENT,
  `letter_remarks` text COLLATE utf8mb4_unicode_ci,
  `updated_at` datetime(3) NOT NULL,
  `reservation_id` int NOT NULL,
  `approval_status_id` int NOT NULL,
  `staff_id` int DEFAULT NULL,
  PRIMARY KEY (`letter_id`),
  KEY `LetterStatus_reservation_id_fkey` (`reservation_id`),
  KEY `LetterStatus_approval_status_id_fkey` (`approval_status_id`),
  KEY `LetterStatus_staff_id_fkey` (`staff_id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `letterstatus`
--

INSERT INTO `letterstatus` (`letter_id`, `letter_remarks`, `updated_at`, `reservation_id`, `approval_status_id`, `staff_id`) VALUES
(1, 'Request letter for Basketball Tournament declined due to incomplete event details', '2026-03-08 05:00:00.000', 4, 3, 4),
(2, 'Private clients are not required to submit a request letter to the Governor\'s Office', '2026-03-07 03:00:00.000', 2, 3, 4),
(3, 'Request letter for Provincial Government Assembly is currently under review by Governor\'s Office. Review takes 3 days', '2026-03-06 02:00:00.000', 5, 2, NULL),
(4, 'Governor approved the request letter for Cultural Festival. Letter forwarded to Provincial Treasurer\'s Office', '2026-03-05 01:00:00.000', 3, 1, 4),
(5, 'Governor approved the request letter for Recognition Ceremony. Endorsed to Provincial Treasurer\'s Office', '2026-03-04 06:00:00.000', 1, 1, 4);

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

DROP TABLE IF EXISTS `notification`;
CREATE TABLE IF NOT EXISTS `notification` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `sent_at` datetime(3) NOT NULL,
  `staff_id` int NOT NULL,
  `client_id` int NOT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `Notification_staff_id_fkey` (`staff_id`),
  KEY `Notification_client_id_fkey` (`client_id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notification`
--

INSERT INTO `notification` (`notification_id`, `message`, `sent_at`, `staff_id`, `client_id`) VALUES
(1, 'Your signed Contract of Lease is ready at the Provincial Treasurer\'s Office.', '2026-04-07 06:20:00.000', 4, 4),
(2, 'The Certification for your event has been processed and is ready for claiming.', '2026-04-07 02:15:00.000', 4, 3),
(3, 'Please proceed to the Provincial Treasurer\'s Office to claim your Certification.', '2026-04-07 03:00:00.000', 4, 5),
(4, 'Your Certification is ready to be claimed at the Provincial Treasurer\'s Office.', '2026-04-07 00:00:00.000', 4, 1),
(5, 'Your Certification is ready to be claimed at the Provincial Treasurer\'s Office.', '2026-04-07 00:00:00.000', 4, 2);

-- --------------------------------------------------------

--
-- Table structure for table `package`
--

DROP TABLE IF EXISTS `package`;
CREATE TABLE IF NOT EXISTS `package` (
  `package_id` int NOT NULL AUTO_INCREMENT,
  `package_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `day_rate` decimal(10,2) DEFAULT NULL,
  `night_rate` decimal(10,2) DEFAULT NULL,
  `led_wall_day_rate` decimal(10,2) DEFAULT NULL,
  `led_wall_night_rate` decimal(10,2) DEFAULT NULL,
  `time_slot_id` int NOT NULL,
  PRIMARY KEY (`package_id`),
  KEY `Package_time_slot_id_fkey` (`time_slot_id`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `package`
--

INSERT INTO `package` (`package_id`, `package_name`, `day_rate`, `night_rate`, `led_wall_day_rate`, `led_wall_night_rate`, `time_slot_id`) VALUES
(1, 'Standard Day Package', 55000.00, NULL, NULL, NULL, 1),
(2, 'LED Wall Day Package', NULL, NULL, 80000.00, NULL, 1),
(3, 'Standard Night Package', NULL, 60000.00, NULL, NULL, 2),
(4, 'LED Wall Night Package', NULL, NULL, NULL, 85000.00, 2);

-- --------------------------------------------------------

--
-- Table structure for table `packageinclusion`
--

DROP TABLE IF EXISTS `packageinclusion`;
CREATE TABLE IF NOT EXISTS `packageinclusion` (
  `package_inclusion_id` int NOT NULL AUTO_INCREMENT,
  `quantity_available` int NOT NULL,
  `package_id` int NOT NULL,
  `item_id` int NOT NULL,
  PRIMARY KEY (`package_inclusion_id`),
  KEY `PackageInclusion_package_id_fkey` (`package_id`),
  KEY `PackageInclusion_item_id_fkey` (`item_id`)
) ENGINE=MyISAM AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `packageinclusion`
--

INSERT INTO `packageinclusion` (`package_inclusion_id`, `quantity_available`, `package_id`, `item_id`) VALUES
(1, 700, 1, 1),
(2, 8, 1, 2),
(3, 4, 1, 3),
(4, 1, 1, 4),
(5, 700, 2, 1),
(6, 8, 2, 2),
(7, 4, 2, 3),
(8, 1, 2, 4),
(9, 700, 3, 1),
(10, 8, 3, 2),
(11, 4, 3, 3),
(12, 1, 3, 4),
(13, 700, 4, 1),
(14, 8, 4, 2),
(15, 4, 4, 3),
(16, 1, 4, 4);

-- --------------------------------------------------------

--
-- Table structure for table `particular`
--

DROP TABLE IF EXISTS `particular`;
CREATE TABLE IF NOT EXISTS `particular` (
  `particular_id` int NOT NULL AUTO_INCREMENT,
  `particular_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`particular_id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `particular`
--

INSERT INTO `particular` (`particular_id`, `particular_name`, `description`) VALUES
(1, 'Wireless Microphone', 'Wireless handheld microphone for program presentations 4 units available'),
(2, 'Wired Microphone', 'Wired microphone for program presentations 10 units available'),
(3, 'Table', 'Standard rectangular table for events up to 8 units available'),
(4, 'LED Wall', 'LED wall composed of 117 panels available for visual display during events'),
(5, 'Chair', 'Plastic monoblock chair for seating arrangements up to 700 units available'),
(6, 'Compressor', 'Air conditioning system suitable for events with a capacity of 250 per pax.');

-- --------------------------------------------------------

--
-- Table structure for table `payment`
--

DROP TABLE IF EXISTS `payment`;
CREATE TABLE IF NOT EXISTS `payment` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `amount_paid` decimal(10,2) NOT NULL,
  `payment_status_id` int NOT NULL,
  `staff_id` int DEFAULT NULL,
  `booking_id` int NOT NULL,
  PRIMARY KEY (`payment_id`),
  KEY `Payment_payment_status_id_fkey` (`payment_status_id`),
  KEY `Payment_staff_id_fkey` (`staff_id`),
  KEY `Payment_booking_id_fkey` (`booking_id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payment`
--

INSERT INTO `payment` (`payment_id`, `amount_paid`, `payment_status_id`, `staff_id`, `booking_id`) VALUES
(1, 30000.00, 3, 4, 3),
(2, 27500.00, 1, 4, 2),
(3, 27500.00, 2, 4, 4),
(4, 27500.00, 3, 4, 1),
(5, 55000.00, 1, 4, 5);

-- --------------------------------------------------------

--
-- Table structure for table `paymentstatus`
--

DROP TABLE IF EXISTS `paymentstatus`;
CREATE TABLE IF NOT EXISTS `paymentstatus` (
  `status_id` int NOT NULL AUTO_INCREMENT,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`status_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `paymentstatus`
--

INSERT INTO `paymentstatus` (`status_id`, `status`) VALUES
(1, 'Paid'),
(2, 'Partial'),
(3, 'Unpaid');

-- --------------------------------------------------------

--
-- Table structure for table `reservation`
--

DROP TABLE IF EXISTS `reservation`;
CREATE TABLE IF NOT EXISTS `reservation` (
  `reservation_id` int NOT NULL AUTO_INCREMENT,
  `event_date` date NOT NULL,
  `event_type` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reservation_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `submitted_at` datetime(3) NOT NULL,
  `venue_id` int NOT NULL,
  `client_id` int NOT NULL,
  `package_id` int DEFAULT NULL,
  `time_slot_id` int NOT NULL,
  PRIMARY KEY (`reservation_id`),
  KEY `Reservation_venue_id_fkey` (`venue_id`),
  KEY `Reservation_client_id_fkey` (`client_id`),
  KEY `Reservation_package_id_fkey` (`package_id`),
  KEY `Reservation_time_slot_id_fkey` (`time_slot_id`)
) ENGINE=MyISAM AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reservation`
--

INSERT INTO `reservation` (`reservation_id`, `event_date`, `event_type`, `reservation_status`, `submitted_at`, `venue_id`, `client_id`, `package_id`, `time_slot_id`) VALUES
(1, '2026-04-10', 'Recognition Ceremony', 'Approved', '2026-03-01 01:00:00.000', 1, 1, NULL, 1),
(2, '2026-05-12', 'Music Concert', 'Approved', '2026-03-12 02:00:00.000', 1, 3, NULL, 2),
(3, '2026-04-15', 'Corporate Dinner', 'Pending', '2026-03-02 02:30:00.000', 1, 2, NULL, 2),
(4, '2026-05-18', 'Provincial Meeting', 'Pending', '2026-03-15 01:00:00.000', 1, 5, NULL, 1),
(5, '2026-05-08', 'Barangay Basketball League', 'Approved', '2026-03-08 01:00:00.000', 2, 2, NULL, 1),
(6, '2026-05-01', 'Provincial Government Assembly', 'Pending', '2026-03-05 06:00:00.000', 2, 5, 1, 1),
(7, '2026-05-29', 'Badminton Championship', 'Approved', '2026-03-18 00:30:00.000', 2, 4, NULL, 1),
(8, '2026-05-05', 'Art Exhibit Opening', 'Approved', '2026-03-10 00:00:00.000', 1, 1, NULL, 1),
(9, '2026-04-25', 'Stage Play Rehearsal', 'Declined', '2026-03-04 03:00:00.000', 1, 4, NULL, 1),
(10, '2026-04-20', 'Cultural Festival', 'Approved', '2026-03-03 00:45:00.000', 1, 3, NULL, 1),
(11, '2026-05-22', 'Track and Field Event', 'Pending', '2026-03-14 03:00:00.000', 2, 1, NULL, 2),
(12, '2026-05-15', 'Inter-School Volleyball Tournament', 'Approved', '2026-03-11 02:00:00.000', 2, 3, NULL, 1),
(13, '2026-06-05', 'Zumba Fitness Festival', 'Pending', '2026-03-20 01:00:00.000', 2, 2, NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `reservedparticular`
--

DROP TABLE IF EXISTS `reservedparticular`;
CREATE TABLE IF NOT EXISTS `reservedparticular` (
  `reserved_particular_id` int NOT NULL AUTO_INCREMENT,
  `quantity` int NOT NULL,
  `reservation_id` int NOT NULL,
  `particular_id` int NOT NULL,
  PRIMARY KEY (`reserved_particular_id`),
  KEY `ReservedParticular_reservation_id_fkey` (`reservation_id`),
  KEY `ReservedParticular_particular_id_fkey` (`particular_id`)
) ENGINE=MyISAM AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reservedparticular`
--

INSERT INTO `reservedparticular` (`reserved_particular_id`, `quantity`, `reservation_id`, `particular_id`) VALUES
(1, 100, 1, 1),
(2, 2, 1, 4),
(3, 200, 2, 1),
(4, 2, 2, 2),
(5, 150, 3, 1),
(6, 4, 3, 2),
(7, 4, 3, 3),
(8, 700, 4, 1),
(9, 1, 4, 5);

-- --------------------------------------------------------

--
-- Table structure for table `schedule`
--

DROP TABLE IF EXISTS `schedule`;
CREATE TABLE IF NOT EXISTS `schedule` (
  `schedule_id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `reservation_id` int DEFAULT NULL,
  `booking_id` int DEFAULT NULL,
  `facility_id` int NOT NULL,
  PRIMARY KEY (`schedule_id`),
  KEY `Schedule_client_id_fkey` (`client_id`),
  KEY `Schedule_reservation_id_fkey` (`reservation_id`),
  KEY `Schedule_booking_id_fkey` (`booking_id`),
  KEY `Schedule_facility_id_fkey` (`facility_id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `schedule`
--

INSERT INTO `schedule` (`schedule_id`, `client_id`, `reservation_id`, `booking_id`, `facility_id`) VALUES
(1, 4, NULL, 4, 4),
(2, 3, NULL, 3, 3),
(3, 2, 2, NULL, 2),
(4, 5, 5, NULL, 1),
(5, 1, 1, NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
CREATE TABLE IF NOT EXISTS `staff` (
  `staff_id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `middle_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `profile_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `staff_role_id` int NOT NULL,
  `staff_org_id` int NOT NULL,
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `Staff_email_key` (`email`),
  KEY `Staff_staff_role_id_fkey` (`staff_role_id`),
  KEY `Staff_staff_org_id_fkey` (`staff_org_id`)
) ENGINE=MyISAM AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `staff`
--

INSERT INTO `staff` (`staff_id`, `first_name`, `middle_name`, `last_name`, `email`, `contact_number`, `password`, `status`, `profile_photo`, `staff_role_id`, `staff_org_id`) VALUES
(1, 'Maria', NULL, 'Santos', 'admin@scgcc.gov.ph', '09171234567', '********', 'Active', 'photo1.jpg', 1, 1),
(2, 'Juan', NULL, 'Dela Cruz', 'coordinator@scgcc.gov.ph', '09182345678', '********', 'Active', 'photo2.jpg', 3, 1),
(3, 'Rosa', NULL, 'Reyes', 'clerk@scgcc.gov.ph', '09193456789', '********', 'Active', 'photo3.jpg', 2, 2),
(4, 'Pedro', NULL, 'Lim', 'ltoo@scgcc.gov.ph', '09204567890', '********', 'Active', 'photo4.jpg', 4, 2),
(5, 'Ana', NULL, 'Gonzales', 'ana.gonzales@scgcc.gov.ph', '09215678901', '********', 'Active', 'photo5.jpg', 3, 3),
(7, 'Admin', NULL, 'Admin', 'admin', '00000000000', '$2b$12$ItpZ3JKiR2zi9puStSwlHOMjm0WpiTlL6bvTiD5CcYt5dJoBE1LLW', 'Active', NULL, 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `stafforganization`
--

DROP TABLE IF EXISTS `stafforganization`;
CREATE TABLE IF NOT EXISTS `stafforganization` (
  `staff_org_id` int NOT NULL AUTO_INCREMENT,
  `org_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`staff_org_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `stafforganization`
--

INSERT INTO `stafforganization` (`staff_org_id`, `org_name`) VALUES
(1, 'South Cotabato Sports Complex'),
(2, 'South Cotabato Gymnasium and Cultural Center'),
(3, 'Provincial Treasurer\'s Office');

-- --------------------------------------------------------

--
-- Table structure for table `staffrole`
--

DROP TABLE IF EXISTS `staffrole`;
CREATE TABLE IF NOT EXISTS `staffrole` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`role_id`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `staffrole`
--

INSERT INTO `staffrole` (`role_id`, `role_name`) VALUES
(1, 'Program Coordinator'),
(2, 'Admin'),
(3, 'Accounting Clerk'),
(4, 'Local Treasury Operations Officer');

-- --------------------------------------------------------

--
-- Table structure for table `timeslot`
--

DROP TABLE IF EXISTS `timeslot`;
CREATE TABLE IF NOT EXISTS `timeslot` (
  `time_slot_id` int NOT NULL AUTO_INCREMENT,
  `start_time` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `end_time` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`time_slot_id`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `timeslot`
--

INSERT INTO `timeslot` (`time_slot_id`, `start_time`, `end_time`) VALUES
(1, '08:00 AM', '05:00 PM'),
(2, '05:00 PM', '11:00 PM');

-- --------------------------------------------------------

--
-- Table structure for table `transaction`
--

DROP TABLE IF EXISTS `transaction`;
CREATE TABLE IF NOT EXISTS `transaction` (
  `transaction_id` int NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_date` datetime(3) NOT NULL,
  `recorded_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `booking_id` int NOT NULL,
  `payment_id` int NOT NULL,
  PRIMARY KEY (`transaction_id`),
  KEY `Transaction_booking_id_fkey` (`booking_id`),
  KEY `Transaction_payment_id_fkey` (`payment_id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transaction`
--

INSERT INTO `transaction` (`transaction_id`, `receipt_number`, `payment_date`, `recorded_by`, `booking_id`, `payment_id`) VALUES
(1, 'OR-2026-005', '2026-03-07 00:00:00.000', 'Local Treasury Operations Officer', 4, 3),
(2, 'OR-2026-001', '2026-03-01 00:00:00.000', 'Local Treasury Operations Officer', 4, 1),
(3, 'OR-2026-002', '2026-03-03 00:00:00.000', 'Local Treasury Operations Officer', 4, 2),
(4, 'OR-2026-003', '2026-03-02 00:00:00.000', 'Local Treasury Operations Officer', 4, 3),
(5, 'OR-2026-004', '2026-03-05 00:00:00.000', 'Local Treasury Operations Officer', 4, 4);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
