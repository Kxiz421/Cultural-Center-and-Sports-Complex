"use client";

import { Building2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/landing/reveal";
import { useLandingFacilities } from "@/components/landing/use-facilities";
import { VENUES } from "@/lib/landing-content";

export function LandingVenues() {
  // Facility names come from the same records the admin Facility Management
  // screen lists, so a venue card can never advertise a facility that is gone.
  const { byVenue } = useLandingFacilities();

  return (
    <section
      id="venues"
      aria-labelledby="venues-title"
      className="relative isolate scroll-mt-20 overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-10 size-80 rounded-full bg-blue-500/10 blur-3xl"
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal direction="left" className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
            Venues
          </p>
          <h2
            id="venues-title"
            className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Two venues, one booking system
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Every facility below is managed through this system, so availability
            you see here is the same availability the coordinators work from.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {VENUES.map((venue, index) => {
            const facilityNames = (
              byVenue.find((group) => group.venueId === venue.venueId)
                ?.facilities ?? []
            ).map((facility) => facility.name);

            return (
              <Reveal
                key={venue.name}
                delay={index * 120}
                direction={index % 2 === 0 ? "left" : "right"}
              >
              <article
                className="flex h-full flex-col rounded-3xl bg-card p-6 shadow-sm ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
              <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 text-blue-600">
                <Building2 className="size-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold leading-snug">
                {venue.name}
              </h3>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                <span>{venue.address}</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {venue.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t pt-4">
                {facilityNames.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    Loading facilities…
                  </span>
                ) : (
                  facilityNames.map((name) => (
                    <Badge key={name} variant="secondary">
                      {name}
                    </Badge>
                  ))
                )}
              </div>
            </article>
            </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}