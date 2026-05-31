const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Backfilling usernames for existing users...\n");

  // Staff
  const staff = await prisma.staff.findMany({ where: { username: null } });
  for (const s of staff) {
    const base = `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}`;
    let username = base.replace(/[^a-z0-9._-]/g, "");

    // Check for uniqueness among staff
    let exists = await prisma.staff.findUnique({ where: { username } });
    let suffix = 1;
    while (exists) {
      username = `${base.replace(/[^a-z0-9._-]/g, "")}${suffix}`;
      exists = await prisma.staff.findUnique({ where: { username } });
      suffix++;
    }

    await prisma.staff.update({
      where: { staffId: s.staffId },
      data: { username },
    });
    console.log(`  Staff: ${s.firstName} ${s.lastName} -> ${username}`);
  }

  // Clients
  const clients = await prisma.client.findMany({ where: { username: null } });
  for (const c of clients) {
    const base = `${c.firstName.toLowerCase()}.${c.lastName.toLowerCase()}`;
    let username = base.replace(/[^a-z0-9._-]/g, "");

    // Check for uniqueness among clients
    let exists = await prisma.client.findUnique({ where: { username } });
    let suffix = 1;
    while (exists) {
      username = `${base.replace(/[^a-z0-9._-]/g, "")}${suffix}`;
      exists = await prisma.client.findUnique({ where: { username } });
      suffix++;
    }

    await prisma.client.update({
      where: { clientId: c.clientId },
      data: { username },
    });
    console.log(`  Client: ${c.firstName} ${c.lastName} -> ${username}`);
  }

  console.log(`\nDone! Updated ${staff.length} staff and ${clients.length} clients.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});