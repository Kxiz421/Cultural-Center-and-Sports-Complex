import { handlers } from "@/auth";

/**
 * Auth.js (NextAuth v5) endpoints:
 *   /api/auth/session, /api/auth/csrf, /api/auth/callback/credentials, ...
 *
 * Credentials sign-in touches MySQL and bcryptjs, so this must run on the
 * Node.js runtime (never Edge).
 */
export const { GET, POST } = handlers;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
