-- Inbox notifications can carry an optional deep link. A document-submission
-- notice points at the coordinator Booking Confirmation page for that booking,
-- so clicking it opens the booking and the submitted document.
ALTER TABLE Notification ADD COLUMN link VARCHAR(255) NULL;
