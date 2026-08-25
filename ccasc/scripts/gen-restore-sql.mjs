import { readFileSync, writeFileSync } from "fs";
const c = readFileSync("backups/railway-backup-live.sql", "utf8");
const start = c.indexOf('INSERT INTO `Reservation`', 683516);
const end = c.indexOf(";", start);
const block = c.substring(start, end);
const lines = block.split("),\n(");
const m = {Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12"};
const updates = [];
for (const l of lines) {
  const clean = l.replace(/^\(|\)$/g, "");
  const parts = [];
  let cur = "", depth = 0;
  for (const ch of clean) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  if (parts.length < 6) continue;
  const id = parts[0].replace(/'/g, "");
  const dt = parts[1].replace(/^'|'$/g, "");
  const sa = parts[5].replace(/^'|'$/g, "");
  const dtp = dt.split(" ");
  const sap = sa.split(" ");
  if (dtp.length >= 4 && m[dtp[1]])
    updates.push("UPDATE Reservation SET event_date='" + dtp[3] + "-" + m[dtp[1]] + "-" + dtp[2].padStart(2,"0") + "' WHERE reservation_id=" + id + ";");
  if (sap.length >= 4 && m[sap[1]])
    updates.push("UPDATE Reservation SET submitted_at='" + sap[3] + "-" + m[sap[1]] + "-" + sap[2].padStart(2,"0") + "' WHERE reservation_id=" + id + ";");
}
writeFileSync("backups/restore-dates.sql", "SET sql_mode='';\n" + updates.join("\n"), "utf8");
console.log("Written " + updates.length + " SQL updates to backups/restore-dates.sql");