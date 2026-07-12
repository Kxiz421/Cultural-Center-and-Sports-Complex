const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const cols = await p.$queryRawUnsafe('SHOW COLUMNS FROM Particular');
    console.log('Particular columns:');
    console.log(JSON.stringify(cols, null, 2));
    
    const cols2 = await p.$queryRawUnsafe('SHOW COLUMNS FROM Inventory');
    console.log('\nInventory columns:');
    console.log(JSON.stringify(cols2, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
})();