# CSASC Relational Database — UNF to 3NF

**System:** Cultural and Sports Complex reservation, booking, payment, deposit, document, and staff/client accounts.

**Assumption:** The starting UNF table is one “reservation worksheet” a clerk would write on paper (one row per request, with repeating lists). The final 3NF matches the live Prisma / MySQL schema. Table and column names were **not** renamed so existing API routes keep working.

**Partial vs transitive (used below):**
- **Partial dependency:** a non-key attribute depends on only **part** of a **composite** primary key.
- **Transitive dependency:** a non-key attribute depends on **another non-key** attribute (`A → B → C` where `A` is the PK).

---

### 1. UNF

**Original table (one row per reservation request):**

| Column | Example / problem |
|--------|-------------------|
| client_name, client_email, client_contact, client_role_name, org_name | Client + role + org mixed |
| staff_name, staff_role_name | Who confirmed (if any) |
| venue_name, facility_name, facility_day_rate, facility_night_rate | Venue + facility + rates |
| event_type, event_dates (list), time_slot | Dates in one cell: `2026-09-10, 2026-09-11` |
| package_name, package_rates, inclusion_names (list) | Repeating inclusions |
| particular_names (list), quantities (list) | Repeating extras |
| payment_amounts (list), payment_dates (list), receipt_numbers (list) | Repeating payments |
| deposit_amount, deposit_status | Mixed with payments |
| document_types (list), file_paths (list) | Repeating documents |
| reservation_status, event_status | Status text on the same row |

**Primary key (UNF):** none that is stable (name + date is not unique).

**Problems:**
- Non-atomic values (comma-separated dates, items, payments).
- Repeating groups (many dates, many extras, many payments).
- Same client/org/venue/rate stored on every request → update anomalies.
- Inserting a new venue requires a fake reservation (insertion anomaly).
- Deleting the last reservation for a client can lose the client (deletion anomaly).

---

### 2. 1NF

**Goal:** atomic values only; no repeating groups.

**How repeating groups were removed:**

| Repeating group in UNF | 1NF table | Why split |
|------------------------|-----------|-----------|
| Extra event dates | `ReservationDate` | One date per row |
| Extra particulars | `ReservedParticular` | One item + qty per row |
| Package items | `PackageInclusion` | One inventory item per package |
| Facility photos | `FacilityImage` | One image path per row |
| Payments | `Payment` | One amount per payment |
| Receipt / when recorded | `Transaction` | One ledger line per payment |
| Documents | `Document` | One file per row |
| Reschedule date pairs | `RescheduleDateChange` | One original→new date per row |

**Resulting 1NF core (still not 2NF/3NF):**

- `Reservation(reservation_id PK, event_date, event_type, reservation_status, venue_name, client_name, client_email, org_name, package_name, time_start, time_end, …)`
- `ReservationDate(reservation_date_id PK, reservation_id FK, event_date)`
- `ReservedParticular(reserved_particular_id PK, reservation_id FK, particular_name, quantity, unit_cost)`
- `Payment(payment_id PK, reservation_id, amount_paid, payment_status_name, staff_name)`
- etc.

**Candidate keys (examples):** `Reservation.reservation_id`; `Client.email` later.

**Functional dependencies (1NF, still messy):**  
`reservation_id → event_type, venue_name, client_name, org_name, …`  
`client_name → org_name` (not yet extracted)

No composite PKs yet on these surrogate-key tables, so **partial dependencies are not the main problem yet**. The remaining problem is **transitive** data (names that depend on other names) and attributes that belong to other entities.

---

### 3. 2NF

**Rule:** already in 1NF, and no non-key attribute depends on only part of a composite PK.

**Where composite keys appear:**

| Table | Composite candidate / business key | Partial dependency removed |
|-------|------------------------------------|----------------------------|
| `ReservedParticular` | `(reservation_id, particular_id)` | `particular_name` depended only on `particular_id`, not on the pair → keep `Particular` separate; junction holds only `quantity`. |
| `PackageInclusion` | `(package_id, item_id)` | `item_name`, `unit_cost` depend only on `item_id` → stay in `Inventory`. Junction holds `quantity_available` for that package. |
| `RescheduleDateChange` | `(reschedule_id, original_date)` | Request reason/status depend only on `reschedule_id` → stay on `RescheduleRequest`. |

