<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Authentication & authorization (read before touching auth code)

This app uses **Auth.js (NextAuth v5)** with the **JWT session strategy**.

| Concern | File |
| --- | --- |
| Credentials verification, rate limiting, error codes | `auth.js` |
| Edge-safe session/JWT config (no Prisma here!) | `auth.config.js` |
| Route protection for pages + `/api/*` | `proxy.js` (Next 16 "Proxy", formerly Middleware) |
| Role matrix (types → panels → API rules) | `lib/auth-roles.js` |
| Per-route guard helper | `lib/api-auth.js` |

Rules of engagement:

1. **Never** read identity from `localStorage` for authorization. The
   `user_id` / `role` localStorage keys are display-only mirrors kept for
   panel headers and audit rows.
2. Every API route handler starts with
   `const guard = await requireApiAuth([...roles]);` followed by
   `if (guard.response) return guard.response;` — add new routes the same way
   and register their role in `lib/auth-roles.js` `API_RULES` (proxy.js reads
   the same table, so both layers stay in sync).
3. Client-role data must be scoped with `resolveClientScope(user, requestedId)`
   so a crafted `?clientId=` cannot expose another client's records.
4. `auth.config.js` must stay dependency-free (Edge runtime). Prisma/bcrypt may
   only be imported from `auth.js` or `lib/*` used by Node routes.
5. Login is the single authentication point: `/api/auth/[...nextauth]`.
   Do not add another endpoint that validates passwords or mints sessions.

