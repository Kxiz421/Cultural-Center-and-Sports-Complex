-- A walk-in reservation is not tied to a registered Client account: its
-- name/contact/email live in Reservation.notes ("Walk-in client: ...").
-- `client_id` therefore has to be optional. The FK constraint is unchanged and
-- simply permits NULL.
ALTER TABLE Reservation MODIFY client_id INT NULL;
