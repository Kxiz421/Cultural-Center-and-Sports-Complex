import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import prisma from "../lib/prisma.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const start = Date.now();
const tasks = [
  prisma.staff.findFirst({ select: { staffId: true } }),
  prisma.calendarBlock.findMany({ take: 1 }),
  prisma.reservation.findMany({ take: 1 }),
];

try {
  await Promise.all(tasks);
  console.log(JSON.stringify({ ok: true, concurrent: 3, ms: Date.now() - start }));
} catch (e) {
  console.log(
    JSON.stringify({
      ok: false,
      name: e.name,
      code: e.code,
      msg: String(e.message || e).slice(0, 200),
      ms: Date.now() - start,
    })
  );
} finally {
  await prisma.$disconnect();
}
