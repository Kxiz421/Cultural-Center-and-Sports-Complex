import mysql from 'mysql2/promise';

const DB_URL = new URL('mysql://root:wagsHPZSQVUbBXHnzVtlleLdHqMyyXLe@tramway.proxy.rlwy.net:54804/railway?sslaccept=accept_invalid_certs');

async function run() {
  const conn = await mysql.createConnection({
    host: DB_URL.hostname,
    port: DB_URL.port,
    user: DB_URL.username,
    password: DB_URL.password,
    database: DB_URL.pathname.replace('/', ''),
    ssl: { rejectUnauthorized: false },
    multipleStatements: true,
  });

  try {
    // 1. Add a new FacilityRate row for Boxing Ring (day: 2000, night: 3000)
    await conn.execute(
      `INSERT INTO FacilityRate (day_rate, night_rate) VALUES (2000.00, 3000.00)`
    );
    console.log('✅ Created Boxing Ring rate (day: ₱2,000, night: ₱3,000)');

    // 2. Move Basketball Court from Cultural Center (venue_id=1) to Sports Complex (venue_id=2)
    const [moveResult] = await conn.execute(
      `UPDATE Facility SET venue_id = 2 WHERE facility_name = 'Basketball Court'`
    );
    console.log(`✅ Moved Basketball Court to Sports Complex (affected: ${moveResult.affectedRows})`);

    // 3-4. Get the new rate_id and add Boxing Ring
    const [rows] = await conn.execute(`SELECT MAX(rate_id) AS last_id FROM FacilityRate`);
    const boxingRateId = rows[0].last_id;

    await conn.execute(
      `INSERT INTO Facility (facility_name, description, capacity, rate_id, status_id, venue_id)
       VALUES ('Boxing Ring', 'Professional boxing ring with ropes and padded corners for boxing matches and training', 0, ?, 1, 2)`,
      [boxingRateId]
    );
    console.log(`✅ Added Boxing Ring facility (rate_id=${boxingRateId}) to Sports Complex`);

    // Verify
    const [facilities] = await conn.execute(
      `SELECT f.facility_id, f.facility_name, f.venue_id, fv.venue,
              fr.day_rate, fr.night_rate
       FROM Facility f
       JOIN FacilityVenue fv ON f.venue_id = fv.venue_id
       JOIN FacilityRate fr ON f.rate_id = fr.rate_id
       WHERE f.venue_id = 2
       ORDER BY f.facility_id`
    );
    console.log('\n📋 Sports Complex Facilities (verified):');
    for (const f of facilities) {
      console.log(`   - ${f.facility_name} | Day: ₱${Number(f.day_rate).toLocaleString()} | Night: ₱${Number(f.night_rate).toLocaleString()}`);
    }

    console.log('\n✅ Migration complete! Boxing Ring and Basketball Court should now appear in the UI.');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});