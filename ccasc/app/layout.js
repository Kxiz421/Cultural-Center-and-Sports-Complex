import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { RouteTransitionProvider } from "@/components/route-transition";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  // Show text immediately in the fallback stack instead of blocking on the
  // download, and keep a real sans-serif chain for when fonts.googleapis.com
  // is unreachable (offline dev machine / proxy). `--font-sans` in
  // `globals.css` adds a second system-font safety net behind this one.
  display: "swap",
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "Noto Sans",
    "sans-serif",
  ],
});

export const metadata = {
  title: "CCASC — South Cotabato Gymnasium & Cultural Center / Sports Complex",
  description:
    "Facility booking and administration for the South Cotabato Gymnasium and Cultural Center and Sports Complex.",
};

/*
 * `scroll-smooth` (Tailwind) sets `scroll-behavior: smooth` on <html>, which is
 * what makes the in-page anchors glide instead of jumping — the hero's
 * `#venues` link in `components/landing/landing-header.jsx` and the
 * `scroll-mt-20` sections it targets.
 *
 * `data-scroll-behavior="smooth"` is the opt-in Next.js asks for whenever that
 * style is present (it logs a dev-only warning otherwise). With it, the router
 * temporarily forces `scroll-behavior: auto` around the scroll/focus it does on
 * a route change, so an arriving page starts at the top instead of smoothing
 * its way there from the previous page's offset — a visible crawl that would
 * otherwise play out behind the route curtain. Hash-only navigations are
 * exempt, so clicking an anchor still scrolls smoothly.
 * https://nextjs.org/docs/messages/missing-data-scroll-behavior
 */
export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} h-full scroll-smooth antialiased`}
    >
      <head>
        {/* Runs before first paint so the scroll-reveal hidden state in
            `globals.css` only ever applies when scripting is available. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js');",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>
          <RouteTransitionProvider>{children}</RouteTransitionProvider>
        </Providers>
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}