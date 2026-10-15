import { siteUrl } from "@/lib/site-url";

/**
 * Served at /robots.txt.
 *
 * Only the public landing page is meant to be indexed; every panel route sits
 * behind a sign-in and every API route is session-gated, so crawlers are told
 * to stay out of them.
 */
export default function robots() {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/panel/", "/api/", "/login", "/register", "/resubmit"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
