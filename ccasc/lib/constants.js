/**
 * Login page background (file under `public/`).
 * Override with NEXT_PUBLIC_LOGIN_BG in `.env.local`, e.g.
 * NEXT_PUBLIC_LOGIN_BG=/images/backgrounds/my-photo.png
 */
export const LOGIN_PAGE_BACKGROUND =
  process.env.NEXT_PUBLIC_LOGIN_BG ?? "/images/backgrounds/login-bg.jpg";

/** Landing page logo (file under `public/`). */
export const PAGE_LOGO =
  process.env.NEXT_PUBLIC_PAGE_LOGO ?? "/PageLogo.webp";
