import { NextResponse } from "next/server";

/**
 * Deterministic sign-out.
 *
 * Auth.js re-issues the session cookie on every `GET /api/auth/session`
 * (see `@auth/core`'s session() -> sessionStore.chunk(newToken)), so a session
 * fetch that is still in flight when the user signs out can revive the cookie a
 * moment after `signOut()` cleared it. The visitor then still holds a valid
 * session, and the proxy bounces `/login` straight back to the dashboard -
 * which reads as "I signed out but I'm still logged in as the same account".
 *
 * This endpoint clears every Auth.js session cookie (chunked `.0/.1/...` and
 * `__Secure-` variants included) on its own response, so a single call after
 * signOut() cannot leave a live cookie behind. It lives under /api/auth so the
 * proxy never gates it (a replaced session still has to be able to sign out).
 */
export async function POST(request) {
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(request, response);
  return response;
}

export async function GET(request) {
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(request, response);
  return response;
}

function clearSessionCookies(request, response) {
  const names = new Set([
    "authjs.session-token",
    "__Secure-authjs.session-token",
  ]);

  // Expire any variant actually present on the request (keeps the exact name,
  // so the browser matches the cookie it set).
  try {
    for (const { name } of request.cookies.getAll()) {
      if (name.includes("authjs.session-token")) names.add(name);
    }
  } catch {
    /* no cookie header - the base names below still apply */
  }

  // Cover chunk suffixes even when the request header did not list them.
  for (const base of [
    "authjs.session-token",
    "__Secure-authjs.session-token",
  ]) {
    for (let i = 0; i < 4; i += 1) names.add(`${base}.${i}`);
  }

  for (const name of names) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      // __Secure-/__Host- cookies must be cleared with the Secure attribute.
      secure: name.startsWith("__Secure-") || name.startsWith("__Host-"),
    });
  }
}
