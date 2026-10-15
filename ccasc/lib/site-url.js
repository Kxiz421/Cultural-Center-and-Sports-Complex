/**
 * Absolute origin of the public site.
 *
 * Used for `metadataBase`, canonical URLs, Open Graph images, robots.txt and
 * the sitemap, so it must always be an absolute URL with a protocol.
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_SITE_URL` — set this to your custom domain in production
 *      (e.g. "https://booking.southcotabato.gov.ph").
 *   2. Vercel's production / deployment URL, when running on Vercel.
 *   3. localhost, so `next dev` keeps working.
 */
export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return withProtocol(explicit);

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return withProtocol(vercel);

  return "http://localhost:3000";
}

/** "example.com/" -> "https://example.com"; leaves an existing protocol alone. */
function withProtocol(value) {
  const trimmed = String(value).trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
