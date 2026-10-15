import { siteUrl } from "@/lib/site-url";

/**
 * Served at /sitemap.xml — the URLs to hand to Google Search Console.
 *
 * Only the landing page is public and indexable; the auth pages and everything
 * under /panel are deliberately excluded (see app/robots.js).
 */
export default function sitemap() {
  const base = siteUrl();

  return [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
