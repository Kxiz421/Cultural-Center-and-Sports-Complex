/**
 * Logical backup of the Railway MySQL database behind ccasc.
 *
 * There is no mysqldump on this machine, so this writes a standard SQL dump
 * (CREATE TABLE + INSERT) that can be restored with:
 *   mysql -h <host> -u <user> -p <db> < backups/<file>.sql
 * or by pasting into any MySQL client.
 *
 * Runs inside one REPEATABLE READ / CONSISTENT SNAPSHOT transaction so every
 * table is captured at the same point in time. Output goes to ./backups/
 * (git-ignored).
 */
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

/** Local-time stamp for the filename, e.g. 2026-10-10_05-55-17. */
function localStamp(date) {
  const p = (n) => String(n).padStart(2, "0");
  const day = [date.getFullYear(), p(date.getMonth() + 1), p(date.getDate())].join("-");
  const time = [p(date.getHours()), p(date.getMinutes()), p(date.getSeconds())].join("-");
  return `${day}_${time}`;
}

const envText = fs.readFileSync(".env", "utf8");
const urlLine = envText
  .split(/\r?\n/)
  .find((l) => l.trim().startsWith("DATABASE_URL="));
const raw = urlLine.replace(/^\s*DATABASE_URL=/, "").trim().replace(/^"|"$/g, "");
const u = new URL(raw.replace(/^mysql:/, "http:"));
const database = u.pathname.replace(/^\//, "") || "railway";

const conn = await mysql.createConnection({
  host: u.hostname,
  port: Number(u.port || 3306),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database,
  ssl: raw.includes("accept_invalid_certs") ? { rejectUnauthorized: false } : undefined,
  dateStrings: true, // keep DATETIME/DATE verbatim (no timezone shift)
  supportBigNumbers: true,
  bigNumberStrings: true,
  connectTimeout: 30000,
});

const [[verRow]] = await conn.query("SELECT VERSION() AS v");
console.log(`Connected: MySQL ${verRow.v}, database "${database}"`);

await conn.query("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
await conn.query("START TRANSACTION WITH CONSISTENT SNAPSHOT");

const [tableRows] = await conn.query("SHOW FULL TABLES");
const tables = tableRows.map((r) => Object.values(r)[0]);
console.log(`Tables/views: ${tables.length}`);

const escapeString = (s) =>
  "'" +
  String(s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\0/g, "\\0")
    .replace(/\u001a/g, "\\Z") +
  "'";

const literal = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  if (Buffer.isBuffer(v)) return "0x" + v.toString("hex");
  return escapeString(v);
};

const startedAt = new Date();

let out = "";
out += `-- ccasc MySQL backup\n`;
out += `-- database: ${database}\n`;
out += `-- server:   MySQL ${verRow.v}\n`;
out += `-- created:  ${startedAt.toLocaleString()} (${startedAt.toISOString()})\n`;
out += `SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n`;

let totalRows = 0;
const summary = [];

for (const table of tables) {
  const [[createRow]] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
  const isView = Object.keys(createRow).includes("Create View");
  const createSql = createRow["Create Table"] || createRow["Create View"];

  out += `\n-- ----------------------------\n-- ${isView ? "View" : "Table"} \`${table}\`\n-- ----------------------------\n`;
  out += `DROP ${isView ? "VIEW" : "TABLE"} IF EXISTS \`${table}\`;\n`;
  out += createSql + ";\n\n";

  const [colRows] = await conn.query(
    `SELECT COLUMN_NAME, EXTRA FROM information_schema.columns
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
    [database, table]
  );
  const insertable = new Set(
    colRows
      .filter((c) => !/GENERATED/i.test(c.EXTRA || ""))
      .map((c) => c.COLUMN_NAME)
  );

  const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
  totalRows += rows.length;
  summary.push(`  ${table}: ${rows.length}`);

  if (!isView && rows.length) {
    const cols = Object.keys(rows[0]).filter((c) => insertable.has(c));
    const colList = cols.map((c) => `\`${c}\``).join(", ");
    for (const row of rows) {
      const values = cols.map((c) => literal(row[c])).join(", ");
      out += `INSERT INTO \`${table}\` (${colList}) VALUES (${values});\n`;
    }
    out += "\n";
  }
}

out += `SET FOREIGN_KEY_CHECKS=1;\n`;

await conn.query("ROLLBACK");
await conn.end();

const dir = path.join(process.cwd(), "backups");
fs.mkdirSync(dir, { recursive: true });
const stamp = localStamp(startedAt);
const file = path.join(dir, `ccasc-backup-${stamp}.sql`);
fs.writeFileSync(file, out, "utf8");

console.log(`\nWrote: ${file}`);
console.log(`Size:  ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
console.log(`Rows:  ${totalRows} across ${tables.length} tables/views`);
console.log(summary.join("\n"));
