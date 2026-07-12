const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const alterations = [
      "ALTER TABLE Package ADD COLUMN description TEXT DEFAULT NULL",
      "ALTER TABLE Package ADD COLUMN IF NOT EXISTS status_id INT DEFAULT 1",
    ];

    for (const sql of alterations) {
      try {
        await p.$queryRawUnsafe(sql);
        console.log('✓', sql.substring(0, 60) + '...');
      } catch(e) {
        if (e.message.includes('Duplicate column')) {
          console.log('  Column already exists');
        } else {
          const sql2 = sql.replace('IF NOT EXISTS ', '');
          try {
            await p.$queryRawUnsafe(sql2);
            console.log('✓', sql2.substring(0, 60) + '...');
          } catch(e2) {
            if (e2.message.includes('Duplicate column')) {
              console.log('  Column already exists');
            } else {
              console.error('✗', e2.message.substring(0, 100));
            }
          }
        }
      }
    }

    const cols = await p.$queryRawUnsafe('SHOW COLUMNS FROM Package');
    console.log('\nFinal columns:');
    cols.forEach(c => console.log(`  ${c.Field} (${c.Type})`));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
})();