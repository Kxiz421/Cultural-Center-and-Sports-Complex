-- Facilities / particulars / time slot a reschedule request asks to change.
--
-- Rescheduling could previously only move event dates. A request may now also
-- carry the facilities (Sports Complex), particulars (Cultural Center) and the
-- time slot the client wants while the reservation is still editable, stored as
-- JSON in `scope_change` (see lib/reschedule-scope.js).
--
-- Run with:  mysql -u <user> -p <database> < scripts/sql/add-reschedule-scope-change.sql
-- (or simply `npm run db:push`, which applies prisma/schema.prisma.)

ALTER TABLE `RescheduleRequest`
  ADD COLUMN `scope_change` TEXT NULL AFTER `decline_reason`;
