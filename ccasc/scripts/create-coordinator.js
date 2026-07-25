const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

(async () => {
  try {
    const existing = await p.staff.findFirst({
      where: { staffRoleId: 1, staffOrgId: 2 }
    });
    
    if (existing) {
      console.log('EXISTS:' + existing.staffId);
    } else {
      const hash = await bcrypt.hash('Coordinator123!', 12);
      const s = await p.staff.create({
        data: {
          username: 'coordinator.cultural',
          firstName: 'Coordinator',
          middleName: null,
          lastName: 'Cultural',
          email: 'coordinator@cultural.gov.ph',
          contactNumber: '09123456789',
          password: hash,
          status: 'Active',
          profilePhoto: null,
          staffRoleId: 1,
          staffOrgId: 2,
        },
      });
      console.log('CREATED:' + s.staffId);
    }
  } catch (e) {
    console.error('ERR:' + e.message);
  } finally {
    await p.$disconnect();
  }
})();