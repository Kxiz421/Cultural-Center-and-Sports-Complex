-- Single-session login support.
--
-- Stores the token of the account's currently-active session. On login the
-- application overwrites it; any other browser holding an older token is
-- treated as signed-out. Nullable so existing rows keep working.
--
-- Apply with:  node scripts/apply-active-session.mjs
-- (the script checks INFORMATION_SCHEMA first, so re-running is safe)

ALTER TABLE Staff  ADD COLUMN active_session VARCHAR(64) NULL;
ALTER TABLE Client ADD COLUMN active_session VARCHAR(64) NULL;
