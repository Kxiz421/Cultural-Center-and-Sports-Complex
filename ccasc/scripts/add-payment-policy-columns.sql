-- Add payment policy columns to Reservation table
ALTER TABLE Reservation
  ADD COLUMN payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending' AFTER notes,
  ADD COLUMN calendar_visible BOOLEAN NOT NULL DEFAULT FALSE AFTER payment_status,
  ADD COLUMN down_payment_deadline DATE AFTER calendar_visible,
  ADD COLUMN balance_deadline DATE AFTER down_payment_deadline,
  ADD COLUMN cancellation_deadline DATE AFTER balance_deadline,
  ADD COLUMN is_final BOOLEAN NOT NULL DEFAULT FALSE AFTER cancellation_deadline,
  ADD COLUMN required_down_payment DECIMAL(12, 2) AFTER is_final,
  ADD COLUMN required_deposit DECIMAL(12, 2) AFTER required_down_payment;

-- Add payment policy columns to Payment table
ALTER TABLE Payment
  ADD COLUMN payment_type VARCHAR(50) NOT NULL DEFAULT 'FULL' AFTER booking_id,
  ADD COLUMN forfeited BOOLEAN NOT NULL DEFAULT FALSE AFTER payment_type;