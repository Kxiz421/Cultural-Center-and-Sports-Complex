const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const items = await p.particular.findMany();
    console.log('Particular count:', items.length);
    console.log('Particulars:', JSON.stringify(items, null, 2));
    
    const inv = await p.inventory.findMany();
    console.log('\nInventory count:', inv.length);
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
})();