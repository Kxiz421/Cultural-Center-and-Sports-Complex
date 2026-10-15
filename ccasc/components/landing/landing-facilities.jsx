"use client";

import * as React from "react";
import { Building2, ChevronDown, Info, PackageOpen, Trophy } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { useLandingFacilities } from "@/components/landing/use-facilities";
import { useLandingCatalog } from "@/components/landing/use-catalog";
import { FacilityDetailsDialog, isDisplayableImage } from "@/components/facility-details-dialog";
import { formatPeso } from "@/lib/landing-content";

/** Same icons the admin Facility Management screen uses for each venue. */
const VENUE_ICONS = { 1: Building2, 2: Trophy };

/** Sports Complex: one whole-day price; Cultural Center: Day and Night. */
function FacilityRates({ facility }) {
  if (Number(facility.venueId) === 2) {
    return (
      <dl className="mt-4 border-t pt-4 text-sm">
        <dt className="text-xs text-muted-foreground">
          Whole Day (8:00 AM – 5:00 PM)
        </dt>
        <dd className="font-semibold tabular-nums">
          {formatPeso(facility.rateDay)}
        </dd>
      </dl>
    );
  }

  return (
    <dl className="mt-4 grid grid-cols-2 gap-2 border-t pt-4 text-sm">
      <div>
        <dt className="text-xs text-muted-foreground">Day</dt>
        <dd className="font-semibold tabular-nums">
          {formatPeso(facility.rateDay)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Night</dt>
        <dd className="font-semibold tabular-nums">
          {formatPeso(facility.rateNight)}
        </dd>
      </div>
    </dl>
  );
}

function FacilityCard({ facility, onOpen }) {
  const image = (facility.images || []).find(isDisplayableImage);
  return (
    <button
      type="button"
      onClick={() => onOpen(facility)}
      className="flex h-full w-full flex-col overflow-hidden rounded-3xl bg-card text-left shadow-sm ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      {image ? (
        <img
          src={image}
          alt={facility.name}
          className="h-40 w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <h4 className="text-base font-semibold leading-snug">{facility.name}</h4>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {facility.description}
        </p>
        <FacilityRates facility={facility} />
      </div>
    </button>
  );
}

/**
 * One collapsible venue. Native <details>/<summary> like the FAQ section: no
 * extra dependency, works without JavaScript and is keyboard accessible.
 * `open` is driven by the parent so a re-render (for example when the facility
 * list arrives) cannot collapse what the visitor expanded.
 */
function VenueGroup({ group, open, onToggle, onOpen }) {
  const Icon = VENUE_ICONS[group.venueId] ?? Building2;
  const count = group.facilities.length;

  return (
    <details
      open={open}
      onToggle={(event) => onToggle(group.venueId, event.currentTarget.open)}
      className="group rounded-3xl bg-card shadow-sm ring-1 ring-foreground/10 transition-all duration-300 open:shadow-md open:ring-foreground/20"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 text-blue-600">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">{group.label}</span>
          <span className="block text-sm text-muted-foreground">
            {count} facilit{count === 1 ? "y" : "ies"}
          </span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>

      <div className="border-t px-5 pb-5 pt-5">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {group.facilities.map((facility) => (
            <li key={facility.facilityId} className="h-full">
              <FacilityCard facility={facility} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function FacilitiesSkeleton() {
  return (
    <div className="mt-10 space-y-3" aria-busy="true">
      <span className="sr-only">Loading facilities</span>
      {[0, 1].map((key) => (
        <div
          key={key}
          aria-hidden
          className="h-[5.25rem] animate-pulse rounded-3xl bg-card shadow-sm ring-1 ring-foreground/10"
        />
      ))}
    </div>
  );
}

/** Particulars a visitor can attach to a reservation, with the units on hand. */
function ParticularsCard({ particulars, loading }) {
  return (
    <Reveal
      direction="zoom"
      blur
      className="mt-10 rounded-3xl bg-card p-6 shadow-sm ring-1 ring-foreground/10"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 text-blue-600">
          <PackageOpen className="size-5" aria-hidden />
        </div>
        <div>
          <h3 className="text-base font-semibold">Particulars</h3>
          <p className="text-sm text-muted-foreground">
            Optional items you can attach to a reservation, subject to
            availability.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 space-y-2" aria-busy="true">
          <span className="sr-only">Loading particulars</span>
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              aria-hidden
              className="h-10 animate-pulse rounded-lg bg-muted/50"
            />
          ))}
        </div>
      ) : particulars.length === 0 ? (
        <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          The particulars list is maintained by the venue coordinators and could
          not be loaded right now. Please refresh the page, or contact the
          office for the latest items.
        </p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Particular
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                  Quantity available
                </th>
              </tr>
            </thead>
            <tbody>
              {particulars.map((item) => (
                <tr
                  key={item.particularId}
                  className="border-t border-foreground/10"
                >
                  <td className="px-4 py-2.5 font-medium">
                    {item.particularName}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                    {item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Reveal>
  );
}

/** One priced package: its name, time slot, rates and what it includes. */
function PackageCard({ pkg }) {
  const rates = [
    pkg.dayRate > 0 ? { label: "Day", value: pkg.dayRate } : null,
    pkg.nightRate > 0 ? { label: "Night", value: pkg.nightRate } : null,
    pkg.ledWallDayRate > 0
      ? { label: "LED Wall Day", value: pkg.ledWallDayRate }
      : null,
    pkg.ledWallNightRate > 0
      ? { label: "LED Wall Night", value: pkg.ledWallNightRate }
      : null,
  ].filter(Boolean);

  return (
    <div className="flex h-full flex-col rounded-3xl bg-card p-5 shadow-sm ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-base font-semibold leading-snug">{pkg.name}</h4>
        {pkg.timeSlot ? (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {pkg.timeSlot}
          </span>
        ) : null}
      </div>
      {pkg.description ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {pkg.description}
        </p>
      ) : null}
      {rates.length > 0 ? (
        <dl className="mt-4 grid grid-cols-2 gap-2 border-t pt-4 text-sm">
          {rates.map((rate) => (
            <div key={rate.label}>
              <dt className="text-xs text-muted-foreground">{rate.label}</dt>
              <dd className="font-semibold tabular-nums">
                {formatPeso(rate.value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {pkg.inclusions.length > 0 ? (
        <div className="mt-4 flex-1 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Includes
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {pkg.inclusions.map((inclusion, index) => (
              <li
                key={`${inclusion.name}-${index}`}
                className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs"
              >
                {inclusion.name}
                <span className="text-muted-foreground">
                  {" "}
                  ×{inclusion.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function LandingFacilities({ facilities, packages = [], particulars = [] }) {
  const { byVenue, loading } = useLandingFacilities(facilities);
  const catalog = useLandingCatalog({ packages, particulars });
  // The first venue starts expanded; the rest stay collapsed until asked for.
  const [openVenues, setOpenVenues] = React.useState(() => [1]);
  const [detailsFacility, setDetailsFacility] = React.useState(null);

  const handleToggle = React.useCallback((venueId, isOpen) => {
    setOpenVenues((previous) => {
      // Only react to real changes: the browser also fires `toggle` while the
      // `open` attribute React wrote is applied.
      if (previous.includes(venueId) === isOpen) return previous;
      return isOpen
        ? [...previous, venueId]
        : previous.filter((id) => id !== venueId);
    });
  }, []);

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
            Cultural Center facilities are priced per Day and per Night slot,
            while every Sports Complex facility is booked and billed for the
            whole day. Expand a venue to see its facilities and rates.
          </p>
        </Reveal>

        {loading ? (
          <FacilitiesSkeleton />
        ) : byVenue.length === 0 ? (
          <Reveal
            as="p"
            className="mt-10 flex items-start gap-2 rounded-3xl bg-card p-5 text-sm text-muted-foreground shadow-sm ring-1 ring-foreground/10"
          >
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            The facility list is maintained by the venue coordinators and could
            not be loaded right now. Please refresh the page, or contact the
            office for the latest facilities and rates.
          </Reveal>
        ) : (
          <div className="mt-10 space-y-3">
            {byVenue.map((group, index) => (
              <Reveal
                key={group.venueId}
                delay={Math.min(index * 120, 240)}
                direction={index % 2 === 0 ? "left" : "right"}
              >
                <VenueGroup
                  group={group}
                  open={openVenues.includes(group.venueId)}
                  onToggle={handleToggle}
                  onOpen={setDetailsFacility}
                />
              </Reveal>
            ))}
          </div>
        )}

        <Reveal as="p" className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          These facilities and rates are maintained by the venue coordinators.
          Rates shown are for reference only. The official Order of Payment
          issued for your reservation is the final basis for payment.
        </Reveal>

        <ParticularsCard
          particulars={catalog.particulars}
          loading={catalog.loading}
        />

        <Reveal direction="left" className="mt-14 max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
            Packages
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Cultural Center packages
          </h3>
          <p className="mt-3 text-base text-muted-foreground">
            Ready-made bundles that pair the venue with the items events usually
            need. Each package is priced for the slot it is booked in.
          </p>
        </Reveal>

        {catalog.loading ? (
          <div
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
          >
            <span className="sr-only">Loading packages</span>
            {[0, 1, 2].map((key) => (
              <div
                key={key}
                aria-hidden
                className="h-56 animate-pulse rounded-3xl bg-card shadow-sm ring-1 ring-foreground/10"
              />
            ))}
          </div>
        ) : catalog.packages.length === 0 ? (
          <Reveal
            as="p"
            className="mt-8 flex items-start gap-2 rounded-3xl bg-card p-5 text-sm text-muted-foreground shadow-sm ring-1 ring-foreground/10"
          >
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            The package list is maintained by the venue coordinators and could
            not be loaded right now. Please refresh the page, or contact the
            office for the latest packages.
          </Reveal>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.packages.map((pkg, index) => (
              <Reveal
                key={pkg.packageId}
                delay={Math.min(index * 80, 240)}
                direction={index % 2 === 0 ? "left" : "right"}
              >
                <PackageCard pkg={pkg} />
              </Reveal>
            ))}
          </div>
        )}
      </div>

      <FacilityDetailsDialog
        facility={detailsFacility}
        open={!!detailsFacility}
        onOpenChange={(open) => {
          if (!open) setDetailsFacility(null);
        }}
      />
    </section>
  );
}