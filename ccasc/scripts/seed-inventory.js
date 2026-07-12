const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    // Check existing inventory
    const existing = await p.inventory.findMany();
    console.log('Existing inventory count:', existing.length);
    
    if (existing.length > 0) {
      console.log('Inventory already has data, no need to seed');
      return;
    }

    // Insert the inventory items referenced by PackageInclusion
    const items = [
      { itemName: 'Hurdles', unitCost: 5.00, quantityAvailable: 75, venueId: 2, statusId: 1 },
      { itemName: 'Wired Microphone', unitCost: 1200.00, quantityAvailable: 10, venueId: 1, statusId: 1 },
      { itemName: 'Table', unitCost: 258.00, quantityAvailable: 8, venueId: 1, statusId: 2 },
      { itemName: 'Chair', unitCost: 5.00, quantityAvailable: 700, venueId: 1, statusId: 1 },
      { itemName: 'Compressor', unitCost: 800.00, quantityAvailable: 10, venueId: 1, statusId: 3 },
      { itemName: 'Wireless Microphone', unitCost: 1200.00, quantityAvailable: 4, venueId: 1, statusId: 1 },
      { itemName: 'LED Wall', unitCost: 20000.00, quantityAvailable: 1, venueId: 1, statusId: 2 },
    ];

    for (const item of items) {
      await p.inventory.create({ data: item });
    }

    console.log(`Inserted ${items.length} inventory items`);
    
    // Verify
    const count = await p.inventory.count();
    console.log('Total inventory count:', count);
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
})();