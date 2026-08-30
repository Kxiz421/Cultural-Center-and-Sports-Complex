-- Strict 3NF: drop redundant columns. Run against production railway DB.

-- Transaction.booking_id (derive via Payment.booking_id)
ALTER TABLE `Transaction` DROP FOREIGN KEY `Transaction_booking_id_fkey`;
ALTER TABLE `Transaction` DROP COLUMN `booking_id`;

-- Booking.venue_id (derive via Reservation.venue_id)
ALTER TABLE `Booking` DROP FOREIGN KEY `Booking_venue_id_fkey`;
ALTER TABLE `Booking` DROP COLUMN `venue_id`;

-- Document.status (keep document_status only)
ALTER TABLE `Document` DROP COLUMN `status`;

-- Schedule.client_id (derive via Reservation or Booking)
ALTER TABLE `Schedule` DROP FOREIGN KEY `Schedule_client_id_fkey`;
ALTER TABLE `Schedule` DROP COLUMN `client_id`;
