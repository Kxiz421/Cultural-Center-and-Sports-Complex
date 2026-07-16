-- Add remarks column to Client table
ALTER TABLE Client ADD COLUMN remarks TEXT NULL AFTER verification_status;