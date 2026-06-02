const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const mapping = { 1: 6, 2: 2, 3: 3, 4: 7, 5: 4, 6: 5 };
  for (const [k, v] of Object.entries(mapping)) {
    await p.particular.update({
      where: { particularId: parseInt(k) },
      data: { itemId: v },
    });
  }
  console.log("Particulars fixed");
  await p.$disconnect();
})();