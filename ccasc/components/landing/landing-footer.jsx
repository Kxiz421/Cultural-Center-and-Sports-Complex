"use client";

import Image from "next/image";
import { NAV_LINKS } from "@/lib/landing-content";
import { PAGE_LOGO } from "@/lib/constants";
import { TransitionLink } from "@/components/route-transition";

export function LandingFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <Image
              src={PAGE_LOGO}
              alt=""
              width={44}
              height={44}
              className="size-11 shrink-0"
            />
            <div className="max-w-xs">
              <p className="text-sm font-semibold leading-snug">
                Provincial Government of South Cotabato
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                South Cotabato Gymnasium and Cultural Center / Sports Complex
              </p>
            </div>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <TransitionLink
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </TransitionLink>
            <TransitionLink
              href="/register"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Register
            </TransitionLink>
          </nav>
        </div>

        <p className="mt-8 border-t pt-6 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Provincial Government of South
          Cotabato. Facility booking and administration for the South Cotabato
          Gymnasium and Cultural Center and Sports Complex.
        </p>
      </div>
    </footer>
  );
}