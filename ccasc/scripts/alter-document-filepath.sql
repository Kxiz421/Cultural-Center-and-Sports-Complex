-- Alter Document table: change file_path from VARCHAR(255) NOT NULL to TEXT NULL
ALTER TABLE Document MODIFY COLUMN file_path TEXT NULL;