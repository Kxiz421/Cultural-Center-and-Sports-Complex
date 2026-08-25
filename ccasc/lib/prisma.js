import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

/**
 * Tune MySQL URL for Railway remote dev: longer pool wait + smaller pool size.
 * connect_timeout alone caused pool exhaustion (13 slots waiting 30s, pool_timeout 10s).
 */
function buildDatabaseUrl() {
  const raw = process.env.DATABASE_URL || "";
  if (!raw) return raw;

  const qIndex = raw.indexOf("?");
  const base = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const params = new URLSearchParams(qIndex === -1 ? "" : raw.slice(qIndex + 1));

  if (!params.has("connect_timeout")) params.set("connect_timeout", "30");
  if (!params.has("pool_timeout")) params.set("pool_timeout", "30");
  if (!params.has("connection_limit")) params.set("connection_limit", "5");

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  if (!globalForPrisma.prismaWarmupStarted) {
    globalForPrisma.prismaWarmupStarted = true;
    prisma.$connect().catch(() => {});
  }
}

export default prisma;
