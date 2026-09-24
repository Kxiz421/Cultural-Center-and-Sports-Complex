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

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
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