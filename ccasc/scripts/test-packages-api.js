const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const pkgs = await p.package.findMany({
      include: {
        timeSlot: { select: { startTime: true, endTime: true } },
        inclusions: {
          include: { item: { select: { itemName: true } } },
        },
      },
    });
    console.log('Success:', pkgs.length);
    console.log(JSON.stringify(pkgs, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
})();