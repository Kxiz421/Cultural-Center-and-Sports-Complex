-- Validity window for admin announcements. Both columns are nullable so
-- existing announcements keep working (no window = always shown in history).
ALTER TABLE Announcement
  ADD COLUMN start_date DATE NULL AFTER date_posted,
  ADD COLUMN end_date DATE NULL AFTER start_date;
