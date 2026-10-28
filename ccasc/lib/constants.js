/**
 * Login page background (file under `public/`).
 * Override with NEXT_PUBLIC_LOGIN_BG in `.env.local`, e.g.
 * NEXT_PUBLIC_LOGIN_BG=/images/backgrounds/my-photo.png
 */
export const LOGIN_PAGE_BACKGROUND =
  process.env.NEXT_PUBLIC_LOGIN_BG ?? "/images/backgrounds/login-bg.jpg?v=2";

/** Landing page logo (file under `public/`). */
export const PAGE_LOGO =
  process.env.NEXT_PUBLIC_PAGE_LOGO ?? "/PageLogo.webp";

/** Secondary logo, shown beside {@link PAGE_LOGO} (file under `public/`). */
export const PAGE_LOGO_2 =
  process.env.NEXT_PUBLIC_PAGE_LOGO_2 ?? "/PageLogo2.webp";

/** Fallback avatar shown when a user has no (working) profile photo. */
export const DEFAULT_AVATAR =
  process.env.NEXT_PUBLIC_DEFAULT_AVATAR ?? "/default-avatar.svg";
