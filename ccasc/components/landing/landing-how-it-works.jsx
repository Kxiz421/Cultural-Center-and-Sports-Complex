"use client";

import {
  BadgeCheck,
  CalendarPlus,
  ClipboardCheck,
  Clock,
  ReceiptText,
  UserPlus,
  Wallet,
} from "lucide-react";
import { DEPOSIT_RATE, MIN_LEAD_TIME, STEPS } from "@/lib/landing-content";
import { Reveal } from "@/components/landing/reveal";

const STEP_ICONS = [UserPlus, CalendarPlus, ReceiptText, BadgeCheck];

export function LandingHowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="relative isolate scroll-mt-20 overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 size-80 rounded-full bg-indigo-500/10 blur-3xl"
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal direction="left" className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
            How it works
          </p>
          <h2
            id="how-it-works-title"
            className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            From reservation to confirmation
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            The same four steps every booking goes through, with the status of
            yours visible in your dashboard the whole way.
          </p>
        </Reveal>

        <div className="relative mt-10">
          {/* A soft gradient thread tying the steps together on wide screens. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent lg:block"
          />
          <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? ClipboardCheck;
            return (
              <Reveal
                key={step.title}
                as="li"
                delay={Math.min(index * 80, 240)}
                direction={index % 2 === 0 ? "left" : "right"}
              >
                <div className="flex h-full flex-col rounded-3xl bg-card p-5 shadow-sm ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 text-blue-600">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold leading-snug">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
                </div>
              </Reveal>
            );
          })}
          </ol>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Reveal direction="left">
            <div className="flex h-full items-start gap-3 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 text-blue-600">
              <Clock className="size-5" aria-hidden />
            </div>
            <div>
              <h3 className="text-base font-semibold">
                Book {MIN_LEAD_TIME} days ahead
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Reservations need at least {MIN_LEAD_TIME} days of lead time so
                the venue can be prepared and conflicts can be avoided.
              </p>
              </div>
            </div>
          </Reveal>
          <Reveal direction="right">
            <div className="flex h-full items-start gap-3 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 text-blue-600">
              <Wallet className="size-5" aria-hidden />
            </div>
            <div>
              <h3 className="text-base font-semibold">
                A {Math.round(DEPOSIT_RATE * 100)}% deposit secures your slot
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                The Order of Payment issued after review already includes the
                deposit, which is credited against your total.
              </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}