const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const pkgs = await p.package.findMany({
      include: { timeSlot: { select: { startTime: true, endTime: true } } },
    });
    console.log('Package count:', pkgs.length);
    console.log(JSON.stringify(pkgs, null, 2));
    
    const cols = await p.$queryRawUnsafe('SHOW COLUMNS FROM Package');
    console.log('\nPackage columns:');
    cols.forEach(c => console.log(`  ${c.Field} (${c.Type})`));
    
    const cols2 = await p.$queryRawUnsafe('SHOW COLUMNS FROM PackageInclusion');
    console.log('\nPackageInclusion columns:');
    cols2.forEach(c => console.log(`  ${c.Field} (${c.Type})`));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
})();