**Surrogate PKs** (`reserved_particular_id`, `package_inclusion_id`) are used so the app does not rely on composite keys. The **same 2NF split** is still required: non-key facts about Particular/Inventory must not sit on the junction row.

**Tables after 2NF (structure):** people, venues, inventory, packages, reservations, dates, extras, bookings, payments, deposits, documents, notifications — with junction tables holding only the relationship + quantity.

---

### 4. 3NF

**Rule:** already in 2NF, and no non-key attribute depends on another non-key attribute.

**Transitive dependencies removed (not partial):**

| Transitive FD | Why it is transitive | Table that holds the fact |
|---------------|----------------------|---------------------------|
| `client_id → client_role_id → role_name` | Role name depends on role, not on client | `ClientRole` |
| `client_id → client_org_id → organization_name` | Org name depends on org | `ClientOrganization` |
| `staff_id → staff_role_id → role_name` | Role name depends on role | `StaffRole` |
| `staff_id → staff_org_id → org_name` | Org name depends on org | `StaffOrganization` |
| `facility_id → rate_id → day_rate, night_rate` | Rates depend on rate row | `FacilityRate` |
| `facility_id → venue_id → venue` | Venue name depends on venue | `FacilityVenue` |
| `facility_id → status_id → status_name` | Status name depends on status | `AvailabilityStatus` |
| `inventory.item_id → status_id → status_name` | Same | `AvailabilityStatus` |
| `package_id → status_id → status_name` | Same (FK added in this pass) | `AvailabilityStatus` |
| `particular_id → status_id → status_name` | Same (FK added in this pass) | `AvailabilityStatus` |
| `booking_id → booking_status_id → status` | Status name depends on status | `BookingStatus` |
| `payment_id → payment_status_id → status` | Status name depends on status | `PaymentStatus` |
| `deposit_id → deposit_status_id → status` | Status name depends on status | `DepositStatus` |
| `document_id → document_type_id → type` | Type name depends on type | `DocumentType` |
| `letter_id → approval_status_id → status` | Status name depends on status | `ApprovalStatus` |
| `announcement_id → status_id → status` | Status name depends on status | `AnnouncementStatus` |

**Why split:** if `role_name` lived on `Client`, renaming “Public Client” would require updating every client row (update anomaly).

**Applied in this pass (live DB):**
- `Particular.status_id` → `AvailabilityStatus.status_id` (FK was missing; name was hardcoded in API).
- `Package.status_id` → `AvailabilityStatus.status_id` (same).

**Removed for strict 3NF (routes updated to follow relations):**
- `Transaction.booking_id` — booking comes from `Payment.booking_id`.
- `Booking.venue_id` — venue comes from `Reservation.venue_id`.
- `Schedule.client_id` — client comes from `Reservation` or `Booking → Reservation`.
- `Document.status` — only `document_status` remains.

**Intentionally kept (not 3NF failures):**
- `Transaction.recorded_by` is a snapshot name (audit-style), not a live staff copy.
- `AuditLog` keeps `performed_by_name` / `target_name` on purpose (history must not change if a user is renamed).
- `Reservation.reservation_status` / `event_status` and `RescheduleRequest.status` stay as atomic VARCHAR codes. No other columns depend on those strings, so they already satisfy 3NF.
- `Deposit.booking_id` is required when `payment_id` is still null.

**Anomaly check after 3NF:**
- **Insert:** a new venue/role/status can be inserted without a reservation.
- **Update:** change `ClientRole.role_name` once; all clients see it via FK.
- **Delete:** delete a reservation; client, venue, and package rows remain.

---

### 5. Final 3NF Tables

#### StaffRole
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| role_id | INT | PK | Staff role id |
| role_name | VARCHAR(100) | | Admin, LTOO, etc. |

#### StaffOrganization
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| staff_org_id | INT | PK | Organization id |
| org_name | VARCHAR(200) | | Office / complex name |

