const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Delete the old notification that has the combined message format
  const result = await prisma.notification.deleteMany({
    where: {
      message: {
        contains: "DECLINED. Reason:",
      },
    },
  });
  console.log(`Deleted ${result.count} old notification(s) with combined message format`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());