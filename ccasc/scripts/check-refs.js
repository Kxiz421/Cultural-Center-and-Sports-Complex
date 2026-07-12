const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const v = await p.facilityVenue.findMany();
    console.log('Venues:', JSON.stringify(v));
    const s = await p.availabilityStatus.findMany();
    console.log('Statuses:', JSON.stringify(s));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
})();