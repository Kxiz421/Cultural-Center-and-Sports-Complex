import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import prisma from "../lib/prisma.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const start = Date.now();
try {
  await prisma.$queryRaw`SELECT 1`;
  console.log(JSON.stringify({ ok: true, ms: Date.now() - start }));
} catch (e) {
  console.log(
    JSON.stringify({
      ok: false,
      code: e.code,
      name: e.name,
      ms: Date.now() - start,
    })
  );
} finally {
  await prisma.$disconnect();
}
