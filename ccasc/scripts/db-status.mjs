import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));

if (!line) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

const url = line.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "");
const m = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^:/]+):(\d+)\/([^?]+)/);

if (!m) {
  console.error("Could not parse DATABASE_URL");
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: m[3],
  port: Number(m[4]),
  user: m[1],
  password: m[2],
  database: m[5],
  ssl: { rejectUnauthorized: false },
  connectTimeout: 20000,
});

async function row(sql) {
  const [rows] = await conn.query(sql);
  return rows[0];
}

const maxConn = await row("SHOW VARIABLES LIKE 'max_connections'");
const threads = await row("SHOW STATUS LIKE 'Threads_connected'");
const maxUsed = await row("SHOW STATUS LIKE 'Max_used_connections'");
const aborted = await row("SHOW STATUS LIKE 'Aborted_connects'");
const tables = await row(
  "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE()",
);

console.log("host                  :", `${m[3]}:${m[4]}`);
console.log("database              :", m[5]);
console.log("max_connections       :", maxConn.Value);
console.log("threads connected now :", threads.Value);
console.log("max used connections  :", maxUsed.Value);
console.log("aborted connects      :", aborted.Value);
console.log("tables                :", tables.n);

const counts = [
  ["Staff", "Staff"],
  ["Client", "Client"],
  ["Reservation", "Reservation"],
  ["Booking", "Booking"],
  ["Payment", "Payment"],
  ["Notification", "Notification"],
];

for (const [label, table] of counts) {
  const r = await row(`SELECT COUNT(*) AS n FROM \`${table}\``);
  console.log(`${label.padEnd(22)}:`, r.n);
}

await conn.end();
