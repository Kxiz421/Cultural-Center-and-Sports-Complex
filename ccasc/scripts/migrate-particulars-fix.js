const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    console.log('=== Current Particular columns ===');
    const cols = await p.$queryRawUnsafe('SHOW COLUMNS FROM Particular');
    cols.forEach(c => console.log(`  ${c.Field} (${c.Type}) ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'} Default: ${c.Default}`));

    console.log('\n=== Current Inventory items ===');
    const items = await p.$queryRawUnsafe('SELECT * FROM Inventory');
    items.forEach(i => console.log(`  item_id=${i.item_id}, item_name="${i.item_name}", qty=${i.quantity_available}`));

    console.log('\n=== Current Particulars ===');
    const particulars = await p.$queryRawUnsafe('SELECT * FROM Particular');
    particulars.forEach(p2 => console.log(`  particular_id=${p2.particular_id}, name="${p2.particular_name}", item_id=${p2.item_id}, total_quantity=${p2.total_quantity}`));

    // Step 1: Update item_id in Particular based on matching names with Inventory
    console.log('\n=== Updating item_id in Particular ===');
    const nameToItemId = {
      'Wireless Microphone': 6,
      'Wired Microphone': 2,
      'Table': 3,
      'LED Wall': 1,
      'Chair': 4,
      'Compressor': 5
    };

    for (const p2 of particulars) {
      const expectedItemId = nameToItemId[p2.particular_name];
      if (expectedItemId) {
        if (p2.item_id !== expectedItemId) {
          await p.$executeRawUnsafe(
            'UPDATE Particular SET item_id = ? WHERE particular_id = ?',
            expectedItemId, p2.particular_id
          );
          console.log(`  Updated "${p2.particular_name}" (id=${p2.particular_id}): item_id ${p2.item_id} -> ${expectedItemId}`);
        } else {
          console.log(`  "${p2.particular_name}" (id=${p2.particular_id}): item_id already ${expectedItemId} - OK`);
        }
      } else {
        console.log(`  "${p2.particular_name}" (id=${p2.particular_id}): no matching inventory item found`);
      }
    }

    // Step 2: Drop total_quantity column from Particular
    console.log('\n=== Dropping total_quantity column ===');
    try {
      await p.$executeRawUnsafe('ALTER TABLE Particular DROP COLUMN total_quantity');
      console.log('  total_quantity column dropped successfully');
    } catch (e) {
      console.log(`  Note: ${e.message}`);
    }

    // Step 3: Update Prisma schema to remove total_quantity
    console.log('\n=== Verification ===');
    const updatedCols = await p.$queryRawUnsafe('SHOW COLUMNS FROM Particular');
    console.log('Updated Particular columns:');
    updatedCols.forEach(c => console.log(`  ${c.Field} (${c.Type})`));

    const updatedParticulars = await p.$queryRawUnsafe('SELECT * FROM Particular');
    console.log('\nUpdated Particulars:');
    updatedParticulars.forEach(p2 => console.log(`  id=${p2.particular_id}, name="${p2.particular_name}", item_id=${p2.item_id}`));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
})();