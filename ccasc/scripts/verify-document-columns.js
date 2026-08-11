const mysql = require("mysql2/promise");

async function main() {
  const conn = await mysql.createConnection({
    host: "sakura.proxy.rlwy.net",
    port: 35882,
    user: "root",
    password: "JVwqSWjQydXpHiGnnobfmnftOzTZZpNk",
    database: "railway",
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Make booking_id nullable
    await conn.execute("ALTER TABLE Document MODIFY COLUMN booking_id INT NULL");
    console.log("✅ booking_id changed to INT NULL");

    // Verify columns
    const [rows] = await conn.execute("SHOW COLUMNS FROM Document WHERE Field IN ('file_path', 'booking_id')");
    console.log("Current columns:");
    rows.forEach(r => console.log(`  ${r.Field}: ${r.Type} (Null: ${r.Null})`));
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await conn.end();
  }
}

main();