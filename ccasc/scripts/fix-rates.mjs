import mysql from 'mysql2/promise';

async function fix() {
  const conn = await mysql.createConnection({
    host: 'tramway.proxy.rlwy.net',
    port: 54804,
    user: 'root',
    password: 'wagsHPZSQVUbBXHnzVtlleLdHqMyyXLe',
    database: 'railway',
    ssl: { rejectUnauthorized: false },
  });
  try {
    // Show current rates
    const [rates] = await conn.execute('SELECT * FROM FacilityRate ORDER BY rate_id');
    console.log('Current FacilityRate table:');
    rates.forEach(r => console.log('  rate_id=' + r.rate_id + ' day=' + r.day_rate + ' night=' + r.night_rate));

    // Fix rate_id=1 to be Cultural Center rate (20000/25000)
    // Fix rate_id=2 to be Basketball Court rate (1500/2000)
    await conn.execute('UPDATE FacilityRate SET day_rate=20000, night_rate=25000 WHERE rate_id=1');
    await conn.execute('UPDATE FacilityRate SET day_rate=1500, night_rate=2000 WHERE rate_id=2');
    console.log('\n✅ Fixed rate_id=1 → ₱20,000/₱25,000 (Cultural Center)');
    console.log('✅ Fixed rate_id=2 → ₱1,500/₱2,000 (Basketball Court)');

    // Verify
    const [facilities] = await conn.execute(
      'SELECT f.facility_name, fr.day_rate, fr.night_rate FROM Facility f JOIN FacilityRate fr ON f.rate_id=fr.rate_id WHERE f.venue_id=2 ORDER BY f.facility_id'
    );
    console.log('\n📋 Sports Complex Facilities (final):');
    facilities.forEach(f => console.log('   ' + f.facility_name + ' | Day: ₱' + Number(f.day_rate).toLocaleString() + ' | Night: ₱' + Number(f.night_rate).toLocaleString()));
  } finally { await conn.end(); }
}
fix().catch(e => { console.error(e); process.exit(1); });