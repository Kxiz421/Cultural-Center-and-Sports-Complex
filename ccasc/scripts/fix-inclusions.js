const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    // Update itemId 1 (Hurdles) -> rename to "LED Wall" with qty 1
    await p.$queryRawUnsafe('UPDATE Inventory SET item_name = "LED Wall", quantity_available = 1 WHERE item_id = 1');
    console.log('Updated itemId 1: Hurdles -> LED Wall (qty 1)');

    // Update itemId 4 (Chair) -> set qty to 700
    await p.$queryRawUnsafe('UPDATE Inventory SET quantity_available = 700 WHERE item_id = 4');
    console.log('Updated itemId 4: Chair qty -> 700');

    // Fix PackageInclusion quantities: itemId 1 (LED Wall) should be qty 1, itemId 4 (Chair) should be qty 700
    await p.$queryRawUnsafe('UPDATE PackageInclusion SET quantity_available = 1 WHERE item_id = 1');
    console.log('Fixed PackageInclusion: itemId 1 (LED Wall) qty -> 1');
    await p.$queryRawUnsafe('UPDATE PackageInclusion SET quantity_available = 700 WHERE item_id = 4');
    console.log('Fixed PackageInclusion: itemId 4 (Chair) qty -> 700');

    // Delete extra items (itemId 5, 6, 7) that are not referenced by PackageInclusion
    const refs = await p.$queryRawUnsafe('SELECT DISTINCT item_id FROM PackageInclusion');
    const refIds = refs.map(r => r.item_id);
    console.log('Referenced item IDs:', refIds);

    for (let id = 5; id <= 7; id++) {
      if (!refIds.includes(id)) {
        await p.$queryRawUnsafe('DELETE FROM Inventory WHERE item_id = ?', id);
        console.log(`Deleted unreferenced itemId ${id}`);
      }
    }

    // Verify
    const inv = await p.inventory.findMany({ orderBy: { itemId: 'asc' } });
    console.log('\nFinal inventory:');
    inv.forEach(i => console.log(`  itemId=${i.itemId}, name=${i.itemName}, qty=${i.quantityAvailable}`));

    const incs = await p.$queryRawUnsafe('SELECT * FROM PackageInclusion ORDER BY package_inclusion_id');
    console.log('\nPackage inclusions:');
    incs.forEach(i => console.log(`  incId=${i.package_inclusion_id}, pkgId=${i.package_id}, itemId=${i.item_id}, qty=${i.quantity_available}`));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
})();