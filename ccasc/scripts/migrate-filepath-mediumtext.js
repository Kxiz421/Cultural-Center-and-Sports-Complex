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
    // Change file_path to MEDIUMTEXT (16MB limit) to support base64 images
    await conn.execute("ALTER TABLE Document MODIFY COLUMN file_path MEDIUMTEXT NULL");
    console.log("✅ file_path changed to MEDIUMTEXT NULL");

    // Verify column types
    const [rows] = await conn.execute("SHOW COLUMNS FROM Document WHERE Field IN ('file_path', 'booking_id')");
    rows.forEach(r => console.log(`  ${r.Field}: ${r.Type} (Null: ${r.Null})`));
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await conn.end();
  }
}

main();