#### Staff
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| staff_id | INT | PK | Staff account |
| username | VARCHAR(100) | UNIQUE | Login name |
| first_name, middle_name, last_name | VARCHAR(100) | | Name |
| email | VARCHAR(150) | UNIQUE | Email |
| contact_number | VARCHAR(20) | | Phone |
| password | VARCHAR(255) | | Hash |
| status | VARCHAR(50) | | Active / etc. |
| profile_photo | VARCHAR(255) | | Path |
| staff_role_id | INT | FK → StaffRole | Role |
| staff_org_id | INT | FK → StaffOrganization | Org |
| otp, otp_expiration | VARCHAR / DATETIME | | Login OTP |
| created_at | DATETIME | | Created |

#### ClientRole
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| client_role_id | VARCHAR(10) | PK | PUB, PROV |
| role_name | VARCHAR(100) | | Role label |

#### ClientOrganization
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| client_org_id | INT | PK | Org id |
| organization_name | VARCHAR(200) | | Client org |

#### Client
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| client_id | INT | PK | Client account |
| username, names, email, contact, password | | UNIQUE on username/email | Identity |
| id_proof | TEXT | | ID image/text |
| account_status, verification_status | VARCHAR(50) | | Account flags |
| remarks | TEXT | | Notes |
| profile_photo | VARCHAR(255) | | Path |
| otp, otp_expiration | | | OTP |
| client_role_id | VARCHAR(10) | FK → ClientRole | Role |
| client_org_id | INT | FK → ClientOrganization | Org |
| created_at | DATETIME | | Created |

#### FacilityVenue
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| venue_id | INT | PK | Venue |
| venue | VARCHAR(200) | | Cultural Center / Sports Complex |

#### FacilityRate
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| rate_id | INT | PK | Rate set |
| day_rate, night_rate | DECIMAL(10,2) | | Facility rates |

#### AvailabilityStatus
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| status_id | INT | PK | Availability code |
| status_name | VARCHAR(50) | | Available, Archived, … |

#### Facility
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| facility_id | INT | PK | Court / hall |
| facility_name | VARCHAR(200) | | Name |
| description | TEXT | | Details |
| capacity | INT | | Capacity |
| rate_id | INT | FK → FacilityRate | Rates |
| status_id | INT | FK → AvailabilityStatus | Availability |
| venue_id | INT | FK → FacilityVenue | Location |

#### FacilityImage
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| facility_image_id | INT | PK | Image row |
| image | VARCHAR(255) | | Path |
| facility_id | INT | FK → Facility | Owner |

#### Inventory
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| item_id | INT | PK | Stock item |
| item_name | VARCHAR(200) | | Name |
| unit_cost | DECIMAL(10,2) | | Unit cost |
| quantity_available | INT | | Qty |
| venue_id | INT | FK → FacilityVenue | Location |
| status_id | INT | FK → AvailabilityStatus | Availability |

#### Particular
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| particular_id | INT | PK | Extra / add-on |
| particular_name | VARCHAR(200) | | Name |
| description | TEXT | | Details |
| category | VARCHAR(100) | | Label (atomic) |
| status_id | INT | FK → AvailabilityStatus | Availability |
| item_id | INT | FK → Inventory (nullable) | Linked stock |

#### TimeSlot
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| time_slot_id | INT | PK | Slot |
| start_time, end_time | VARCHAR(20) | | Hours |

#### Package
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| package_id | INT | PK | Package |
| package_name | VARCHAR(200) | | Name |
| description | TEXT | | Details |
| day_rate, night_rate, led_wall_* | DECIMAL(10,2) | | Package rates (one set per package) |
| status_id | INT | FK → AvailabilityStatus | Availability |
| time_slot_id | INT | FK → TimeSlot | Default slot |

#### PackageInclusion
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| package_inclusion_id | INT | PK | Junction |
| quantity_available | INT | | Qty in package |
| package_id | INT | FK → Package | Package |
| item_id | INT | FK → Inventory | Item |

#### AnnouncementStatus
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| status_id | INT | PK | Status |
| status | VARCHAR(50) | | Posted / etc. |

#### Announcement
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| announcement_id | INT | PK | Post |
| title, content | VARCHAR / TEXT | | Body |
| recipient_type | VARCHAR(50) | | All / Clients / Staff (atomic code) |
| date_posted | DATETIME | | When |
| staff_id | INT | FK → Staff | Author |
| status_id | INT | FK → AnnouncementStatus | Status |

