/**
 * Restore a ccasc SQL dump (produced by scripts/backup-db.mjs) into MySQL.
 *
 * Usage:
 *   node scripts/restore-db.mjs [path/to/backup.sql] [--target=mysql://...] [--yes] [--dry-run]
 *
 *   - No file argument  -> the newest *.sql in ./backups/ is used.
 *   - No --target        -> TARGET_DATABASE_URL, else DATABASE_URL from .env.
 *   - --dry-run          -> parse the dump and report, without touching MySQL.
 *   - --yes              -> required to actually import (this DROPs existing tables).
 *
 * The dump is replayed statement-by-statement (quote/comment aware) so it works
 * regardless of the server's max_allowed_packet.
 */
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const confirmed = args.includes("--yes");
const targetArg = args.find((a) => a.startsWith("--target="));
const fileArg = args.find((a) => !a.startsWith("--"));

function readEnvDatabaseUrl() {
  const envText = fs.readFileSync(".env", "utf8");
  const line = envText
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL not found in .env");
  return line.replace(/^\s*DATABASE_URL=/, "").trim().replace(/^"|"$/g, "");
}

function resolveTargetUrl() {
  if (process.env.TARGET_DATABASE_URL) return process.env.TARGET_DATABASE_URL;
  if (targetArg) return targetArg.slice("--target=".length);
  return readEnvDatabaseUrl();
}

function resolveBackupFile() {
  if (fileArg) return fileArg;
  const dir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(dir)) {
    throw new Error("No backup file given and ./backups/ does not exist.");
  }
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith(".sql"))
    .sort();
  if (files.length === 0) {
    throw new Error("No backup file given and ./backups/ has no .sql files.");
  }
  return path.join(dir, files[files.length - 1]);
}

/** Split a SQL script into statements, ignoring `--` comments and quoted text. */
function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inComment = false;

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inComment) {
      if (ch === "\n") inComment = false;
      continue;
    }

    if (inSingle) {
      current += ch;
      if (ch === "\\") {
        if (next !== undefined) {
          current += next;
          i += 1;
        }
        continue;
      }
      if (ch === "'") inSingle = false;
      continue;
    }

    if (inDouble) {
      current += ch;
      if (ch === "\\") {
        if (next !== undefined) {
          current += next;
          i += 1;
        }
        continue;
      }
      if (ch === '"') inDouble = false;
      continue;
    }

    if (inBacktick) {
      current += ch;
      if (ch === "`") inBacktick = false;
      continue;
    }

    if (ch === "-" && next === "-") {
      inComment = true;
      i += 1;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      current += ch;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      current += ch;
      continue;
    }
    if (ch === "`") {
      inBacktick = true;
      current += ch;
      continue;
    }
    if (ch === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function main() {
  const file = resolveBackupFile();
  const targetUrl = resolveTargetUrl();

  if (!fs.existsSync(file)) throw new Error(`Backup file not found: ${file}`);
  const sql = fs.readFileSync(file, "utf8");
  const statements = splitSqlStatements(sql);

  const target = new URL(targetUrl.replace(/^mysql:/, "http:"));
  const database = target.pathname.replace(/^\//, "") || "railway";
  const host = `${target.hostname}:${target.port || 3306}`;

  console.log(`Backup file: ${file}`);
  console.log(`Statements:  ${statements.length}`);
  console.log(`Target:      mysql://${host}/${database}`);

  if (dryRun) {
    const kinds = {};
    for (const statement of statements) {
      const keyword = statement.split(/\s+/)[0].toUpperCase();
      kinds[keyword] = (kinds[keyword] || 0) + 1;
    }
    console.log("By statement:", kinds);

    const suspicious = statements.filter(
      (statement) => !/^(DROP|CREATE|INSERT|SET|USE|ALTER|DELETE|REPLACE|LOCK|UNLOCK)\b/i.test(statement)
    );
    if (suspicious.length > 0) {
      console.log(`\nSuspicious statements (${suspicious.length}):`);
      for (const statement of suspicious.slice(0, 10)) {
        console.log("  >", statement.slice(0, 160));
      }
    }

    console.log("\n--dry-run: parsed only, nothing was written to MySQL.");
    return;
  }

  if (!confirmed) {
    console.log(
      "\nRefusing to import without --yes (this DROPs and recreates the target tables)."
    );
    console.log("Re-run with --yes to proceed.");
    process.exitCode = 1;
    return;
  }

  const conn = await mysql.createConnection({
    host: target.hostname,
    port: Number(target.port || 3306),
    user: decodeURIComponent(target.username),
    password: decodeURIComponent(target.password),
    ssl: targetUrl.includes("accept_invalid_certs")
      ? { rejectUnauthorized: false }
      : undefined,
    multipleStatements: false,
    connectTimeout: 30000,
  });

  const [[verRow]] = await conn.query("SELECT VERSION() AS v");
  console.log(`\nConnected: MySQL ${verRow.v}`);

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.query(`USE \`${database}\``);

  const startedAt = Date.now();
  let done = 0;
  for (const statement of statements) {
    try {
      await conn.query(statement);
    } catch (error) {
      console.error(`\nFailed at statement ${done + 1}:`);
      console.error(statement.slice(0, 300));
      throw error;
    }
    done += 1;
    if (done % 200 === 0) {
      process.stdout.write(`\rExecuted ${done}/${statements.length}...`);
    }
  }

  await conn.end();

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\rExecuted ${done}/${statements.length} statements in ${seconds}s.`);
  console.log("Import complete.");
}

main().catch((error) => {
  console.error("\nRestore failed:", error.message);
  process.exit(1);
});
