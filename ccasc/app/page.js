"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2, LogIn, UserPlus } from "lucide-react";
import { LOGIN_PAGE_BACKGROUND } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <Image
        src={LOGIN_PAGE_BACKGROUND}
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/55" aria-hidden />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        <div className="bg-primary text-primary-foreground mb-4 flex size-16 items-center justify-center rounded-xl shadow-lg">
          <Building2 className="size-8" />
        </div>

        <p className="text-2xl font-extrabold uppercase tracking-wider text-white drop-shadow-sm md:text-3xl">
          Provincial Government of South Cotabato
        </p>
        <h1 className="mt-2 text-lg font-bold tracking-tight text-white/90 md:text-xl">
          Gymnasium & Cultural Center / Sports Complex
        </h1>

        <p className="mt-6 max-w-lg text-sm text-white/80 drop-shadow">
          Welcome to the official booking and reservation system for the
          South Cotabato Gymnasium and Cultural Center / Sports Complex.
          Manage facility reservations, event bookings, and more.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link href="/login">
            <Button size="lg" className="w-56 gap-2 text-base">
              <LogIn className="size-5" />
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="lg"
              variant="secondary"
              className="w-56 gap-2 text-base"
            >
              <UserPlus className="size-5" />
              Register as Client
            </Button>
          </Link>
        </div>
      </div>

      <p className="absolute bottom-6 z-10 max-w-lg text-center text-xs text-white/50 drop-shadow">
        Problems signing in? Contact your facility or provincial IT support.
      </p>
    </div>
  );
}