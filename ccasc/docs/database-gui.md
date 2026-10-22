# Browsing and editing the database (Prisma Studio)

This gives you a Railway-style data browser for the **Aiven MySQL** database: every table, with
rows you can read, filter, edit, add and delete — in the browser, on your own machine.

It uses **Prisma Studio**, which is already part of the project, so there is nothing to install.

---

## Easiest way: double-click

In the `ccasc` folder, double-click **`open-database.cmd`**.

It starts Prisma Studio, waits until it is actually listening, then opens
**http://localhost:5555** in your browser. A second window appears with the server log — close that
window to stop the database browser.

Tip: right-click the file → **Send to → Desktop (create shortcut)** to keep it on your desktop.

## Open it from a terminal

In a terminal, from the `ccasc` folder:

```
npm run db:studio
```

Then open **http://localhost:5555** (it usually opens by itself).

To stop it, press **Ctrl + C** in the terminal, or just close the window.

It connects using the same `DATABASE_URL` that is already in `ccasc/.env`, so it talks to the live
Aiven database — no extra configuration.

---

## What you can do

- **Pick a table** from the left sidebar (Staff, Client, Reservation, Payment, …).
- **Read** rows in a spreadsheet-like grid; click a row to see every field.
- **Filter and sort** with the controls above the grid — handy for finding one account or booking.
- **Edit a cell** and it saves immediately.
- **Add a row** with the `+` button, **delete** with the row menu.
- **Follow relations**: a field that points at another table is clickable, so from a Booking you can
  jump straight to its Reservation, Client or Payment.

---

## Why it can be slow, and the pool-timeout error

Prisma Studio asks for **a lot at once**: every table in the sidebar, plus each row's related
records. Prisma's default connection pool is **13 connections with a 10-second timeout**, and on a
remote database (Aiven) that queue expires while Studio is still loading, giving:

> Timed out fetching a new connection from the connection pool
> (Current connection pool timeout: 10, connection limit: 13)

The database is not the problem. Run `npm run db:status` and you'll see it allows **76 connections**
and is using only one or two.

The launcher therefore starts Studio with a larger, more patient pool —
`connection_limit=15&pool_timeout=60&connect_timeout=30` — which stops that error.

If it is still slow to load:

- **Use the table filter/search** instead of scrolling a whole table; Studio always fetches the first
  100 rows *with* their relations.
- **Browse with DBeaver or MySQL Workbench instead** — they read one simple page of rows and are much
  faster over a remote connection. Keep Prisma Studio for editing.
- Check the database's health with `npm run db:status` (below).

## Checking the database's health

```
npm run db:status
```

Prints the host, `max_connections`, current and peak connection counts, aborted connects, the table
count and the row counts of the main tables — useful whenever the app or Studio feels slow.

## Read this before you edit

**This writes straight to the live production database.** There is no undo, no audit trail, and the
app's own validation does not run — for example, you can save a `contactNumber` that the registration
form would have rejected.

So:

1. **Look before you touch.** Reading is safe; editing is not.
2. **Back up first if you're changing more than one row.** There are scripts for this in `scripts/`
   (the backup/restore scripts used earlier), and the project's convention is a full dump before any
   bulk data change.
3. **Don't hand-edit things the app derives** — passwords are bcrypt hashes (editing them to plain
   text locks the user out), `activeSession` drives the single-session rule, and `otp` /
   `otpExpiration` are managed by the reset flow.
4. **Prefer the app** for normal work (Admin → User Management, bookings, payments). Use Studio for
   things the UI doesn't expose: inspecting a stuck row, wiping test data, correcting a bad record.

---

## If it won't connect

| Symptom | Cause | Fix |
|---|---|---|
| `Can't reach database server` | `DATABASE_URL` wrong or missing in `ccasc/.env` | Check the `DATABASE_URL` line |
| Connection refused / timeout | Aiven's **Allowed IP addresses** blocks your network | In Aiven → your MySQL service → *Allowed IP addresses*, add your IP (or `0.0.0.0/0` while testing) |
| SSL error | The URL needs `sslaccept=accept_invalid_certs` | Keep that parameter exactly as it is in `.env` |
| Port 5555 already in use | Another Studio is running | Close it, or run `npx prisma studio --port 5556` |

---

## Other options, if you'd rather use a desktop tool

- **DBeaver** (free, Windows/macOS/Linux) — closest to a classic database manager. Connect with
  host `ccasc-puellokyle-9a57.d.aivencloud.com`, port `14370`, user `avnadmin`, and the password and
  database from `DATABASE_URL`. Enable SSL ("require").
- **MySQL Workbench** (free, Oracle) — same connection details.
- **Aiven web console** — good for monitoring and running SQL, but Aiven for MySQL does not ship a
  full table editor, which is why Studio or DBeaver is the practical choice.

**Prisma Studio remains the easiest**: no install, no connection details to type, and it always
matches your `schema.prisma`.