#### Reservation
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| reservation_id | INT | PK | Request |
| event_date | DATE | | Primary date |
| event_type | VARCHAR(200) | | Event name |
| reservation_status, event_status | VARCHAR(50) | | Atomic status codes |
| total_amount | DECIMAL(12,2) | | Base total |
| submitted_at | DATETIME | | Submitted |
| venue_id | INT | FK → FacilityVenue | Venue |
| client_id | INT | FK → Client | Client |
| package_id | INT | FK → Package (nullable) | Package |
| time_slot_id | INT | FK → TimeSlot | Slot |
| notes | TEXT | | Notes |

#### ReservationDate
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| reservation_date_id | INT | PK | Extra day |
| reservation_id | INT | FK → Reservation | Parent |
| event_date | DATE | | Extra date |

#### ReservedParticular
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| reserved_particular_id | INT | PK | Line |
| quantity | INT | | Qty |
| reservation_id | INT | FK → Reservation | Parent |
| particular_id | INT | FK → Particular | Item |

#### BookingStatus
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| booking_status_id | INT | PK | Status |
| status | VARCHAR(50) | | Confirmed / etc. |

#### Booking
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| booking_id | INT | PK | Confirmed booking |
| confirmation_date | DATETIME | | When confirmed |
| reservation_id | INT | FK → Reservation | Request |
| venue_id | INT | FK → FacilityVenue (nullable) | Convenience copy |
| booking_status_id | INT | FK → BookingStatus | Status |
| staff_id | INT | FK → Staff (nullable) | Who confirmed |

#### PaymentStatus
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| status_id | INT | PK | Status |
| status | VARCHAR(50) | | Paid / Partial / … |

#### Payment
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| payment_id | INT | PK | Payment |
| amount_paid | DECIMAL(10,2) | | Amount |
| payment_status_id | INT | FK → PaymentStatus | Status |
| staff_id | INT | FK → Staff (nullable) | Recorder |
| booking_id | INT | FK → Booking | Booking |

#### DepositStatus
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| deposit_status_id | INT | PK | Status |
| status | VARCHAR(50) | UNIQUE | Pending, Held, Refunded, Forfeited |

#### Deposit
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| deposit_id | INT | PK | 10% deposit obligation |
| booking_id | INT | FK → Booking, UNIQUE | One deposit per booking |
| required_amount, amount_paid | DECIMAL(10,2) | | Amounts |
| deposit_status_id | INT | FK → DepositStatus | Status |
| payment_id | INT | FK → Payment, UNIQUE, nullable | Payment that met deposit |
| staff_id | INT | FK → Staff (nullable) | Who recorded |
| notes | TEXT | | Notes |
| recorded_at, updated_at | DATETIME | | Timestamps |

#### Transaction
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| transaction_id | INT | PK | Ledger line |
| receipt_number | VARCHAR(50) | | OR (optional) |
| payment_date | DATETIME | | When |
| recorded_by | VARCHAR(255) | | Snapshot name |
| booking_id | INT | FK → Booking | Convenience FK |
| payment_id | INT | FK → Payment | Payment |
| deposit_id | INT | FK → Deposit (nullable) | Linked deposit |

#### DocumentType
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| document_type_id | INT | PK | Type |
| type | VARCHAR(100) | | Request letter, contract, … |

#### Document
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| document_id | INT | PK | File |
| document_type_id | INT | FK → DocumentType | Type |
| file_path | MEDIUMTEXT | | Path |
| document_status, status | VARCHAR(50) | | Same workflow status (both written by API) |
| remarks | TEXT | | Remarks |
| submitted_at | DATETIME | | When |
| booking_id | INT | FK → Booking (nullable) | Booking |
| staff_id | INT | FK → Staff (nullable) | Reviewer |

#### ApprovalStatus
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| approval_status_id | INT | PK | Status |
| status | VARCHAR(50) | | Approved / etc. |

#### LetterStatus
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| letter_id | INT | PK | Letter review |
| letter_remarks | TEXT | | Remarks |
| updated_at | DATETIME | | Updated |
| reservation_id | INT | FK → Reservation | Request |
| approval_status_id | INT | FK → ApprovalStatus | Status |
| staff_id | INT | FK → Staff (nullable) | Reviewer |

