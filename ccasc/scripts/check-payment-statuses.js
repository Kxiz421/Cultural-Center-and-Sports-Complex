const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const statuses = await prisma.paymentStatus.findMany();
  console.log("Payment Statuses:", JSON.stringify(statuses, null, 2));

  const payments = await prisma.payment.findMany({
    take: 10,
    include: { status: true, booking: { include: { reservation: true } } },
    orderBy: { paymentId: "desc" },
  });
  console.log("Recent Payments:", JSON.stringify(payments, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());