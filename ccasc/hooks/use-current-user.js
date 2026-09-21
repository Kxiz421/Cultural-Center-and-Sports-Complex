"use client";

import * as React from "react";

/** Friendly display titles for the role strings stored at login. */
const ROLE_TITLES = {
  "admin": "System Administrator",
  "accounting clerk": "Accounting Clerk",
  "local treasury operations officer": "Local Treasury Operations Officer",
  "program coordinator cultural": "Program Coordinator",
  "program coordinator sports": "Program Coordinator",
  "provincial-agency": "Provincial Agency",
  "client": "Client",
};

function titleize(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function roleTitleFor(role) {
  return ROLE_TITLES[String(role || "").toLowerCase()] || titleize(role);
}

/**
 * Reads the signed-in user's name and role from localStorage after mount.
 *
 * Returns empty strings during SSR / static prerender so a document renders a
 * stable placeholder first, then hydrates with the real name on the client.
 */
export function useCurrentUser() {
  const [user, setUser] = React.useState({ name: "", role: "", roleTitle: "" });

  React.useEffect(() => {
    const name = (localStorage.getItem("user_name") || "").trim();
    const role = (localStorage.getItem("role") || "").trim();
    setUser({ name, role, roleTitle: roleTitleFor(role) });
  }, []);

  return user;
}
