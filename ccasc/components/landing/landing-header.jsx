"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, ChevronDown, LogIn, UserPlus } from "lucide-react";
import { LOGIN_PAGE_BACKGROUND, PAGE_LOGO } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/route-transition";
import { HERO_STATS, NAV_LINKS } from "@/lib/landing-content";

/**
 * Sticky top navigation. Frosted and light so it stays readable over both the
 * dark hero photo and the light sections further down the page.
 */
function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <Image
            src={PAGE_LOGO}
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0"
          />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">
              Provincial Government of South Cotabato
            </span>
            <span className="truncate text-xs text-muted-foreground">
              Gymnasium &amp; Cultural Center / Sports Complex
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* `TransitionLink` (see `components/route-transition.jsx`) covers the
            screen while the auth route loads, so pressing these reads as one
            motion instead of an instant page swap. */}
        <div className="flex shrink-0 items-center gap-2">
          <TransitionLink href="/login">
            <Button size="sm" variant="ghost">
              Sign in
            </Button>
          </TransitionLink>
          <TransitionLink href="/register">
            <Button size="sm">Register</Button>
          </TransitionLink>
        </div>
      </div>
    </header>
  );
}

function LandingHero() {
  return (
    <section
      aria-labelledby="landing-hero-title"
      className="relative isolate overflow-hidden"
    >
      <Image
        src={LOGIN_PAGE_BACKGROUND}
        alt=""
        fill
        priority
        unoptimized
        className="object-cover"
        sizes="100vw"
      />
      {/* Gradient instead of a flat overlay: keeps the top and bottom edges
          readable and lets the photo show through in the middle. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/65 to-black/85"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 size-[28rem] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px] lg:left-1/3"
      />

      <div className="relative mx-auto flex min-h-[36rem] w-full max-w-6xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:min-h-[calc(100svh-3.5rem)] lg:items-start lg:px-8 lg:text-left">
        <p
          className="hero-enter inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur"
          style={{ animationDelay: "80ms" }}
        >
          <CalendarCheck className="size-3.5" aria-hidden />
          Online facility booking and reservation
        </p>

        <h1
          id="landing-hero-title"
          className="hero-enter mt-5 max-w-3xl bg-gradient-to-b from-white to-white/70 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl"
          style={{ animationDelay: "200ms" }}
        >
          South Cotabato Gymnasium &amp; Cultural Center / Sports Complex
        </h1>

        <p
          className="hero-enter mt-5 max-w-2xl text-lg text-white/85"
          style={{ animationDelay: "320ms" }}
        >
          Reserve the province&apos;s venues for graduations, concerts, sports
          meets and community events — file your reservation online, follow its
          status, and settle payment in one place.
        </p>

        <div
          className="hero-enter mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
          style={{ animationDelay: "440ms" }}
        >
          <TransitionLink href="/login" className="sm:w-auto">
            <Button
              size="lg"
              className="h-11 w-full gap-2 rounded-full bg-white px-6 text-base text-neutral-900 hover:bg-white/90 sm:w-auto"
            >
              <LogIn className="size-5" aria-hidden />
              Sign in
            </Button>
          </TransitionLink>
          <TransitionLink href="/register" className="sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="h-11 w-full gap-2 rounded-full border-white/25 bg-white/10 px-6 text-base text-white hover:bg-white/20 hover:text-white sm:w-auto"
            >
              <UserPlus className="size-5" aria-hidden />
              Register as client
            </Button>
          </TransitionLink>
        </div>

        <dl
          className="hero-enter mt-10 grid w-full max-w-lg grid-cols-3 gap-4 border-t border-white/15 pt-6"
          style={{ animationDelay: "560ms" }}
        >
          {HERO_STATS.map((stat) => (
            <div key={stat.label}>
              <dt className="text-xs text-white/70">{stat.label}</dt>
              <dd className="text-2xl font-bold tabular-nums text-white">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <a
        href="#venues"
        className="absolute bottom-14 left-1/2 z-10 -translate-x-1/2 rounded-full p-2 text-white/70 transition-colors hover:text-white"
        aria-label="Scroll to venues"
      >
        <ChevronDown className="size-5" aria-hidden />
      </a>
    </section>
  );
}

export function LandingHeaderHero() {
  return (
    <>
      <LandingHeader />
      <LandingHero />
    </>
  );
}