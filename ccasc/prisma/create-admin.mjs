import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating admin account...\n');

  const hashedPassword = await bcrypt.hash('1234', 12);
  console.log('✓ Password hashed');

  const existing = await prisma.staff.findUnique({ where: { email: 'admin' } });

  if (existing) {
    await prisma.staff.update({
      where: { email: 'admin' },
      data: { password: hashedPassword },
    });
    console.log('✓ Updated existing admin password');
  } else {
    await prisma.staff.create({
      data: {
        firstName: 'Admin',
        lastName: 'Admin',
        email: 'admin',
        contactNumber: '00000000000',
        password: hashedPassword,
        status: 'Active',
        staffRoleId: 2,
        staffOrgId: 1,
      },
    });
    console.log('✓ Created new admin account');
  }

  const admin = await prisma.staff.findUnique({
    where: { email: 'admin' },
    include: { staffRole: true },
  });
  
  console.log(`\n✅ Admin account ready`);
  console.log(`   Email:    admin`);
  console.log(`   Password: 1234`);
  console.log(`   Role:     ${admin.staffRole.roleName}`);

  await prisma.$disconnect();
}

main().catch(console.error);