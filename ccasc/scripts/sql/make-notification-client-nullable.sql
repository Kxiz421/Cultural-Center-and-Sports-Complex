-- An announcement can target a staff role (program coordinators, accounting
-- clerks, treasury officers) that has no related client record, so the
-- Notification -> Client relation has to be optional.
-- `staff_id` keeps its meaning: the recipient for staff-targeted rows, the
-- sender for client-facing rows.
ALTER TABLE Notification MODIFY client_id INT NULL;
