ALTER TABLE Document
  ADD COLUMN event_date DATE NULL;

UPDATE Document d
INNER JOIN Booking b ON d.booking_id = b.booking_id
INNER JOIN Reservation r ON b.reservation_id = r.reservation_id
SET d.event_date = r.event_date
WHERE d.event_date IS NULL;
