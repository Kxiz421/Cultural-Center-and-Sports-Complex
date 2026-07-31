const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const p = new PrismaClient();

(async () => {
  try {
    // Check if LTOO role already exists
    let existingRole = await p.staffRole.findFirst({
      where: { roleName: "Local Treasury Operations Officer" },
    });

    if (!existingRole) {
      existingRole = await p.staffRole.create({
        data: { roleName: "Local Treasury Operations Officer" },
      });
      console.log(`✅ Created role: Local Treasury Operations Officer (ID: ${existingRole.roleId})`);
    } else {
      console.log(`ℹ️ Role already exists: Local Treasury Operations Officer (ID: ${existingRole.roleId})`);
    }

    // Check if org exists
    let existingOrg = await p.staffOrganization.findFirst({
      where: { orgName: "Local Treasury Office" },
    });

    if (!existingOrg) {
      existingOrg = await p.staffOrganization.create({
        data: { orgName: "Local Treasury Office" },
      });
      console.log(`✅ Created organization: Local Treasury Office (ID: ${existingOrg.staffOrgId})`);
    } else {
      console.log(`ℹ️ Organization already exists: Local Treasury Office (ID: ${existingOrg.staffOrgId})`);
    }

    // Check if default LTOO user exists
    const existingStaff = await p.staff.findFirst({
      where: { email: "ltoo@csasc.gov.ph" },
    });

    if (!existingStaff) {
      const hashedPassword = await bcrypt.hash("LTOO@2024!", 10);
      const staff = await p.staff.create({
        data: {
          username: "LTOO",
          firstName: "Local Treasury",
          middleName: "",
          lastName: "Officer",
          email: "ltoo@csasc.gov.ph",
          contactNumber: "N/A",
          password: hashedPassword,
          status: "Active",
          staffRoleId: existingRole.roleId,
          staffOrgId: existingOrg.staffOrgId,
        },
      });
      console.log(`✅ Created default LTOO user (ID: ${staff.staffId})`);
      console.log(`   Email: ltoo@csasc.gov.ph / Password: LTOO@2024!`);
    } else {
      console.log(`ℹ️ Default LTOO user already exists`);
    }

    console.log('\n✅ Script completed successfully!');
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await p.$disconnect();
  }
})();