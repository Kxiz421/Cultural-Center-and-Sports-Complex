/**
 * Import a mysqldump SQL file into a MySQL database.
 * Does NOT read or modify DATABASE_URL in .env.
 *
 * Usage:
 *   node scripts/import-db-clone.mjs <backup.sql> "mysql://user:pass@host:port/db"
 *
 * Or set TARGET_DATABASE_URL for this shell only (not .env):
 *   $env:TARGET_DATABASE_URL="mysql://..."; node scripts/import-db-clone.mjs backups/file.sql
 */
import { spawn } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MYSQL_BIN =
  process.env.MYSQL_BIN ||
  "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe";

function parseMysqlUrl(raw) {
  const url = new URL(raw.replace(/^mysql:\/\//, "http://"));
  return {
    host: url.hostname,
    port: url.port || "3306",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "").split("?")[0] || "railway",
  };
}

const backupArg = process.argv[2];
const targetArg = process.argv[3] || process.env.TARGET_DATABASE_URL;

if (!backupArg || !targetArg) {
  console.error(
    "Usage: node scripts/import-db-clone.mjs <backup.sql> <mysql://user:pass@host:port/db>"
  );
  console.error(
    "Tip: mysql.railway.internal only works inside Railway — use the public proxy host from the dashboard."
  );
  process.exit(1);
}

const backupPath = resolve(process.cwd(), backupArg);
if (!existsSync(backupPath)) {
  console.error("Backup file not found:", backupPath);
  process.exit(1);
}

if (targetArg.includes("railway.internal")) {
  console.error(
    "ERROR: mysql.railway.internal is not reachable from your PC.\n" +
      "In Railway → your NEW MySQL service → Networking → enable Public Networking,\n" +
      "then copy the TCP proxy host (e.g. something.proxy.rlwy.net:PORT).\n" +
      "Or run: railway link && railway connect MySQL --tunnel-only"
  );
  process.exit(1);
}

const { host, port, user, password, database } = parseMysqlUrl(targetArg);

console.log("Importing:", backupPath);
console.log("Target:", `${host}:${port}/${database} (user: ${user})`);

const args = [
  "--binary-mode",
  "-h",
  host,
  "-P",
  port,
  "-u",
  user,
  `-p${password}`,
  database,
];

const child = spawn(MYSQL_BIN, args, {
  stdio: ["pipe", "inherit", "inherit"],
  windowsHide: true,
});

const { createReadStream } = await import("fs");
const stream = createReadStream(backupPath, { encoding: "utf8" });
stream.pipe(child.stdin);
stream.on("end", () => child.stdin.end());

child.on("close", (code) => {
  if (code === 0) {
    console.log("Import completed successfully.");
  } else {
    console.error("Import failed with exit code", code);
    process.exit(code || 1);
  }
});