#### Notification
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| notification_id | INT | PK | Message |
| message | TEXT | | Body |
| type | VARCHAR(50) | | payment, reschedule, … |
| is_read | BOOLEAN | | Read flag |
| sent_at | DATETIME | | When |
| staff_id | INT | FK → Staff | Sender |
| client_id | INT | FK → Client | Recipient |

#### Schedule
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| schedule_id | INT | PK | Calendar link |
| client_id | INT | FK → Client | Client |
| reservation_id | INT | FK → Reservation (nullable) | Request |
| booking_id | INT | FK → Booking (nullable) | Booking |
| facility_id | INT | FK → Facility | Facility |

#### RescheduleRequest
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| reschedule_id | INT | PK | Request |
| reservation_id | INT | FK → Reservation | Reservation |
| requested_date | DATE | | Primary requested date |
| reason | TEXT | | Required reason |
| status | VARCHAR(50) | | Pending / Approved / Declined |
| decline_reason | TEXT | | If declined |
| created_at, updated_at | DATETIME | | Timestamps |

#### RescheduleDateChange
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| reschedule_date_change_id | INT | PK | One date move |
| reschedule_id | INT | FK → RescheduleRequest | Parent |
| original_date, requested_date | DATE | | From → to |
| reservation_date_id | INT | FK → ReservationDate (nullable) | Extra day |
| is_primary | BOOLEAN | | Primary event date |

#### CalendarBlock
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| block_id | INT | PK | Blocked date |
| title | VARCHAR(255) | | Title |
| block_date | DATE | | Date |
| block_type | VARCHAR(50) | | Holiday / maintenance |
| venue_id | INT | FK → FacilityVenue | Venue |
| notes | TEXT | | Notes |
| created_at | DATETIME | | Created |

#### AuditLog
| Column | Data Type | PK/FK | Description |
|--------|-----------|-------|-------------|
| audit_log_id | INT | PK | Log row |
| action | VARCHAR(100) | | Action code |
| target_user_id, target_name | VARCHAR | | Snapshot of target |
| performed_by_id, performed_by_name | VARCHAR | | Snapshot of actor |
| details | TEXT | | Details |
| created_at | DATETIME | | When |

---

### 6. Relationships

| Relationship | Cardinality |
|--------------|-------------|
| StaffRole → Staff | 1:M |
| StaffOrganization → Staff | 1:M |
| ClientRole → Client | 1:M |
| ClientOrganization → Client | 1:M |
| FacilityVenue → Facility, Inventory, Reservation, Booking, CalendarBlock | 1:M |
| FacilityRate → Facility | 1:M |
| AvailabilityStatus → Facility, Inventory, Package, Particular | 1:M |
| Facility → FacilityImage | 1:M |
| Inventory → Particular | 1:M (optional on Particular) |
| TimeSlot → Package, Reservation | 1:M |
| Package → PackageInclusion | 1:M |
| Inventory → PackageInclusion | 1:M |
| Package ↔ Inventory (via PackageInclusion) | M:N |
| Reservation ↔ Particular (via ReservedParticular) | M:N |
| Client → Reservation | 1:M |
| Reservation → ReservationDate | 1:M |
| Reservation → Booking | 1:M (normally 1:1 in use) |
| Booking → Payment | 1:M |
| Booking → Deposit | 1:1 |
| Payment → Deposit | 1:1 (optional) |
| Payment → Transaction | 1:M |
| Deposit → Transaction | 1:M (optional) |
| Booking → Document | 1:M |
| DocumentType → Document | 1:M |
| Reservation → LetterStatus | 1:M |
| Reservation → RescheduleRequest | 1:M |
| RescheduleRequest → RescheduleDateChange | 1:M |
| Staff → Announcement, Notification, Payment, Deposit, Document | 1:M |
| Client → Notification, Schedule | 1:M |

---

### 7. SQL

MySQL `CREATE TABLE` statements matching the live mapped names are in:

`ccasc/docs/database-3nf-create-tables.sql`

Prisma source of truth: `ccasc/prisma/schema.prisma`.
