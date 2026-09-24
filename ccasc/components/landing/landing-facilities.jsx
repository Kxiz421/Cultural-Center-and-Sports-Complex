"use client";

import { Info, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/landing/reveal";
import { ADD_ONS, FACILITIES, formatPeso } from "@/lib/landing-content";

export function LandingFacilities() {
  return (
    <section
      id="facilities"
      aria-labelledby="facilities-title"
      className="scroll-mt-20 bg-gradient-to-b from-muted/60 via-muted/25 to-transparent"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal direction="left" className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
            Facilities
          </p>
          <h2
            id="facilities-title"
            className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Facilities and reference rates
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Day and night slots are priced separately, and every rate includes
            the basic light and sound system.
          </p>
        </Reveal>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FACILITIES.map((facility, index) => (
            <Reveal
              key={facility.name}
              as="li"
              delay={Math.min(index * 80, 240)}
              direction={index % 2 === 0 ? "left" : "right"}
            >
              <div className="flex h-full flex-col rounded-3xl bg-card p-5 shadow-sm ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <Badge variant="outline" className="w-fit">
                {facility.venue}
              </Badge>
              <h3 className="mt-3 text-base font-semibold leading-snug">
                {facility.name}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {facility.description}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-2 border-t pt-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Day</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatPeso(facility.dayRate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Night</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatPeso(facility.nightRate)}
                  </dd>
                </div>
              </dl>
              </div>
            </Reveal>
          ))}
        </ul>

        <Reveal as="p" className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Rates shown are for reference only. The official Order of Payment
          issued for your reservation is the final basis for payment.
        </Reveal>

        <Reveal direction="zoom" blur className="mt-10 rounded-3xl bg-card p-6 shadow-sm ring-1 ring-foreground/10">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 text-blue-600">
              <PackageOpen className="size-5" aria-hidden />
            </div>
            <div>
              <h3 className="text-base font-semibold">Equipment and add-ons</h3>
              <p className="text-sm text-muted-foreground">
                Optional items you can attach to a reservation, subject to
                availability.
              </p>
            </div>
          </div>
          <ul className="mt-5 flex flex-wrap gap-2">
            {ADD_ONS.map((addOn) => (
              <li
                key={addOn.name}
                className="rounded-full border bg-muted/50 px-3.5 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <span className="font-medium">{addOn.name}</span>
                <span className="text-muted-foreground"> · {addOn.note}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}