# Database Design Analysis — Normalization Issues Found

Based on your PDF "Database Design-04-22-2026", here are the normalization errors I found and the fixes needed:

## Issue 1: FacilityImage table (page 22) — NOT in 1NF

**Problem:** The PK `facility_images_id` is NOT unique. Facility 1 has 3 images all with `facility_images_id = 1`. This violates 1NF (no repeating PKs).

**Fix:** Use auto-increment PK + add `facility_id` FK.

## Issue 2: Facility table (page 25) — Violates 1NF/3NF

**Problem:** Has `facility_images_id` as a single FK column, implying one facility → one image. But one facility can have MANY images.

**Fix:** Remove `facility_images_id` from Facility table (the FacilityImage table should reference `facility_id` instead).

## Issue 3: Packages table (page 34) — Violates 1NF/2NF

**Problem:** Has `package_inclusion_id` as a single FK column, implying one package → one inclusion. But one package has MANY inclusions (chairs, tables, speakers, etc.).

**Fix:** Remove `package_inclusion_id` from Packages table (the link is through Package_inclusion junction table).

## Issue 4: Reservation table (page 52) — Violates 1NF/2NF

**Problem:** Has `reserved_particulars_id` as a single FK column, implying one reservation → one set of particulars. But one reservation can have MANY different items (chairs + tables + microphones).

**Fix:** Remove `reserved_particulars_id` from Reservation table (the link is through Reserved_particulars junction table).

## Issue 5: FacilityRate table (page 24/28) — Redundant data (3NF violation)

**Problem:** `rate_name` duplicates facility names ("BasketballCourt" appears twice). The rate_name is transitively dependent on the facility, not on the rate itself.

**Fix:** Remove `rate_name` column. The rate table should just have rate_id, day_rate, night_rate.

## Issue 6: Document table (page 76) — 3NF violation

**Problem:** In the 3NF version, `document_type` is still stored as plain text (e.g., "RequestLetter", "Contract of Lease") instead of a FK reference. The DocumentType table exists but isn't actually referenced.

**Fix:** Add `document_type_id` FK column referencing DocumentType table.

## Issue 7: DocumentType table (page 75) — PK naming conflict

**Problem:** Uses `document_id` as PK name, but `document_id` is already the PK of the Document table. This causes confusion and potential reference errors.

**Fix:** Rename to `document_type_id`.

## Issue 8: Inventory table at 3NF (page 45) — Inconsistent FK naming

**Problem:** Shows `availability_status` as a number instead of `status_id`, inconsistent with the FK convention used everywhere else.

**Fix:** Rename to `status_id` to match convention.

## Issue 9: Announcement recipient_type (page 87) — Not normalized

**Problem:** `recipient_type` stores text ("All", "Clients", "Staff") — these are repeating values that should be in their own reference table.

**Fix:** Create AnnouncmentRecipient table with recipient_type_id.

## Issue 10: Transaction table (page 66) — Circular dependency risk

**Problem:** Transaction references both `booking_id` AND `payment_id`, while Payment also references `booking_id`. This creates a circular/long chain that could cause update anomalies.

**Fix:** Simplify so Transaction references only `payment_id`, and Payment already has `booking_id`.