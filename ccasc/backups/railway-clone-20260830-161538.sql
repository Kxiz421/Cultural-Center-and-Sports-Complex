-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: tramway.proxy.rlwy.net    Database: railway
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Announcement`
--

DROP TABLE IF EXISTS `Announcement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Announcement` (
  `announcement_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_posted` datetime(3) NOT NULL,
  `staff_id` int NOT NULL,
  `status_id` int NOT NULL,
  PRIMARY KEY (`announcement_id`),
  KEY `Announcement_staff_id_fkey` (`staff_id`),
  KEY `Announcement_status_id_fkey` (`status_id`),
  CONSTRAINT `Announcement_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff` (`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Announcement_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `AnnouncementStatus` (`status_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Announcement`
--

LOCK TABLES `Announcement` WRITE;
/*!40000 ALTER TABLE `Announcement` DISABLE KEYS */;
INSERT INTO `Announcement` VALUES (1,'Main Gymnasium Maintenance Schedule','The Main Gymnasium will undergo routine maintenance and cleaning on April 5 2026. No bookings will be accommodated on this date.','All','2026-01-01 16:00:00.000',1,1),(2,'Air Conditioning Unit Inspection Notice','All air conditioning units in the South Cotabato Gymnasium and Cultural Center will be inspected and serviced on April 8 2026.','All','2026-01-01 16:00:00.000',1,1),(3,'LED Wall Maintenance Advisory','The LED Wall composed of 117 panels will be undergoing calibration and maintenance on April 12 2026. Reservations requiring the LED Wall on this date will not be accommodated.','Clients','2026-01-01 16:00:00.000',1,1),(4,'Restroom Renovation Notice','Restroom facilities will be temporarily closed for renovation from April 15 to April 17 2026. Alternative arrangements will be provided for confirmed bookings.','All','2026-01-01 16:00:00.000',1,1),(5,'Lights and Sound System Check','The lights and sound system including the 12 PAR64 lights and microphone equipment will be tested and serviced on April 20 2026.','Staff','2026-01-01 16:00:00.000',1,3);
/*!40000 ALTER TABLE `Announcement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `AnnouncementStatus`
--

DROP TABLE IF EXISTS `AnnouncementStatus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AnnouncementStatus` (
  `status_id` int NOT NULL AUTO_INCREMENT,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AnnouncementStatus`
--

LOCK TABLES `AnnouncementStatus` WRITE;
/*!40000 ALTER TABLE `AnnouncementStatus` DISABLE KEYS */;
INSERT INTO `AnnouncementStatus` VALUES (1,'Active'),(2,'Archived'),(3,'Inactive');
/*!40000 ALTER TABLE `AnnouncementStatus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ApprovalStatus`
--

DROP TABLE IF EXISTS `ApprovalStatus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ApprovalStatus` (
  `approval_status_id` int NOT NULL AUTO_INCREMENT,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`approval_status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ApprovalStatus`
--

LOCK TABLES `ApprovalStatus` WRITE;
/*!40000 ALTER TABLE `ApprovalStatus` DISABLE KEYS */;
INSERT INTO `ApprovalStatus` VALUES (1,'Declined'),(2,'Pending'),(3,'Approved');
/*!40000 ALTER TABLE `ApprovalStatus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `AuditLog`
--

DROP TABLE IF EXISTS `AuditLog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AuditLog` (
  `audit_log_id` int NOT NULL AUTO_INCREMENT,
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_user_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `performed_by_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `performed_by_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`audit_log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AuditLog`
--

LOCK TABLES `AuditLog` WRITE;
/*!40000 ALTER TABLE `AuditLog` DISABLE KEYS */;
INSERT INTO `AuditLog` VALUES (1,'CREATED','STF-12','LTOO User','STF-7','Admin Admin','Account created as staff','2026-01-01 16:00:00.000'),(2,'CREATED','STF-13','Program Cultural','STF-7','Admin Admin','Account created as staff','2026-01-01 16:00:00.000'),(3,'UPDATED','STF-13','Program Cultural','STF-7','Admin Admin','Account details updated','2026-01-01 16:00:00.000'),(4,'CREATED','STF-14','Program Coordinator Cultural','STF-7','Admin Admin','Account created as staff','2026-01-01 16:00:00.000'),(5,'CREATED','CLT-14','Client User','STF-7','Admin Admin','Account created as client','2026-01-01 16:00:00.000'),(6,'CREATED','STF-15','Program SC','STF-7','Admin Admin','Account created as staff','2026-01-01 16:00:00.000'),(7,'CREATED','STF-16','Accounting Clerk','STF-7','Admin Admin','Account created as staff','2026-01-01 16:00:00.000'),(8,'CREATED','STF-17','accounting test','STF-7','Admin Admin','Account created as staff','2026-01-01 16:00:00.000'),(9,'UPDATED','PKG-2','LED Wall Day Package','STF-7','Admin Admin','Package updated: description updated; inclusions updated','2026-01-01 16:00:00.000'),(10,'UPDATED','PKG-2','LED Wall Day Package','STF-7','Admin Admin','Package updated: description updated; day rate: ₱0 → ₱80,000; inclusions updated','2026-01-01 16:00:00.000'),(11,'UPDATED','PKG-4','LED Wall Night Package','STF-7','Admin Admin','Package updated: description updated; night rate: ₱0 → ₱85,000; inclusions updated','2026-01-01 16:00:00.000'),(12,'PAYMENT_RECORDED','PAY-10','Client User','STF-12','LTOO User','Payment of 50000 recorded. OR: OR-2026-4277. Status: Partially Paid','2026-01-01 16:00:00.000'),(13,'PAYMENT_RECORDED','PAY-11','Client User','STF-12','LTOO User','Payment of 5000 recorded. OR: OR-2026-6126. Status: Fully Paid','2026-01-01 16:00:00.000'),(14,'PAYMENT_RECORDED','PAY-12','Client User','STF-12','LTOO User','Payment of 55000 recorded. OR: OR-2026-4505. Status: Fully Paid','2026-01-01 16:00:00.000'),(15,'UPDATED','CLT-9','Provincial Agencies','STF-7','Admin Admin','Account details and password updated','2026-01-01 16:00:00.000'),(16,'ACTIVATED','CLT-16','Dan Lee','STF-7','Admin Admin','Account status changed to Active','2026-01-01 16:00:00.000'),(17,'DEACTIVATED','CLT-16','Dan Lee','STF-7','Admin Admin','Account status changed to Deactivated','2026-01-01 16:00:00.000'),(18,'UPDATED','CLT-9','Provincial Agencies','STF-7','Admin Admin','Account details and password updated','2026-01-01 16:00:00.000'),(19,'PAYMENT_RECORDED','PAY-13','Provincial Agencies','STF-12','LTOO User','Payment of 55000 recorded. OR: OR-2026-9868. Status: Fully Paid','2026-01-01 16:00:00.000'),(20,'PAYMENT_RECORDED','PAY-14','Client User','STF-12','LTOO User','Payment of 10000 recorded. OR: OR-2026-1085. Status: Partially Paid','2026-01-01 16:00:00.000'),(21,'PAYMENT_RECORDED','PAY-15','Client User','STF-12','LTOO User','Payment of 50000 recorded. OR: OR-2026-7799. Status: Fully Paid','2026-01-01 16:00:00.000'),(22,'PAYMENT_RECORDED','PAY-16','Client User','STF-12','LTOO User','Payment of 55000 recorded. OR: OR-2026-7443. Status: Fully Paid','2026-01-01 16:00:00.000'),(23,'PAYMENT_RECORDED','PAY-17','Client User','STF-12','LTOO User','Payment of 40000 recorded. OR: OR-2026-5834. Status: Partially Paid','2026-01-01 16:00:00.000'),(24,'PAYMENT_RECORDED','PAY-18','Client User','STF-12','LTOO User','Payment of 45000 recorded. OR: OR-2026-8953. Status: Fully Paid','2026-01-01 16:00:00.000'),(25,'PAYMENT_RECORDED','PAY-19','Client User','STF-12','LTOO User','Payment of 55000 recorded. OR: OR-2026-7324. Status: Fully Paid','2026-01-01 16:00:00.000'),(26,'PAYMENT_RECORDED','PAY-20','Client User','STF-12','LTOO User','Payment of 137837 recorded. OR: OR-2026-8455. Status: Fully Paid','2026-01-01 16:00:00.000'),(27,'PAYMENT_RECORDED','PAY-21','Client User','STF-12','LTOO User','Payment of 100000 recorded. OR: OR-2026-8265. Status: Partially Paid','2026-01-01 16:00:00.000'),(28,'PAYMENT_RECORDED','PAY-22','Client User','STF-12','LTOO User','Payment of 6085.8 recorded. OR: OR-2026-2717. Status: Partially Paid','2026-01-01 16:00:00.000'),(29,'PAYMENT_RECORDED','PAY-23','Client User','STF-12','LTOO User','Payment of 1000 recorded. OR: OR-2026-5970. Status: Fully Paid','2026-01-01 16:00:00.000'),(30,'PAYMENT_RECORDED','PAY-24','Shen Albania','STF-12','LTOO User','Payment of 810000 recorded. OR: OR-2026-3602. Status: Partially Paid','2026-01-01 16:00:00.000'),(31,'PAYMENT_RECORDED','PAY-25','Client User','STF-12','LTOO User','Payment of 2000 recorded. OR: OR-2026-7811. Status: Partially Paid','2026-01-01 16:00:00.000'),(32,'PAYMENT_RECORDED','PAY-26','Client User','STF-12','LTOO User','Payment of 7000 recorded. OR: OR-2026-4450. Status: Fully Paid','2026-01-01 16:00:00.000'),(33,'PAYMENT_RECORDED','PAY-27','Client User','STF-12','LTOO User','Payment of 1000 recorded. OR: OR-2026-2005. Status: Partially Paid','2026-01-01 16:00:00.000'),(34,'PAYMENT_RECORDED','PAY-28','Client User','STF-12','LTOO User','Payment of 44000 recorded. OR: OR-2026-8800. Status: Partially Paid','2026-01-01 16:00:00.000'),(35,'PAYMENT_RECORDED','PAY-29','Client User','STF-12','LTOO User','Payment of 11000 recorded. OR: OR-2026-6461. Status: Partially Paid','2026-01-01 16:00:00.000'),(36,'PAYMENT_RECORDED','PAY-30','Client User','STF-12','LTOO User','Payment of 44000 recorded. OR: OR-2026-9508. Status: Partially Paid','2026-01-01 16:00:00.000'),(37,'PAYMENT_RECORDED','PAY-31','Client User','STF-12','LTOO User','Payment of 19770 recorded. OR: OR-2026-1845. Status: Partially Paid','2026-01-01 16:00:00.000'),(38,'UPDATED','PKG-3','Standard Night Package','STF-7','Admin Admin','Package updated: description updated; inclusions updated','2026-01-01 16:00:00.000'),(39,'UPDATED','PKG-4','LED Wall Night Package','STF-7','Admin Admin','Package updated: description updated; inclusions updated','2026-01-01 16:00:00.000'),(40,'UPDATED','PKG-4','LED Wall Night Package','STF-7','Admin Admin','Package updated: description updated; inclusions updated','2026-01-01 16:00:00.000'),(41,'UPDATED','PKG-4','LED Wall Night Package','STF-7','Admin Admin','Package updated: description updated; inclusions updated','2026-01-01 16:00:00.000'),(42,'PAYMENT_RECORDED','PAY-32','Client User','STF-12','LTOO User','Payment of 11000 recorded. OR: OR-2026-3116. Status: Partially Paid','2026-01-01 16:00:00.000'),(43,'PAYMENT_RECORDED','PAY-33','Client User','STF-12','LTOO User','Payment of 100000 recorded. OR: OR-2026-1838. Status: Fully Paid','2026-01-01 16:00:00.000'),(44,'UPDATED','CLT-14','Client User','STF-7','Admin Admin','Account details and password updated','2026-08-24 06:44:02.000'),(45,'UPDATED','CLT-9','Provincial Agencies','STF-7','Admin Admin','Account details and password updated','2026-08-24 06:44:19.000'),(46,'PAYMENT_RECORDED','PAY-34','Client User','STF-12','LTOO User','Payment of 70000 recorded. OR: OR-2026-5397. Status: Partially Paid','2026-08-24 07:15:31.882'),(47,'PAYMENT_RECORDED','PAY-35','Client User','STF-12','LTOO User','Payment of 4000 recorded. OR: OR-2026-5896. Status: Partially Paid','2026-08-24 07:25:15.910'),(48,'PAYMENT_RECORDED','PAY-36','Client User','STF-12','LTOO User','Payment of 37055 recorded. OR: OR-2026-1295. Status: Partially Paid','2026-08-24 07:26:32.409'),(49,'PAYMENT_RECORDED','PAY-37','Client User','STF-12','LTOO User','Payment of 3 recorded. OR: OR-2026-1984. Status: Fully Paid','2026-08-24 07:26:47.459'),(50,'PAYMENT_RECORDED','PAY-38','Client User','STF-12','LTOO User','Payment of 4444 recorded. OR: OR-2026-7880. Status: Partially Paid','2026-08-25 06:30:33.249'),(51,'PAYMENT_RECORDED','PAY-39','Client User','STF-12','LTOO User','Payment of 1222 recorded. OR: OR-2026-4593. Status: Partially Paid','2026-08-25 06:30:52.652'),(52,'PAYMENT_RECORDED','PAY-40','Client User','STF-12','LTOO User','Payment of 8618.8 recorded. OR: OR-2026-5161. Status: Fully Paid','2026-08-25 06:31:00.987'),(53,'PAYMENT_RECORDED','PAY-41','Client User','STF-12','LTOO User','Payment of 1000 recorded. OR: OR-2026-5457. Status: Partially Paid','2026-08-25 06:38:53.710'),(54,'PAYMENT_RECORDED','PAY-42','Client User','STF-12','LTOO User','Payment of 1000 recorded. OR: OR-2026-9243. Status: Partially Paid','2026-08-25 06:43:54.456'),(55,'PAYMENT_RECORDED','PAY-43','Client User','STF-12','LTOO User','Payment of 55000 recorded. OR: OR-2026-7959. Status: Partially Paid','2026-08-25 07:01:30.393'),(56,'PAYMENT_RECORDED','PAY-44','Client User','STF-12','LTOO User','Payment of 122 recorded. OR: OR-2026-7344. Status: Partially Paid','2026-08-25 07:01:40.891'),(57,'PAYMENT_RECORDED','PAY-45','Client User','STF-12','LTOO User','Payment of 27500 recorded. OR: OR-2026-4958. Status: Partially Paid','2026-08-25 21:48:18.797'),(58,'PAYMENT_RECORDED','PAY-46','Client User','STF-12','LTOO User','Payment of 5500 recorded. OR: OR-2026-5619. Status: Partially Paid','2026-08-25 21:48:47.786'),(59,'PAYMENT_RECORDED','PAY-47','Client User','STF-12','LTOO User','Payment of 27500 recorded. OR: OR-2026-3575. Status: Fully Paid','2026-08-25 21:58:42.329'),(60,'PAYMENT_RECORDED','PAY-48','Client User','STF-12','LTOO User','Payment of 12525 recorded. OR: OR-2026-6356. Status: Partially Paid','2026-08-26 06:11:00.048'),(61,'PAYMENT_RECORDED','PAY-49','Client User','STF-12','LTOO User','Payment of 2505 recorded. OR: OR-2026-3946. Status: Partially Paid','2026-08-26 06:11:14.279'),(62,'PAYMENT_RECORDED','PAY-50','Client User','STF-12','LTOO User','Payment of 12524 recorded. OR: OR-2026-8088. Status: Partially Paid','2026-08-26 06:11:37.056'),(63,'PAYMENT_RECORDED','PAY-51','Client User','STF-12','LTOO User','Payment of 0.1 recorded. OR: OR-2026-5881. Status: Partially Paid','2026-08-26 06:11:45.336'),(64,'PAYMENT_RECORDED','PAY-52','Client User','STF-12','LTOO User','Payment of 0.9 recorded. OR: OR-2026-2509. Status: Fully Paid','2026-08-26 06:11:55.090'),(65,'PAYMENT_RECORDED','PAY-53','Client User','STF-12','LTOO User','Payment of 40575 recorded. OR: OR-2026-2088. Status: Partially Paid','2026-08-26 06:48:34.554'),(66,'PAYMENT_RECORDED','PAY-54','Client User','STF-12','LTOO User','Payment of 8115 recorded. OR: OR-2026-3004. Status: Partially Paid','2026-08-26 06:48:45.898'),(67,'PAYMENT_RECORDED','PAY-55','Client User','STF-12','LTOO User','Payment of 40575 recorded. OR: OR-2026-4322. Status: Fully Paid','2026-08-26 06:58:08.939'),(68,'PAYMENT_RECORDED','PAY-56','Client User','STF-12','LTOO User','Payment of 5500 recorded. OR: OR-2026-8924. Status: Partially Paid','2026-08-26 07:10:36.624'),(69,'PAYMENT_RECORDED','PAY-57','Client User','STF-12','LTOO User','Payment of 27500 recorded. OR: OR-2026-3199. Status: Partially Paid','2026-08-26 07:13:41.545'),(70,'PAYMENT_RECORDED','PAY-58','Client User','STF-12','LTOO User','Payment of 27500 recorded. OR: OR-2026-8769. Status: Fully Paid','2026-08-26 07:15:12.714'),(71,'PAYMENT_RECORDED','PAY-59','Client User','STF-12','LTOO User','Payment of 82500 recorded. OR: OR-2026-9715. Status: Partially Paid','2026-08-26 07:35:50.256'),(72,'PAYMENT_RECORDED','PAY-60','Client User','STF-12','LTOO User','Payment of 16500 recorded. OR: OR-2026-4028. Status: Partially Paid','2026-08-26 07:35:54.900'),(73,'PAYMENT_RECORDED','PAY-61','Client User','STF-12','LTOO User','Payment of 82500 recorded. OR: OR-2026-4332. Status: Fully Paid','2026-08-26 07:36:01.894'),(74,'PAYMENT_RECORDED','PAY-62','Client User','STF-12','LTOO User','Payment of 96000 recorded. OR: OR-2026-8155. Status: Partially Paid','2026-08-30 06:06:29.455'),(75,'PAYMENT_RECORDED','PAY-63','Client User','STF-12','LTOO User','Payment of ₱96,000.00 recorded for 50% down + 10% deposit. Status: Partially Paid','2026-08-30 06:22:14.677'),(76,'PAYMENT_RECORDED','PAY-64','Client User','STF-12','LTOO User','Payment of ₱48,756.00 recorded for 50% down + 10% deposit. Status: Partially Paid','2026-08-30 07:53:36.830'),(77,'PAYMENT_RECORDED','PAY-65','Client User','STF-12','LTOO User','Payment of ₱40,630.00 recorded for remaining balance. Status: Fully Paid','2026-08-30 07:54:22.345');
/*!40000 ALTER TABLE `AuditLog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `AvailabilityStatus`
--

DROP TABLE IF EXISTS `AvailabilityStatus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AvailabilityStatus` (
  `status_id` int NOT NULL AUTO_INCREMENT,
  `status_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AvailabilityStatus`
--

LOCK TABLES `AvailabilityStatus` WRITE;
/*!40000 ALTER TABLE `AvailabilityStatus` DISABLE KEYS */;
INSERT INTO `AvailabilityStatus` VALUES (1,'Archived'),(2,'Available'),(3,'Unavailable'),(4,'Under Maintenance');
/*!40000 ALTER TABLE `AvailabilityStatus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Booking`
--

DROP TABLE IF EXISTS `Booking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Booking` (
  `booking_id` int NOT NULL AUTO_INCREMENT,
  `confirmation_date` datetime(3) DEFAULT NULL,
  `reservation_id` int NOT NULL,
  `venue_id` int DEFAULT NULL,
  `booking_status_id` int NOT NULL,
  `staff_id` int DEFAULT NULL,
  PRIMARY KEY (`booking_id`),
  KEY `Booking_reservation_id_fkey` (`reservation_id`),
  KEY `Booking_venue_id_fkey` (`venue_id`),
  KEY `Booking_booking_status_id_fkey` (`booking_status_id`),
  KEY `Booking_staff_id_fkey` (`staff_id`),
  CONSTRAINT `Booking_booking_status_id_fkey` FOREIGN KEY (`booking_status_id`) REFERENCES `BookingStatus` (`booking_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Booking_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `Reservation` (`reservation_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Booking_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff` (`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Booking_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `FacilityVenue` (`venue_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Booking`
--

LOCK TABLES `Booking` WRITE;
/*!40000 ALTER TABLE `Booking` DISABLE KEYS */;
INSERT INTO `Booking` VALUES (29,'2026-08-30 07:53:33.635',64,1,2,12);
/*!40000 ALTER TABLE `Booking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `BookingStatus`
--

DROP TABLE IF EXISTS `BookingStatus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `BookingStatus` (
  `booking_status_id` int NOT NULL AUTO_INCREMENT,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`booking_status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `BookingStatus`
--

LOCK TABLES `BookingStatus` WRITE;
/*!40000 ALTER TABLE `BookingStatus` DISABLE KEYS */;
INSERT INTO `BookingStatus` VALUES (1,'Confirmed'),(2,'Cancelled'),(3,'Pending');
/*!40000 ALTER TABLE `BookingStatus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `CalendarBlock`
--

DROP TABLE IF EXISTS `CalendarBlock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CalendarBlock` (
  `block_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `block_date` date NOT NULL,
  `block_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `venue_id` int NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`block_id`),
  KEY `CalendarBlock_venue_id_fkey` (`venue_id`),
  CONSTRAINT `CalendarBlock_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `FacilityVenue` (`venue_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CalendarBlock`
--

LOCK TABLES `CalendarBlock` WRITE;
/*!40000 ALTER TABLE `CalendarBlock` DISABLE KEYS */;
/*!40000 ALTER TABLE `CalendarBlock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Client`
--

DROP TABLE IF EXISTS `Client`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Client` (
  `client_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `middle_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_proof` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `account_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `verification_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `profile_photo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp_expiration` datetime(3) DEFAULT NULL,
  `client_role_id` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_org_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`client_id`),
  UNIQUE KEY `Client_email_key` (`email`),
  UNIQUE KEY `Client_username_key` (`username`),
  KEY `Client_client_role_id_fkey` (`client_role_id`),
  KEY `Client_client_org_id_fkey` (`client_org_id`),
  CONSTRAINT `Client_client_org_id_fkey` FOREIGN KEY (`client_org_id`) REFERENCES `ClientOrganization` (`client_org_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Client_client_role_id_fkey` FOREIGN KEY (`client_role_id`) REFERENCES `ClientRole` (`client_role_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Client`
--

LOCK TABLES `Client` WRITE;
/*!40000 ALTER TABLE `Client` DISABLE KEYS */;
INSERT INTO `Client` VALUES (1,'carlo.mendoza','Carlo','Santos','Mendoza','carlo@email.com','09170111222','pass321','id1.jpg','Active','Pending',NULL,'client1.jpg',NULL,'2026-01-01 08:00:00.000','PROV',1,'2026-01-01 08:00:00.000'),(2,'beatriz.lopez','Beatriz','Reyes','Lopez','beatriz@email.com','09171222333','pass654','id2.jpg','Active','Pending',NULL,'client2.jpg',NULL,'2026-01-01 08:00:00.000','PUB',2,'2026-01-01 08:00:00.000'),(3,'daniel.flores','Daniel','Gomez','Flores','daniel@email.com','09172333444','pass987','id3.jpg','Active','Pending',NULL,'client3.jpg',NULL,'2026-01-01 08:00:00.000','PUB',3,'2026-01-01 08:00:00.000'),(4,'katrina.villanueva','Katrina','Beltran','Villanueva','katrina@email.com','09173444555','pass159','id4.jpg','Active','Pending',NULL,'client4.jpg',NULL,'2026-01-01 08:00:00.000','PROV',4,'2026-01-01 08:00:00.000'),(5,'mark.bautista','Mark','Dizon','Bautista','mark@email.com','09174555666','pass753','id5.jpg','Deactivated','Pending',NULL,'client5.jpg',NULL,'2026-01-01 08:00:00.000','PUB',5,'2026-01-01 08:00:00.000'),(6,'mikaeljules.balabag','Mikael Jules','Puello','Balabag','puellokyle@gmail.com','','Ss1234567@',NULL,'Active','Pending',NULL,NULL,NULL,'2026-01-01 08:00:00.000','PUB',1,'2026-01-01 08:00:00.000'),(7,'mikael2jules.balabag','Mikael2 Jules','Puello','Balabag','dasdasd@gmail.com','','$2b$12$M.3WR5zMi6RXPW6YieSHnu0nCE7NSClMD6O/0LGcmNvDX8zj28oKi',NULL,'Deactivated','Pending',NULL,NULL,NULL,'2026-01-01 08:00:00.000','PROV',1,'2026-01-01 08:00:00.000'),(8,'ree.rer','ree','rer','rer','werer','7589094585','$2b$12$9.m3LezJHXHJo683A5DgGeBGuvfqoI/7U4g7hVF223Jmjb/SlC3bS',NULL,'Active','Pending',NULL,NULL,NULL,'2026-01-01 08:00:00.000','PROV',1,'2026-01-01 08:00:00.000'),(9,'pda','Provincial','Department','Agencies','pda@gmail.com','09434242324','$2b$12$rKraP9.inHHEj68io58y0.GZOCSSgCSa2k2.tQK0u5gKoUnAV32hK',NULL,'Active','Verified',NULL,NULL,NULL,'2026-01-01 08:00:00.000','PROV',1,'2026-01-01 08:00:00.000'),(11,'kyle','Mikael',NULL,'Balabag','kyle@gmail.com','091234567890vgjnbhjm','$2b$12$Y762Y0QoRMGWXNF4mpO/juK6Ko7OvTvYQmqv.du57QgV8tke6Pl/K',NULL,'Active','Pending',NULL,NULL,NULL,'2026-01-01 08:00:00.000','PUB',1,'2026-01-01 08:00:00.000'),(12,'kxiz421','Kyle',NULL,'Puello','kielpuello@gmail.com','N/A','$2b$12$IfDNhNxxbimuOOk8h7qVce8imAICuYAMqfPG1TYmDlFNNnTxsRhiS',NULL,'Active','Pending',NULL,NULL,NULL,'2026-01-01 08:00:00.000','PUB',1,'2026-01-01 08:00:00.000'),(13,'kxiz0421','kyle',NULL,'puello21','kxizkyle@gmail.com','N/A','$2b$10$6rLJykafNXK.othxCxCLBeJfj4Clv2VuYKNPwFGDmoAqcZ89h7anW',NULL,'Active','Pending',NULL,NULL,'851954','2026-01-01 08:00:00.000','PUB',1,'2026-01-01 08:00:00.000'),(14,'client','Client',NULL,'User','client@gmail.com','09883242342','$2b$12$GdJGXlqcLLEKlDkIOFj5xeDNRYXYQoHz3FDOTLqu87/TOdip3425i',NULL,'Active','Verified',NULL,NULL,NULL,'2026-01-01 08:00:00.000','PUB',1,'2026-01-01 08:00:00.000'),(15,'client21','Client',NULL,'Tester','clienttester@gmail.com','','$2b$12$FRIsLRRNZpLoK1ZmthgwaOnCz4hezntToxUtZpA8V89FLCcrhaKli','data:image/jpeg;base64,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','Active','Verified',NULL,NULL,NULL,'2026-01-01 08:00:00.000','PUB',4,'2026-01-01 08:00:00.000'),(16,'danzz','Dan','Perez','Lee','danperez@gmail.com','09123456789','$2b$12$Mb1V6teNppveTvT/lOgi0.YhLyXr97XqFHAn7sb9K9.WuDqMfxFK2',NULL,'Deactivated','Verified',NULL,NULL,NULL,'2026-01-01 08:00:00.000','PUB',4,'2026-01-01 08:00:00.000'),(17,'alshane','Shen',NULL,'Albania','alshenra69@gmail.com','09638113015','$2b$12$DOu1slJMy/00thbfklv./O9RKs//hzaA.pqxCLn6abBxKc9RO.Q.u',NULL,'Active','Verified',NULL,NULL,NULL,'2026-01-01 08:00:00.000','PUB',4,'2026-01-01 08:00:00.000');
/*!40000 ALTER TABLE `Client` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ClientOrganization`
--

DROP TABLE IF EXISTS `ClientOrganization`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ClientOrganization` (
  `client_org_id` int NOT NULL AUTO_INCREMENT,
  `organization_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`client_org_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ClientOrganization`
--

LOCK TABLES `ClientOrganization` WRITE;
/*!40000 ALTER TABLE `ClientOrganization` DISABLE KEYS */;
INSERT INTO `ClientOrganization` VALUES (1,'Notre Dame of Marbel University'),(2,'South Cotabato State College'),(3,'Mendoza Catering Services'),(4,'STI College Koronadal'),(5,'Villanueva Events Management'),(6,'MEOW'),(7,'MEOW');
/*!40000 ALTER TABLE `ClientOrganization` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ClientRole`
--

DROP TABLE IF EXISTS `ClientRole`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ClientRole` (
  `client_role_id` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`client_role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ClientRole`
--

LOCK TABLES `ClientRole` WRITE;
/*!40000 ALTER TABLE `ClientRole` DISABLE KEYS */;
INSERT INTO `ClientRole` VALUES ('PROV','Provincial Government'),('PUB','Public Client');
/*!40000 ALTER TABLE `ClientRole` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Deposit`
--

DROP TABLE IF EXISTS `Deposit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Deposit` (
  `deposit_id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `required_amount` decimal(10,2) NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL DEFAULT '0.00',
  `deposit_status_id` int NOT NULL,
  `payment_id` int DEFAULT NULL,
  `staff_id` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `recorded_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`deposit_id`),
  UNIQUE KEY `Deposit_booking_id_key` (`booking_id`),
  UNIQUE KEY `Deposit_payment_id_key` (`payment_id`),
  KEY `Deposit_deposit_status_id_fkey` (`deposit_status_id`),
  KEY `Deposit_staff_id_fkey` (`staff_id`),
  CONSTRAINT `Deposit_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `Booking` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Deposit_deposit_status_id_fkey` FOREIGN KEY (`deposit_status_id`) REFERENCES `DepositStatus` (`deposit_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Deposit_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `Payment` (`payment_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Deposit_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff` (`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Deposit`
--

LOCK TABLES `Deposit` WRITE;
/*!40000 ALTER TABLE `Deposit` DISABLE KEYS */;
INSERT INTO `Deposit` VALUES (1,29,8126.00,8126.00,2,64,12,'Recorded with combined 50% down + 10% deposit payment','2026-08-30 07:53:34.933','2026-08-30 07:53:35.691');
/*!40000 ALTER TABLE `Deposit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DepositStatus`
--

DROP TABLE IF EXISTS `DepositStatus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DepositStatus` (
  `deposit_status_id` int NOT NULL AUTO_INCREMENT,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`deposit_status_id`),
  UNIQUE KEY `DepositStatus_status_key` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DepositStatus`
--

LOCK TABLES `DepositStatus` WRITE;
/*!40000 ALTER TABLE `DepositStatus` DISABLE KEYS */;
INSERT INTO `DepositStatus` VALUES (4,'Forfeited'),(2,'Held'),(1,'Pending'),(3,'Refunded');
/*!40000 ALTER TABLE `DepositStatus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Document`
--

DROP TABLE IF EXISTS `Document`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Document` (
  `document_id` int NOT NULL AUTO_INCREMENT,
  `document_type_id` int NOT NULL,
  `file_path` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `document_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `submitted_at` datetime(3) NOT NULL,
  `booking_id` int DEFAULT NULL,
  `staff_id` int DEFAULT NULL,
  PRIMARY KEY (`document_id`),
  KEY `Document_document_type_id_fkey` (`document_type_id`),
  KEY `Document_staff_id_fkey` (`staff_id`),
  KEY `Document_booking_id_fkey` (`booking_id`),
  CONSTRAINT `Document_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `Booking` (`booking_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Document_document_type_id_fkey` FOREIGN KEY (`document_type_id`) REFERENCES `DocumentType` (`document_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Document_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff` (`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Document`
--

LOCK TABLES `Document` WRITE;
/*!40000 ALTER TABLE `Document` DISABLE KEYS */;
/*!40000 ALTER TABLE `Document` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DocumentType`
--

DROP TABLE IF EXISTS `DocumentType`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DocumentType` (
  `document_type_id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`document_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DocumentType`
--

LOCK TABLES `DocumentType` WRITE;
/*!40000 ALTER TABLE `DocumentType` DISABLE KEYS */;
INSERT INTO `DocumentType` VALUES (1,'Billing Statement'),(2,'Contract of Lease'),(3,'Certification'),(4,'Request Letter'),(5,'Official Receipt');
/*!40000 ALTER TABLE `DocumentType` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Facility`
--

DROP TABLE IF EXISTS `Facility`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Facility` (
  `facility_id` int NOT NULL AUTO_INCREMENT,
  `facility_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `capacity` int DEFAULT NULL,
  `rate_id` int NOT NULL,
  `status_id` int NOT NULL,
  `venue_id` int NOT NULL,
  PRIMARY KEY (`facility_id`),
  KEY `Facility_rate_id_fkey` (`rate_id`),
  KEY `Facility_status_id_fkey` (`status_id`),
  KEY `Facility_venue_id_fkey` (`venue_id`),
  CONSTRAINT `Facility_rate_id_fkey` FOREIGN KEY (`rate_id`) REFERENCES `FacilityRate` (`rate_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Facility_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `AvailabilityStatus` (`status_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Facility_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `FacilityVenue` (`venue_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Facility`
--

LOCK TABLES `Facility` WRITE;
/*!40000 ALTER TABLE `Facility` DISABLE KEYS */;
INSERT INTO `Facility` VALUES (1,'Gym Lobby','Event space suitable for small gatherings, exhibits, and formal registrations',0,4,1,1),(2,'Stage Area','Stage area for cultural presentations and program performances',0,3,3,1),(3,'Basketball Court','Court for basketball games with shot clock support',0,2,1,1),(4,'Track Oval','Used for jogging or sprints',0,5,1,2);
/*!40000 ALTER TABLE `Facility` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `FacilityImage`
--

DROP TABLE IF EXISTS `FacilityImage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FacilityImage` (
  `facility_image_id` int NOT NULL AUTO_INCREMENT,
  `image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `facility_id` int NOT NULL,
  PRIMARY KEY (`facility_image_id`),
  KEY `FacilityImage_facility_id_fkey` (`facility_id`),
  CONSTRAINT `FacilityImage_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `Facility` (`facility_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `FacilityImage`
--

LOCK TABLES `FacilityImage` WRITE;
/*!40000 ALTER TABLE `FacilityImage` DISABLE KEYS */;
INSERT INTO `FacilityImage` VALUES (4,'basketball_court.jpg',2),(25,'scgcc_main.jpg',1),(26,'scgcc_side.jpg',1),(27,'scgcc_front.jpg',1),(28,'stage_area.jpg',3),(30,'gym_lobby.jpg',4);
/*!40000 ALTER TABLE `FacilityImage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `FacilityRate`
--

DROP TABLE IF EXISTS `FacilityRate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FacilityRate` (
  `rate_id` int NOT NULL AUTO_INCREMENT,
  `day_rate` decimal(10,2) NOT NULL,
  `night_rate` decimal(10,2) NOT NULL,
  PRIMARY KEY (`rate_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `FacilityRate`
--

LOCK TABLES `FacilityRate` WRITE;
/*!40000 ALTER TABLE `FacilityRate` DISABLE KEYS */;
INSERT INTO `FacilityRate` VALUES (1,1500.00,2000.00),(2,20000.00,25000.00),(3,20000.00,25000.00),(4,1000.00,1500.00),(5,3000.00,3000.00),(6,0.00,0.00),(7,1111.00,0.00),(8,1000.00,500.00);
/*!40000 ALTER TABLE `FacilityRate` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `FacilityVenue`
--

DROP TABLE IF EXISTS `FacilityVenue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FacilityVenue` (
  `venue_id` int NOT NULL AUTO_INCREMENT,
  `venue` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`venue_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `FacilityVenue`
--

LOCK TABLES `FacilityVenue` WRITE;
/*!40000 ALTER TABLE `FacilityVenue` DISABLE KEYS */;
INSERT INTO `FacilityVenue` VALUES (1,'South Cotabato Gymnasium and Cultural Center'),(2,'South Cotabato Sports Complex');
/*!40000 ALTER TABLE `FacilityVenue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Inventory`
--

DROP TABLE IF EXISTS `Inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Inventory` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `item_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_cost` decimal(10,2) NOT NULL,
  `quantity_available` int NOT NULL,
  `venue_id` int NOT NULL,
  `status_id` int NOT NULL,
  PRIMARY KEY (`item_id`),
  KEY `Inventory_venue_id_fkey` (`venue_id`),
  KEY `Inventory_status_id_fkey` (`status_id`),
  CONSTRAINT `Inventory_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `AvailabilityStatus` (`status_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Inventory_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `FacilityVenue` (`venue_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Inventory`
--

LOCK TABLES `Inventory` WRITE;
/*!40000 ALTER TABLE `Inventory` DISABLE KEYS */;
INSERT INTO `Inventory` VALUES (1,'Hurdles',5.00,75,2,1),(2,'Wired Microphone',1200.00,10,1,1),(3,'Table',25.00,8,1,2),(4,'Chair',5.00,700,1,1),(5,'Compressor',800.00,10,1,3),(6,'Aircon Compressor',800.00,10,1,1),(7,'LED Wall',20000.00,1,1,2),(8,'Venue Rental – Day Rate (8 AM–5 PM)',20000.00,1,1,1),(9,'Venue Rental – Night Rate (5 PM–12 MN)',25000.00,1,1,1),(18,'Electricity Charge for LED Wall (per hour)',975.00,1,1,1),(19,'Basketball Game',500.00,1,1,1);
/*!40000 ALTER TABLE `Inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `LetterStatus`
--

DROP TABLE IF EXISTS `LetterStatus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LetterStatus` (
  `letter_id` int NOT NULL AUTO_INCREMENT,
  `letter_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `updated_at` datetime(3) NOT NULL,
  `reservation_id` int NOT NULL,
  `approval_status_id` int NOT NULL,
  `staff_id` int DEFAULT NULL,
  PRIMARY KEY (`letter_id`),
  KEY `LetterStatus_reservation_id_fkey` (`reservation_id`),
  KEY `LetterStatus_approval_status_id_fkey` (`approval_status_id`),
  KEY `LetterStatus_staff_id_fkey` (`staff_id`),
  CONSTRAINT `LetterStatus_approval_status_id_fkey` FOREIGN KEY (`approval_status_id`) REFERENCES `ApprovalStatus` (`approval_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `LetterStatus_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `Reservation` (`reservation_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `LetterStatus_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff` (`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `LetterStatus`
--

LOCK TABLES `LetterStatus` WRITE;
/*!40000 ALTER TABLE `LetterStatus` DISABLE KEYS */;
/*!40000 ALTER TABLE `LetterStatus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Notification`
--

DROP TABLE IF EXISTS `Notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Notification` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'General',
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `sent_at` datetime(3) NOT NULL,
  `staff_id` int NOT NULL,
  `client_id` int NOT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `Notification_staff_id_fkey` (`staff_id`),
  KEY `Notification_client_id_fkey` (`client_id`),
  CONSTRAINT `Notification_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `Client` (`client_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Notification_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff` (`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Notification`
--

LOCK TABLES `Notification` WRITE;
/*!40000 ALTER TABLE `Notification` DISABLE KEYS */;
/*!40000 ALTER TABLE `Notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Package`
--

DROP TABLE IF EXISTS `Package`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Package` (
  `package_id` int NOT NULL AUTO_INCREMENT,
  `package_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `day_rate` decimal(10,2) DEFAULT NULL,
  `night_rate` decimal(10,2) DEFAULT NULL,
  `led_wall_day_rate` decimal(10,2) DEFAULT NULL,
  `led_wall_night_rate` decimal(10,2) DEFAULT NULL,
  `status_id` int NOT NULL DEFAULT '1',
  `time_slot_id` int NOT NULL,
  PRIMARY KEY (`package_id`),
  KEY `Package_time_slot_id_fkey` (`time_slot_id`),
  CONSTRAINT `Package_time_slot_id_fkey` FOREIGN KEY (`time_slot_id`) REFERENCES `TimeSlot` (`time_slot_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Package`
--

LOCK TABLES `Package` WRITE;
/*!40000 ALTER TABLE `Package` DISABLE KEYS */;
INSERT INTO `Package` VALUES (1,'Standard Day Package',NULL,55000.00,NULL,NULL,NULL,1,1),(2,'LED Wall Day Package','',80000.00,NULL,80000.00,NULL,1,1),(3,'Standard Night Package','',NULL,60000.00,NULL,NULL,1,2),(4,'LED Wall Night Package','',NULL,85000.00,NULL,85000.00,1,2);
/*!40000 ALTER TABLE `Package` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PackageInclusion`
--

DROP TABLE IF EXISTS `PackageInclusion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PackageInclusion` (
  `package_inclusion_id` int NOT NULL AUTO_INCREMENT,
  `quantity_available` int NOT NULL,
  `package_id` int NOT NULL,
  `item_id` int NOT NULL,
  PRIMARY KEY (`package_inclusion_id`),
  KEY `PackageInclusion_package_id_fkey` (`package_id`),
  KEY `PackageInclusion_item_id_fkey` (`item_id`),
  CONSTRAINT `PackageInclusion_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `Inventory` (`item_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `PackageInclusion_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `Package` (`package_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PackageInclusion`
--

LOCK TABLES `PackageInclusion` WRITE;
/*!40000 ALTER TABLE `PackageInclusion` DISABLE KEYS */;
INSERT INTO `PackageInclusion` VALUES (1,700,1,1),(2,8,1,2),(3,4,1,3),(4,1,1,4),(8,10,2,2),(9,8,2,3),(10,1,2,7),(11,10,3,2),(12,8,3,3),(13,700,3,4),(24,10,4,2),(25,8,4,3),(26,1,4,7),(27,700,4,4),(28,5,4,5);
/*!40000 ALTER TABLE `PackageInclusion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Particular`
--

DROP TABLE IF EXISTS `Particular`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Particular` (
  `particular_id` int NOT NULL AUTO_INCREMENT,
  `particular_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `status_id` int NOT NULL DEFAULT '1',
  `item_id` int DEFAULT NULL,
  PRIMARY KEY (`particular_id`),
  KEY `Particular_item_id_fkey` (`item_id`),
  CONSTRAINT `Particular_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `Inventory` (`item_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Particular`
--

LOCK TABLES `Particular` WRITE;
/*!40000 ALTER TABLE `Particular` DISABLE KEYS */;
INSERT INTO `Particular` VALUES (1,'Wireless Microphone','Wireless handheld microphone for program presentations 4 units available','',1,6),(2,'Wired Microphone','Wired microphone for program presentations 10 units available','',1,2),(3,'Table','Standard rectangular table for events up to 8 units available','',1,3),(4,'LED Wall','LED wall composed of 117 panels available for visual display during events','',1,7),(5,'Chair','Plastic monoblock chair for seating arrangements up to 700 units available','',1,4),(6,'Aircon Compressor','Air conditioning compressor unit. Each unit = 1 compressor. Select 4 (P3,200/100-1K pax), 6 (P4,800/1K-3K pax), 8 (P6,400/4K-6K pax), or 10 (P8,000/7K-10K pax).','',1,5),(7,'Venue Rental – Day Rate (8 AM–5 PM)','Venue rental from 8 AM to 5 PM inclusive of basic light and sound system','',1,8),(8,'Venue Rental – Night Rate (5 PM–12 MN)','Venue rental from 5 PM to 12 MN inclusive of basic light and sound system','',1,9),(17,'Electricity Charge for LED Wall (per hour)','Electricity consumption charge for LED Wall per hour of usage','',1,18),(18,'Basketball Game','Select the game type: Day w/o Shot Clock (qty 2 = P1,000), Day w/ Shot Clock (qty 3 = P1,500), Night w/o Shot Clock (qty 3 = P1,500), Night w/ Shot Clock (qty 4 = P2,000).','',1,19);
/*!40000 ALTER TABLE `Particular` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Payment`
--

DROP TABLE IF EXISTS `Payment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Payment` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `amount_paid` decimal(10,2) NOT NULL,
  `payment_status_id` int NOT NULL,
  `staff_id` int DEFAULT NULL,
  `booking_id` int NOT NULL,
  PRIMARY KEY (`payment_id`),
  KEY `Payment_payment_status_id_fkey` (`payment_status_id`),
  KEY `Payment_staff_id_fkey` (`staff_id`),
  KEY `Payment_booking_id_fkey` (`booking_id`),
  CONSTRAINT `Payment_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `Booking` (`booking_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Payment_payment_status_id_fkey` FOREIGN KEY (`payment_status_id`) REFERENCES `PaymentStatus` (`status_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Payment_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff` (`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Payment`
--

LOCK TABLES `Payment` WRITE;
/*!40000 ALTER TABLE `Payment` DISABLE KEYS */;
INSERT INTO `Payment` VALUES (64,48756.00,4,12,29),(65,40630.00,5,12,29);
/*!40000 ALTER TABLE `Payment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PaymentStatus`
--

DROP TABLE IF EXISTS `PaymentStatus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PaymentStatus` (
  `status_id` int NOT NULL AUTO_INCREMENT,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PaymentStatus`
--

LOCK TABLES `PaymentStatus` WRITE;
/*!40000 ALTER TABLE `PaymentStatus` DISABLE KEYS */;
INSERT INTO `PaymentStatus` VALUES (1,'Paid'),(2,'Partial'),(3,'Unpaid'),(4,'Partially Paid'),(5,'Fully Paid');
/*!40000 ALTER TABLE `PaymentStatus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RescheduleDateChange`
--

DROP TABLE IF EXISTS `RescheduleDateChange`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RescheduleDateChange` (
  `reschedule_date_change_id` int NOT NULL AUTO_INCREMENT,
  `reschedule_id` int NOT NULL,
  `original_date` date NOT NULL,
  `requested_date` date NOT NULL,
  `reservation_date_id` int DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`reschedule_date_change_id`),
  KEY `RescheduleDateChange_reschedule_id_fkey` (`reschedule_id`),
  KEY `RescheduleDateChange_reservation_date_id_fkey` (`reservation_date_id`),
  CONSTRAINT `RescheduleDateChange_reschedule_id_fkey` FOREIGN KEY (`reschedule_id`) REFERENCES `RescheduleRequest` (`reschedule_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RescheduleDateChange_reservation_date_id_fkey` FOREIGN KEY (`reservation_date_id`) REFERENCES `ReservationDate` (`reservation_date_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RescheduleDateChange`
--

LOCK TABLES `RescheduleDateChange` WRITE;
/*!40000 ALTER TABLE `RescheduleDateChange` DISABLE KEYS */;
/*!40000 ALTER TABLE `RescheduleDateChange` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RescheduleRequest`
--

DROP TABLE IF EXISTS `RescheduleRequest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RescheduleRequest` (
  `reschedule_id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int NOT NULL,
  `requested_date` date NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `decline_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`reschedule_id`),
  KEY `RescheduleRequest_reservation_id_fkey` (`reservation_id`),
  CONSTRAINT `RescheduleRequest_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `Reservation` (`reservation_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RescheduleRequest`
--

LOCK TABLES `RescheduleRequest` WRITE;
/*!40000 ALTER TABLE `RescheduleRequest` DISABLE KEYS */;
/*!40000 ALTER TABLE `RescheduleRequest` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Reservation`
--

DROP TABLE IF EXISTS `Reservation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Reservation` (
  `reservation_id` int NOT NULL AUTO_INCREMENT,
  `event_date` date NOT NULL,
  `event_type` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reservation_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Upcoming',
  `submitted_at` datetime(3) NOT NULL,
  `venue_id` int NOT NULL,
  `client_id` int NOT NULL,
  `package_id` int DEFAULT NULL,
  `time_slot_id` int NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `total_amount` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`reservation_id`),
  KEY `Reservation_venue_id_fkey` (`venue_id`),
  KEY `Reservation_client_id_fkey` (`client_id`),
  KEY `Reservation_package_id_fkey` (`package_id`),
  KEY `Reservation_time_slot_id_fkey` (`time_slot_id`),
  CONSTRAINT `Reservation_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `Client` (`client_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Reservation_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `Package` (`package_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Reservation_time_slot_id_fkey` FOREIGN KEY (`time_slot_id`) REFERENCES `TimeSlot` (`time_slot_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Reservation_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `FacilityVenue` (`venue_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Reservation`
--

LOCK TABLES `Reservation` WRITE;
/*!40000 ALTER TABLE `Reservation` DISABLE KEYS */;
INSERT INTO `Reservation` VALUES (64,'2026-09-06','Testing New Reservation','Pending','Upcoming','2026-08-30 07:52:10.863',1,14,NULL,1,'<!--CHARGE_BREAKDOWN:[{\"date\":\"2026-09-06\",\"label\":\"Wireless Microphone × 2\",\"amount\":1600},{\"date\":\"2026-09-06\",\"label\":\"Wired Microphone × 1\",\"amount\":1200},{\"date\":\"2026-09-06\",\"label\":\"Table × 3\",\"amount\":75},{\"date\":\"2026-09-06\",\"label\":\"LED Wall × 1\",\"amount\":20000},{\"date\":\"2026-09-06\",\"label\":\"Chair × 2\",\"amount\":10},{\"date\":\"2026-09-06\",\"label\":\"Aircon Compressor × 3\",\"amount\":2400},{\"date\":\"2026-09-06\",\"label\":\"Electricity Charge for LED Wall (per hour) × 1\",\"amount\":975},{\"date\":\"2026-09-07\",\"label\":\"Standard Day Package\",\"amount\":55000}]-->',81260.00);
/*!40000 ALTER TABLE `Reservation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ReservationDate`
--

DROP TABLE IF EXISTS `ReservationDate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ReservationDate` (
  `reservation_date_id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int NOT NULL,
  `event_date` date NOT NULL,
  PRIMARY KEY (`reservation_date_id`),
  KEY `ReservationDate_reservation_id_fkey` (`reservation_id`),
  CONSTRAINT `ReservationDate_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `Reservation` (`reservation_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ReservationDate`
--

LOCK TABLES `ReservationDate` WRITE;
/*!40000 ALTER TABLE `ReservationDate` DISABLE KEYS */;
INSERT INTO `ReservationDate` VALUES (41,64,'2026-09-07');
/*!40000 ALTER TABLE `ReservationDate` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ReservedParticular`
--

DROP TABLE IF EXISTS `ReservedParticular`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ReservedParticular` (
  `reserved_particular_id` int NOT NULL AUTO_INCREMENT,
  `quantity` int NOT NULL,
  `reservation_id` int NOT NULL,
  `particular_id` int NOT NULL,
  PRIMARY KEY (`reserved_particular_id`),
  KEY `ReservedParticular_reservation_id_fkey` (`reservation_id`),
  KEY `ReservedParticular_particular_id_fkey` (`particular_id`),
  CONSTRAINT `ReservedParticular_particular_id_fkey` FOREIGN KEY (`particular_id`) REFERENCES `Particular` (`particular_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ReservedParticular_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `Reservation` (`reservation_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=79 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ReservedParticular`
--

LOCK TABLES `ReservedParticular` WRITE;
/*!40000 ALTER TABLE `ReservedParticular` DISABLE KEYS */;
INSERT INTO `ReservedParticular` VALUES (72,2,64,1),(73,1,64,2),(74,3,64,3),(75,1,64,4),(76,2,64,5),(77,3,64,6),(78,1,64,17);
/*!40000 ALTER TABLE `ReservedParticular` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Schedule`
--

DROP TABLE IF EXISTS `Schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Schedule` (
  `schedule_id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `reservation_id` int DEFAULT NULL,
  `booking_id` int DEFAULT NULL,
  `facility_id` int NOT NULL,
  PRIMARY KEY (`schedule_id`),
  KEY `Schedule_client_id_fkey` (`client_id`),
  KEY `Schedule_reservation_id_fkey` (`reservation_id`),
  KEY `Schedule_booking_id_fkey` (`booking_id`),
  KEY `Schedule_facility_id_fkey` (`facility_id`),
  CONSTRAINT `Schedule_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `Booking` (`booking_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Schedule_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `Client` (`client_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Schedule_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `Facility` (`facility_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Schedule_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `Reservation` (`reservation_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Schedule`
--

LOCK TABLES `Schedule` WRITE;
/*!40000 ALTER TABLE `Schedule` DISABLE KEYS */;
/*!40000 ALTER TABLE `Schedule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Staff`
--

DROP TABLE IF EXISTS `Staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Staff` (
  `staff_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `middle_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `profile_photo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `staff_role_id` int NOT NULL,
  `staff_org_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `otp` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp_expiration` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `Staff_email_key` (`email`),
  UNIQUE KEY `Staff_username_key` (`username`),
  KEY `Staff_staff_role_id_fkey` (`staff_role_id`),
  KEY `Staff_staff_org_id_fkey` (`staff_org_id`),
  CONSTRAINT `Staff_staff_org_id_fkey` FOREIGN KEY (`staff_org_id`) REFERENCES `StaffOrganization` (`staff_org_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Staff_staff_role_id_fkey` FOREIGN KEY (`staff_role_id`) REFERENCES `StaffRole` (`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Staff`
--

LOCK TABLES `Staff` WRITE;
/*!40000 ALTER TABLE `Staff` DISABLE KEYS */;
INSERT INTO `Staff` VALUES (1,'maria.santos','Maria',NULL,'Santos','admin@scgcc.gov.ph','09171234567','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active','photo1.jpg',2,1,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000'),(2,'juan.delacruz','Juan',NULL,'Dela Cruz','coordinator@scgcc.gov.ph','09182345678','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active','photo2.jpg',3,1,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000'),(3,'rosa.reyes','Rosa',NULL,'Reyes','clerk@scgcc.gov.ph','09193456789','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active','photo3.jpg',3,2,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000'),(4,'pedro.lim','Pedro',NULL,'Lim','ltoo@scgcc.gov.ph','09204567890','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active','photo4.jpg',4,2,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000'),(5,'ana.gonzales','Ana',NULL,'Gonzales','ana.gonzales@scgcc.gov.ph','09215678901','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active','photo5.jpg',3,3,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000'),(7,'admin.admin','Admin',NULL,'Admin','admin','00000000000','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active',NULL,1,1,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000'),(9,'kyle.puello','kyle',NULL,'puello','alshanealbania818@gmail.com','','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active',NULL,1,2,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000'),(10,'kxiz.puello','Kxiz',NULL,'Puello','kxizkyle@gmail.com','','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active',NULL,3,2,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000'),(11,'kxiz21','Kxiz',NULL,'Kyle','puellokyle@gmail.com','N/A','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active',NULL,3,2,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000'),(12,'ltoo','LTOO',NULL,'User','ltoo@gmail.com','N/A','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active',NULL,4,3,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000'),(13,'pcc','Program','Coordinator','Cultural','programcoordinatorcultural12345@gmail.com','21312312312','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active',NULL,1,2,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000'),(14,'pccultural','Program Coordinator',NULL,'Cultural','pcc@gmail.com','N/A','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active',NULL,2,2,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000'),(15,'pccc','Program','Coordinator','SC','pccc@gmail.com','N/A','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active',NULL,2,1,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000'),(16,'accountingclerk','Accounting',NULL,'Clerk','accountingclerk@gmail.com','N/A','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active',NULL,3,3,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000'),(17,'acc','accounting',NULL,'test','asdasd@gmail.com','N/A','$2b$12$0GEA9SoSviCxbo9Px33csuFLjquhhyo7ZxvYNrUYpE1Wu1J750sk2','Active',NULL,3,3,'2026-01-01 08:00:00.000',NULL,'2026-01-01 08:00:00.000');
/*!40000 ALTER TABLE `Staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `StaffOrganization`
--

DROP TABLE IF EXISTS `StaffOrganization`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `StaffOrganization` (
  `staff_org_id` int NOT NULL AUTO_INCREMENT,
  `org_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`staff_org_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `StaffOrganization`
--

LOCK TABLES `StaffOrganization` WRITE;
/*!40000 ALTER TABLE `StaffOrganization` DISABLE KEYS */;
INSERT INTO `StaffOrganization` VALUES (1,'South Cotabato Sports Complex'),(2,'South Cotabato Gymnasium and Cultural Center'),(3,'Provincial Treasurer\'s Office');
/*!40000 ALTER TABLE `StaffOrganization` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `StaffRole`
--

DROP TABLE IF EXISTS `StaffRole`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `StaffRole` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `StaffRole`
--

LOCK TABLES `StaffRole` WRITE;
/*!40000 ALTER TABLE `StaffRole` DISABLE KEYS */;
INSERT INTO `StaffRole` VALUES (1,'Admin'),(2,'Program Coordinator'),(3,'Accounting Clerk'),(4,'Local Treasury Operations Officer');
/*!40000 ALTER TABLE `StaffRole` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `TimeSlot`
--

DROP TABLE IF EXISTS `TimeSlot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TimeSlot` (
  `time_slot_id` int NOT NULL AUTO_INCREMENT,
  `start_time` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `end_time` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`time_slot_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `TimeSlot`
--

LOCK TABLES `TimeSlot` WRITE;
/*!40000 ALTER TABLE `TimeSlot` DISABLE KEYS */;
INSERT INTO `TimeSlot` VALUES (1,'08:00 AM','05:00 PM'),(2,'05:00 PM','11:00 PM');
/*!40000 ALTER TABLE `TimeSlot` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Transaction`
--

DROP TABLE IF EXISTS `Transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Transaction` (
  `transaction_id` int NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_date` datetime(3) NOT NULL,
  `recorded_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `booking_id` int NOT NULL,
  `payment_id` int NOT NULL,
  `deposit_id` int DEFAULT NULL,
  PRIMARY KEY (`transaction_id`),
  KEY `Transaction_booking_id_fkey` (`booking_id`),
  KEY `Transaction_payment_id_fkey` (`payment_id`),
  KEY `Transaction_deposit_id_fkey` (`deposit_id`),
  CONSTRAINT `Transaction_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `Booking` (`booking_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Transaction_deposit_id_fkey` FOREIGN KEY (`deposit_id`) REFERENCES `Deposit` (`deposit_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Transaction_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `Payment` (`payment_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Transaction`
--

LOCK TABLES `Transaction` WRITE;
/*!40000 ALTER TABLE `Transaction` DISABLE KEYS */;
INSERT INTO `Transaction` VALUES (60,'','2026-08-30 07:53:36.276','LTOO User',29,64,NULL),(61,'','2026-08-30 07:54:22.065','LTOO User',29,65,NULL);
/*!40000 ALTER TABLE `Transaction` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'railway'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-30 16:16:25
