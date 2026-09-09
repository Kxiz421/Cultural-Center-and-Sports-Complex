import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { createConnection } from "net";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const url = process.env.DATABASE_URL || "";
let host = "unknown";
let port = "unknown";
try {
  const parsed = new URL(url.replace(/^mysql:\/\//, "http://"));
  host = parsed.hostname;
  port = parsed.port;
} catch {}

function tcpProbe(h, p, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = createConnection({ host: h, port: Number(p) }, () => {
      socket.destroy();
      resolve({ ok: true, ms: Date.now() - start });
    });
    socket.setTimeout(timeoutMs);
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ ok: false, reason: "timeout", ms: Date.now() - start });
    });
    socket.on("error", (err) => {
      resolve({ ok: false, reason: err.code || err.message, ms: Date.now() - start });
    });
  });
}

const tcp = await tcpProbe(host, port);
const prisma = new PrismaClient();
const start = Date.now();
let prismaResult;
try {
  await prisma.$queryRaw`SELECT 1`;
  prismaResult = { ok: true, ms: Date.now() - start };
} catch (e) {
  prismaResult = {
    ok: false,
    code: e.code,
    msg: String(e.message || e).slice(0, 160),
    ms: Date.now() - start,
  };
} finally {
  await prisma.$disconnect();
}

console.log(JSON.stringify({ host, port, hasUrl: !!url, tcp, prisma: prismaResult }, null, 2));
