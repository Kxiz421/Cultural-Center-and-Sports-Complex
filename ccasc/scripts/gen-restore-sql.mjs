import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backupPath = join(__dirname, "../backups/railway-backup-live.sql");
const c = readFileSync(backupPath, "utf8");

const MONTHS = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function parseJsDateString(str) {
  if (!str) return null;
  const parts = String(str).split(" ");
  if (parts.length >= 4 && MONTHS[parts[1]]) {
    return `${parts[3]}-${MONTHS[parts[1]]}-${parts[2].padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return null;
}

function splitInsertRows(block) {
  const rows = [];
  let cur = "";
  let depth = 0;
  for (const ch of block) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      rows.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) rows.push(cur.trim());
  return rows;
}

function parseCsvFields(row) {
  const clean = row.replace(/^\(/, "").replace(/\)$/, "");
  const parts = [];
  let cur = "";
  let depth = 0;
  let inQuote = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === "'" && clean[i - 1] !== "\\") inQuote = !inQuote;
    if (!inQuote) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) {
        parts.push(cur.trim());
        cur = "";
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts.map((p) => p.replace(/^'|'$/g, ""));
}

function extractInsertBlock(tableName) {
  const patterns = [
    "INSERT INTO `" + tableName + "`",
    "INSERT INTO \\`" + tableName + "\\`",
    "INSERT INTO " + tableName,
  ];
  let start = -1;
  for (const p of patterns) {
    const idx = c.indexOf(p);
    if (idx !== -1) {
      start = idx;
      break;
    }
  }
  if (start === -1) return null;
  const valuesIdx = c.indexOf("VALUES", start);
  const end = c.indexOf(";", valuesIdx);
  const valuesBlock = c.slice(valuesIdx + 6, end).trim();
  return valuesBlock;
}

const updates = [];

const reservationBlock = extractInsertBlock("Reservation");
if (reservationBlock) {
  for (const row of splitInsertRows(reservationBlock)) {
    const parts = parseCsvFields(row);
    if (parts.length < 6) continue;
    const id = parts[0];
    const eventDate = parseJsDateString(parts[1]);
    const submittedAt = parseJsDateString(parts[5]);
    if (eventDate) {
      updates.push(
        `UPDATE Reservation SET event_date='${eventDate}' WHERE reservation_id=${id};`
      );
    }
    if (submittedAt) {
      updates.push(
        `UPDATE Reservation SET submitted_at='${submittedAt}' WHERE reservation_id=${id};`
      );
    }
  }
}

const reservationDateBlock = extractInsertBlock("ReservationDate");
if (reservationDateBlock) {
  for (const row of splitInsertRows(reservationDateBlock)) {
    const parts = parseCsvFields(row);
    if (parts.length < 3) continue;
    const id = parts[0];
    const eventDate = parseJsDateString(parts[2]);
    if (eventDate) {
      updates.push(
        `UPDATE ReservationDate SET event_date='${eventDate}' WHERE reservation_date_id=${id};`
      );
    }
  }
}

const outPath = join(__dirname, "../backups/restore-dates.sql");
writeFileSync(outPath, `SET sql_mode='';\n${updates.join("\n")}\n`, "utf8");
console.log(`Written ${updates.length} SQL updates to backups/restore-dates.sql`);
