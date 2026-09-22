/**
 * Edge-safe Auth.js (NextAuth v5) configuration.
 *
 * This file must stay free of Node-only dependencies (Prisma, bcryptjs,
 * mysql2) because proxy.js imports it and runs in the Edge runtime.
 * The Credentials provider itself is added in `auth.js` (Node runtime).
 *
 * Session strategy: signed JWT stored in an httpOnly cookie - the browser
 * never sees or manages the token, and localStorage is no longer trusted.
 */
export const authConfig = {
  // Required behind a proxy / on Vercel so Auth.js trusts the host header.
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 hours
  },
  providers: [],
  callbacks: {
    /** Copy our custom claims into the JWT at sign-in time. */
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.type = user.type;
        token.role = user.role ?? null;
        token.firstName = user.firstName ?? "";
        token.lastName = user.lastName ?? "";
        token.clientId = user.clientId ?? null;
        token.orgName = user.orgName ?? null;
        token.remarks = user.remarks ?? null;
      }
      return token;
    },
    /** Expose the claims to server components and the client session. */
    session({ session, token }) {
      if (session.user) {
        session.user.userId = token.userId ?? null;
        session.user.type = token.type ?? null;
        session.user.role = token.role ?? null;
        session.user.firstName = token.firstName ?? "";
        session.user.lastName = token.lastName ?? "";
        session.user.clientId = token.clientId ?? null;
        session.user.orgName = token.orgName ?? null;
        session.user.remarks = token.remarks ?? null;
      }
      return session;
    },
  },
};
