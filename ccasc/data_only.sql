
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

LOCK TABLES `announcement` WRITE;
/*!40000 ALTER TABLE `announcement` DISABLE KEYS */;
INSERT INTO `announcement` (`announcement_id`, `title`, `content`, `recipient_type`, `date_posted`, `staff_id`, `status_id`) VALUES (1,'Main Gymnasium Maintenance Schedule','The Main Gymnasium will undergo routine maintenance and cleaning on April 5 2026. No bookings will be accommodated on this date.','All','2026-03-01 00:00:00.000',1,1),(2,'Air Conditioning Unit Inspection Notice','All air conditioning units in the South Cotabato Gymnasium and Cultural Center will be inspected and serviced on April 8 2026.','All','2026-03-02 01:00:00.000',1,1),(3,'LED Wall Maintenance Advisory','The LED Wall composed of 117 panels will be undergoing calibration and maintenance on April 12 2026. Reservations requiring the LED Wall on this date will not be accommodated.','Clients','2026-03-03 02:00:00.000',1,1),(4,'Restroom Renovation Notice','Restroom facilities will be temporarily closed for renovation from April 15 to April 17 2026. Alternative arrangements will be provided for confirmed bookings.','All','2026-03-04 00:30:00.000',1,1),(5,'Lights and Sound System Check','The lights and sound system including the 12 PAR64 lights and microphone equipment will be tested and serviced on April 20 2026.','Staff','2026-03-04 23:00:00.000',1,3);
/*!40000 ALTER TABLE `announcement` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `announcementstatus` WRITE;
/*!40000 ALTER TABLE `announcementstatus` DISABLE KEYS */;
INSERT INTO `announcementstatus` (`status_id`, `status`) VALUES (1,'Active'),(2,'Archived'),(3,'Inactive');
/*!40000 ALTER TABLE `announcementstatus` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `approvalstatus` WRITE;
/*!40000 ALTER TABLE `approvalstatus` DISABLE KEYS */;
INSERT INTO `approvalstatus` (`approval_status_id`, `status`) VALUES (1,'Declined'),(2,'Pending'),(3,'Approved');
/*!40000 ALTER TABLE `approvalstatus` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `availabilitystatus` WRITE;
/*!40000 ALTER TABLE `availabilitystatus` DISABLE KEYS */;
INSERT INTO `availabilitystatus` (`status_id`, `status_name`) VALUES (1,'Archived'),(2,'Available'),(3,'Unavailable'),(4,'Under Maintenance');
/*!40000 ALTER TABLE `availabilitystatus` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `booking` WRITE;
/*!40000 ALTER TABLE `booking` DISABLE KEYS */;
INSERT INTO `booking` (`booking_id`, `confirmation_date`, `reservation_id`, `booking_status_id`, `staff_id`) VALUES (1,'2026-03-09 07:00:00.000',2,2,2),(2,'2026-03-08 05:00:00.000',5,1,2),(3,'2026-03-07 01:00:00.000',1,1,2),(4,'2026-03-06 03:00:00.000',3,3,NULL),(5,'2026-03-05 02:00:00.000',1,1,2);
/*!40000 ALTER TABLE `booking` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `bookingstatus` WRITE;
/*!40000 ALTER TABLE `bookingstatus` DISABLE KEYS */;
INSERT INTO `bookingstatus` (`booking_status_id`, `status`) VALUES (1,'Confirmed'),(2,'Cancelled'),(3,'Pending');
/*!40000 ALTER TABLE `bookingstatus` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `client` WRITE;
/*!40000 ALTER TABLE `client` DISABLE KEYS */;
INSERT INTO `client` (`client_id`, `first_name`, `middle_name`, `last_name`, `email`, `contact_number`, `password`, `id_proof`, `account_status`, `profile_photo`, `client_role_id`, `client_org_id`) VALUES (1,'Carlo','Santos','Mendoza','carlo@email.com','09170111222','pass321','id1.jpg','Active','client1.jpg','PROV',1),(2,'Beatriz','Reyes','Lopez','beatriz@email.com','09171222333','pass654','id2.jpg','Active','client2.jpg','PUB',2),(3,'Daniel','Gomez','Flores','daniel@email.com','09172333444','pass987','id3.jpg','Active','client3.jpg','PUB',3),(4,'Katrina','Beltran','Villanueva','katrina@email.com','09173444555','pass159','id4.jpg','Active','client4.jpg','PROV',4),(5,'Mark','Dizon','Bautista','mark@email.com','09174555666','pass753','id5.jpg','Deactivated','client5.jpg','PUB',5),(6,'Mikael Jules','Puello','Balabag','puellokyle@gmail.com','','Skyhigh1',NULL,'Active',NULL,'PUB',1),(7,'Mikael2 Jules','Puello','Balabag','dasdasd@gmail.com','','$2b$12$M.3WR5zMi6RXPW6YieSHnu0nCE7NSClMD6O/0LGcmNvDX8zj28oKi',NULL,'Deactivated',NULL,'PROV',1),(8,'ree','rer','rer','werer','7589094585','$2b$12$9.m3LezJHXHJo683A5DgGeBGuvfqoI/7U4g7hVF223Jmjb/SlC3bS',NULL,'Active',NULL,'PROV',1);
/*!40000 ALTER TABLE `client` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `clientorganization` WRITE;
/*!40000 ALTER TABLE `clientorganization` DISABLE KEYS */;
INSERT INTO `clientorganization` (`client_org_id`, `organization_name`) VALUES (1,'Notre Dame of Marbel University'),(2,'South Cotabato State College'),(3,'Mendoza Catering Services'),(4,'STI College Koronadal'),(5,'Villanueva Events Management');
/*!40000 ALTER TABLE `clientorganization` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `clientrole` WRITE;
/*!40000 ALTER TABLE `clientrole` DISABLE KEYS */;
INSERT INTO `clientrole` (`client_role_id`, `role_name`) VALUES ('PUB','Public Client'),('PROV','Provincial Government');
/*!40000 ALTER TABLE `clientrole` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `document` WRITE;
/*!40000 ALTER TABLE `document` DISABLE KEYS */;
INSERT INTO `document` (`document_id`, `document_type_id`, `file_path`, `document_status`, `remarks`, `submitted_at`, `booking_id`, `staff_id`) VALUES (1,1,'docs/request_letter_booking1.pdf','Verified','Governor approved the request letter for Recognition Ceremony','2026-03-02 02:30:00.000',1,4),(2,5,'docs/receipt_booking2.pdf','Awaiting Submission','Initial 50 percent payment receipt must be submitted 7 days before the event','2026-03-03 03:25:00.000',2,NULL),(3,4,'docs/billing_booking2.pdf','Pending','Please resubmit billing statement with complete breakdown of charges','2026-03-03 03:20:00.000',2,2),(4,2,'docs/contract_booking1.pdf','Verified','Contract of lease issued by Local Treasury Operations Officer','2026-03-05 02:35:00.000',1,2),(5,3,'docs/cert_booking1.pdf','Verified','Certification issued by Provincial Treasurers Office','2026-03-05 02:40:00.000',1,2);
/*!40000 ALTER TABLE `document` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `documenttype` WRITE;
/*!40000 ALTER TABLE `documenttype` DISABLE KEYS */;
INSERT INTO `documenttype` (`document_type_id`, `type`) VALUES (1,'Billing Statement'),(2,'Contract of Lease'),(3,'Certification'),(4,'Request Letter'),(5,'Official Receipt');
/*!40000 ALTER TABLE `documenttype` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `facility` WRITE;
/*!40000 ALTER TABLE `facility` DISABLE KEYS */;
INSERT INTO `facility` (`facility_id`, `facility_name`, `description`, `rate_id`, `status_id`, `venue_id`) VALUES (1,'Gym Lobby','Event space suitable for small gatherings, exhibits, and formal registrations',4,2,1),(2,'Stage Area','Stage area for cultural presentations and program performances',3,3,1),(3,'Basketball Court','Court for basketball games with shot clock support',2,2,1),(4,'Track Oval','Used for jogging or sprints',5,1,2),(5,'South Cotabato Gymnasium and Cultural Center','Primary venue located at 26 Rafael Alunan Avenue Zone IV Koronadal City South Cotabato',1,1,1),(6,'New','sfefsdf',2,2,1),(7,'gjhg','gjdftutf',1,2,2);
/*!40000 ALTER TABLE `facility` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `facilityimage` WRITE;
/*!40000 ALTER TABLE `facilityimage` DISABLE KEYS */;
INSERT INTO `facilityimage` (`facility_image_id`, `image`, `facility_id`) VALUES (1,'scgcc_main.jpg',1),(2,'scgcc_side.jpg',1),(3,'scgcc_front.jpg',1),(4,'basketball_court.jpg',2),(5,'stage_area.jpg',3),(6,'gym_lobby.jpg',4),(7,'track_oval.jpg',5);
/*!40000 ALTER TABLE `facilityimage` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `facilityrate` WRITE;
/*!40000 ALTER TABLE `facilityrate` DISABLE KEYS */;
INSERT INTO `facilityrate` (`rate_id`, `day_rate`, `night_rate`) VALUES (1,1500.00,2000.00),(2,20000.00,25000.00),(3,20000.00,25000.00),(4,1000.00,1500.00),(5,3000.00,3000.00);
/*!40000 ALTER TABLE `facilityrate` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `facilityvenue` WRITE;
/*!40000 ALTER TABLE `facilityvenue` DISABLE KEYS */;
INSERT INTO `facilityvenue` (`venue_id`, `venue`) VALUES (1,'South Cotabato Gymnasium and Cultural Center'),(2,'South Cotabato Sports Complex');
/*!40000 ALTER TABLE `facilityvenue` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
INSERT INTO `inventory` (`item_id`, `item_name`, `description`, `unit_cost`, `quantity_available`, `venue_id`, `status_id`, `particular_id`) VALUES (1,'Hurdles','A physical barrier jumped over in athletic races',5.00,75,2,1,1),(2,'Wired Microphone','Wired microphone for program presentations 10 units available',1200.00,10,1,1,4),(3,'Table','Standard rectangular table for events up to 8 units available',258.00,8,1,2,2),(4,'Chair','Plastic monoblock chair for seating arrangements up to 700 units available',5.00,700,1,1,1),(5,'Compressor','Air conditioning system suitable for events with a capacity of 250 per pax.',800.00,10,1,3,6),(6,'Wireless Microphone','Wireless handheld microphone for program presentations 4 units available',1200.00,4,1,1,3),(7,'LED Wall','LED wall composed of 117 panels available for visual display during events',20000.00,1,1,2,5);
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `letterstatus` WRITE;
/*!40000 ALTER TABLE `letterstatus` DISABLE KEYS */;
INSERT INTO `letterstatus` (`letter_id`, `letter_remarks`, `updated_at`, `reservation_id`, `approval_status_id`, `staff_id`) VALUES (1,'Request letter for Basketball Tournament declined due to incomplete event details','2026-03-08 05:00:00.000',4,3,4),(2,'Private clients are not required to submit a request letter to the Governor\'s Office','2026-03-07 03:00:00.000',2,3,4),(3,'Request letter for Provincial Government Assembly is currently under review by Governor\'s Office. Review takes 3 days','2026-03-06 02:00:00.000',5,2,NULL),(4,'Governor approved the request letter for Cultural Festival. Letter forwarded to Provincial Treasurer\'s Office','2026-03-05 01:00:00.000',3,1,4),(5,'Governor approved the request letter for Recognition Ceremony. Endorsed to Provincial Treasurer\'s Office','2026-03-04 06:00:00.000',1,1,4);
/*!40000 ALTER TABLE `letterstatus` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `notification` WRITE;
/*!40000 ALTER TABLE `notification` DISABLE KEYS */;
INSERT INTO `notification` (`notification_id`, `message`, `sent_at`, `staff_id`, `client_id`) VALUES (1,'Your signed Contract of Lease is ready at the Provincial Treasurer\'s Office.','2026-04-07 06:20:00.000',4,4),(2,'The Certification for your event has been processed and is ready for claiming.','2026-04-07 02:15:00.000',4,3),(3,'Please proceed to the Provincial Treasurer\'s Office to claim your Certification.','2026-04-07 03:00:00.000',4,5),(4,'Your Certification is ready to be claimed at the Provincial Treasurer\'s Office.','2026-04-07 00:00:00.000',4,1),(5,'Your Certification is ready to be claimed at the Provincial Treasurer\'s Office.','2026-04-07 00:00:00.000',4,2);
/*!40000 ALTER TABLE `notification` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `package` WRITE;
/*!40000 ALTER TABLE `package` DISABLE KEYS */;
INSERT INTO `package` (`package_id`, `package_name`, `day_rate`, `night_rate`, `led_wall_day_rate`, `led_wall_night_rate`, `time_slot_id`) VALUES (1,'Standard Day Package',55000.00,NULL,NULL,NULL,1),(2,'LED Wall Day Package',NULL,NULL,80000.00,NULL,1),(3,'Standard Night Package',NULL,60000.00,NULL,NULL,2),(4,'LED Wall Night Package',NULL,NULL,NULL,85000.00,2);
/*!40000 ALTER TABLE `package` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `packageinclusion` WRITE;
/*!40000 ALTER TABLE `packageinclusion` DISABLE KEYS */;
INSERT INTO `packageinclusion` (`package_inclusion_id`, `quantity_available`, `package_id`, `item_id`) VALUES (1,700,1,1),(2,8,1,2),(3,4,1,3),(4,1,1,4),(5,700,2,1),(6,8,2,2),(7,4,2,3),(8,1,2,4),(9,700,3,1),(10,8,3,2),(11,4,3,3),(12,1,3,4),(13,700,4,1),(14,8,4,2),(15,4,4,3),(16,1,4,4);
/*!40000 ALTER TABLE `packageinclusion` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `particular` WRITE;
/*!40000 ALTER TABLE `particular` DISABLE KEYS */;
INSERT INTO `particular` (`particular_id`, `particular_name`, `description`) VALUES (1,'Wireless Microphone','Wireless handheld microphone for program presentations 4 units available'),(2,'Wired Microphone','Wired microphone for program presentations 10 units available'),(3,'Table','Standard rectangular table for events up to 8 units available'),(4,'LED Wall','LED wall composed of 117 panels available for visual display during events'),(5,'Chair','Plastic monoblock chair for seating arrangements up to 700 units available'),(6,'Compressor','Air conditioning system suitable for events with a capacity of 250 per pax.');
/*!40000 ALTER TABLE `particular` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `payment` WRITE;
/*!40000 ALTER TABLE `payment` DISABLE KEYS */;
INSERT INTO `payment` (`payment_id`, `amount_paid`, `payment_status_id`, `staff_id`, `booking_id`) VALUES (1,30000.00,3,4,3),(2,27500.00,1,4,2),(3,27500.00,2,4,4),(4,27500.00,3,4,1),(5,55000.00,1,4,5);
/*!40000 ALTER TABLE `payment` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `paymentstatus` WRITE;
/*!40000 ALTER TABLE `paymentstatus` DISABLE KEYS */;
INSERT INTO `paymentstatus` (`status_id`, `status`) VALUES (1,'Paid'),(2,'Partial'),(3,'Unpaid');
/*!40000 ALTER TABLE `paymentstatus` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `reservation` WRITE;
/*!40000 ALTER TABLE `reservation` DISABLE KEYS */;
INSERT INTO `reservation` (`reservation_id`, `event_date`, `event_type`, `reservation_status`, `submitted_at`, `venue_id`, `client_id`, `package_id`, `time_slot_id`) VALUES (1,'2026-04-10','Recognition Ceremony','Approved','2026-03-01 01:00:00.000',1,1,NULL,1),(2,'2026-05-12','Music Concert','Approved','2026-03-12 02:00:00.000',1,3,NULL,2),(3,'2026-04-15','Corporate Dinner','Pending','2026-03-02 02:30:00.000',1,2,NULL,2),(4,'2026-05-18','Provincial Meeting','Pending','2026-03-15 01:00:00.000',1,5,NULL,1),(5,'2026-05-08','Barangay Basketball League','Approved','2026-03-08 01:00:00.000',2,2,NULL,1),(6,'2026-05-01','Provincial Government Assembly','Pending','2026-03-05 06:00:00.000',2,5,1,1),(7,'2026-05-29','Badminton Championship','Approved','2026-03-18 00:30:00.000',2,4,NULL,1),(8,'2026-05-05','Art Exhibit Opening','Approved','2026-03-10 00:00:00.000',1,1,NULL,1),(9,'2026-04-25','Stage Play Rehearsal','Declined','2026-03-04 03:00:00.000',1,4,NULL,1),(10,'2026-04-20','Cultural Festival','Approved','2026-03-03 00:45:00.000',1,3,NULL,1),(11,'2026-05-22','Track and Field Event','Pending','2026-03-14 03:00:00.000',2,1,NULL,2),(12,'2026-05-15','Inter-School Volleyball Tournament','Approved','2026-03-11 02:00:00.000',2,3,NULL,1),(13,'2026-06-05','Zumba Fitness Festival','Pending','2026-03-20 01:00:00.000',2,2,NULL,1);
/*!40000 ALTER TABLE `reservation` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `reservedparticular` WRITE;
/*!40000 ALTER TABLE `reservedparticular` DISABLE KEYS */;
INSERT INTO `reservedparticular` (`reserved_particular_id`, `quantity`, `reservation_id`, `particular_id`) VALUES (1,100,1,1),(2,2,1,4),(3,200,2,1),(4,2,2,2),(5,150,3,1),(6,4,3,2),(7,4,3,3),(8,700,4,1),(9,1,4,5);
/*!40000 ALTER TABLE `reservedparticular` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `schedule` WRITE;
/*!40000 ALTER TABLE `schedule` DISABLE KEYS */;
INSERT INTO `schedule` (`schedule_id`, `client_id`, `reservation_id`, `booking_id`, `facility_id`) VALUES (1,4,NULL,4,4),(2,3,NULL,3,3),(3,2,2,NULL,2),(4,5,5,NULL,1),(5,1,1,NULL,1);
/*!40000 ALTER TABLE `schedule` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
INSERT INTO `staff` (`staff_id`, `first_name`, `middle_name`, `last_name`, `email`, `contact_number`, `password`, `status`, `profile_photo`, `staff_role_id`, `staff_org_id`) VALUES (1,'Maria',NULL,'Santos','admin@scgcc.gov.ph','09171234567','********','Active','photo1.jpg',1,1),(2,'Juan',NULL,'Dela Cruz','coordinator@scgcc.gov.ph','09182345678','********','Active','photo2.jpg',3,1),(3,'Rosa',NULL,'Reyes','clerk@scgcc.gov.ph','09193456789','********','Active','photo3.jpg',2,2),(4,'Pedro',NULL,'Lim','ltoo@scgcc.gov.ph','09204567890','********','Active','photo4.jpg',4,2),(5,'Ana',NULL,'Gonzales','ana.gonzales@scgcc.gov.ph','09215678901','********','Active','photo5.jpg',3,3),(7,'Admin',NULL,'Admin','admin','00000000000','$2b$12$ItpZ3JKiR2zi9puStSwlHOMjm0WpiTlL6bvTiD5CcYt5dJoBE1LLW','Active',NULL,2,1),(8,'Accounting',NULL,'Clerk','accountingclerk@gmail.com','','$2b$12$la8sjmDPmg1S3mQJDhPGtu91DGQ7EH7Ep.bzVmD8r1OGpDNuHzP7m','Active',NULL,3,2);
/*!40000 ALTER TABLE `staff` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `stafforganization` WRITE;
/*!40000 ALTER TABLE `stafforganization` DISABLE KEYS */;
INSERT INTO `stafforganization` (`staff_org_id`, `org_name`) VALUES (1,'South Cotabato Sports Complex'),(2,'South Cotabato Gymnasium and Cultural Center'),(3,'Provincial Treasurer\'s Office');
/*!40000 ALTER TABLE `stafforganization` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `staffrole` WRITE;
/*!40000 ALTER TABLE `staffrole` DISABLE KEYS */;
INSERT INTO `staffrole` (`role_id`, `role_name`) VALUES (1,'Program Coordinator'),(2,'Admin'),(3,'Accounting Clerk'),(4,'Local Treasury Operations Officer');
/*!40000 ALTER TABLE `staffrole` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `timeslot` WRITE;
/*!40000 ALTER TABLE `timeslot` DISABLE KEYS */;
INSERT INTO `timeslot` (`time_slot_id`, `start_time`, `end_time`) VALUES (1,'08:00 AM','05:00 PM'),(2,'05:00 PM','11:00 PM');
/*!40000 ALTER TABLE `timeslot` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `transaction` WRITE;
/*!40000 ALTER TABLE `transaction` DISABLE KEYS */;
INSERT INTO `transaction` (`transaction_id`, `receipt_number`, `payment_date`, `recorded_by`, `booking_id`, `payment_id`) VALUES (1,'OR-2026-005','2026-03-07 00:00:00.000','Local Treasury Operations Officer',4,3),(2,'OR-2026-001','2026-03-01 00:00:00.000','Local Treasury Operations Officer',4,1),(3,'OR-2026-002','2026-03-03 00:00:00.000','Local Treasury Operations Officer',4,2),(4,'OR-2026-003','2026-03-02 00:00:00.000','Local Treasury Operations Officer',4,3),(5,'OR-2026-004','2026-03-05 00:00:00.000','Local Treasury Operations Officer',4,4);
/*!40000 ALTER TABLE `transaction` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

