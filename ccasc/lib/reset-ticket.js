import { createHmac, timingSafeEqual } from "node:crypto";

const TICKET_TTL_MS = 10 * 60 * 1000;

function signingKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return secret;
}

function sign(payload) {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function createResetTicket(account) {
  const payload = Buffer.from(
    JSON.stringify({
      u: account.userType,
      i: account.id,
      exp: Date.now() + TICKET_TTL_MS,
    }),
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifyResetTicket(ticket) {
  if (typeof ticket !== "string") return null;

  const [payload, signature] = ticket.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const provided = Buffer.from(signature);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return null;
  }

  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!data || typeof data.i !== "number" || !data.u) return null;
  if (typeof data.exp !== "number" || data.exp <= Date.now()) return null;

  return { userType: data.u, id: data.i };
}
