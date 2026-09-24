"use client";

import { Globe, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";
import { TransitionLink } from "@/components/route-transition";
import { CONTACT } from "@/lib/landing-content";

export function LandingContact() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal
          direction="zoom"
          blur
          className="relative isolate overflow-hidden rounded-[2.5rem] bg-foreground text-background"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl"
          />
          <div className="relative grid gap-10 p-8 sm:p-10 lg:grid-cols-2 lg:p-12">
            <div>
              <h2
                id="contact-title"
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Ready to book your event?
              </h2>
              <p className="mt-3 max-w-md text-base text-background/75">
                Create an account to file a reservation, or reach the office
                directly if you need help with an existing booking.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <TransitionLink href="/register" className="sm:w-auto">
                  <Button className="h-11 w-full gap-2 rounded-full bg-background px-6 text-base text-foreground hover:bg-background/90 sm:w-auto">
                    Register as client
                  </Button>
                </TransitionLink>
                <TransitionLink href="/login" className="sm:w-auto">
                  <Button
                    variant="outline"
                    className="h-11 w-full gap-2 rounded-full border-background/25 bg-transparent px-6 text-base text-background hover:bg-background/10 hover:text-background sm:w-auto"
                  >
                    Sign in
                  </Button>
                </TransitionLink>
              </div>
            </div>

            <div className="lg:justify-self-end">
              <p className="text-xs font-semibold uppercase tracking-wider text-background/60">
                Contact
              </p>
              <h3 className="mt-2 text-lg font-semibold">{CONTACT.office}</h3>
              <ul className="mt-5 space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-background/60"
                    aria-hidden
                  />
                  <span className="text-background/90">{CONTACT.address}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone
                    className="mt-0.5 size-4 shrink-0 text-background/60"
                    aria-hidden
                  />
                  <span className="text-background/90">
                    Tel. No. {CONTACT.phone}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Globe
                    className="mt-0.5 size-4 shrink-0 text-background/60"
                    aria-hidden
                  />
                  <span className="text-background/90">
                    Facebook: {CONTACT.facebook}
                  </span>
                </li>
              </ul>
              <p className="mt-6 border-t border-background/15 pt-4 text-xs text-background/60">
                {CONTACT.supportNote}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}