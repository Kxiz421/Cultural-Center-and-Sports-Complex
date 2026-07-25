const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const staff = await p.staff.findMany({
      include: {
        staffRole: true,
        staffOrg: true,
      },
    });
    console.log(JSON.stringify(staff, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
})();