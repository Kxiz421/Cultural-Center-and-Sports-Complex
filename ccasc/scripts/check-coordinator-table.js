const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Check Staff table for program coordinators
  const staffRoles = await prisma.staffRole.findMany();
  console.log("=== Staff Roles ===");
  console.log(JSON.stringify(staffRoles, null, 2));

  // Check all staff
  const allStaff = await prisma.staff.findMany({
    select: {
      staffId: true,
      firstName: true,
      lastName: true,
      email: true,
      staffRole: { select: { roleName: true } },
    },
  });
  console.log("\n=== All Staff ===");
  console.log(JSON.stringify(allStaff, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());