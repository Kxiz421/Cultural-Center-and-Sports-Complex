const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const staffRoles = await p.staffRole.findMany();
    console.log('Staff Roles:', JSON.stringify(staffRoles, null, 2));
    
    const staffOrgs = await p.staffOrganization.findMany();
    console.log('Staff Orgs:', JSON.stringify(staffOrgs, null, 2));
    
    const clientRoles = await p.clientRole.findMany();
    console.log('Client Roles:', JSON.stringify(clientRoles, null, 2));
    
    const clientOrgs = await p.clientOrganization.findMany();
    console.log('Client Orgs:', JSON.stringify(clientOrgs, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
})();