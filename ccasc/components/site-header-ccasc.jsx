"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { PAGE_LOGO } from "@/lib/constants";

export function SiteHeaderCCASC({ title }) {
  return (
    <header className="navbar-surface flex h-14 shrink-0 items-center gap-2 border-b border-white/20 px-4 text-white lg:px-6">
      <SidebarTrigger className="-ml-1 text-white hover:bg-white/10 hover:text-white" />
      <Separator orientation="vertical" className="mx-2 h-4 bg-white/25" />
      <img src={PAGE_LOGO} alt="" className="h-7 w-auto shrink-0" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-xs uppercase tracking-wide text-white/70">
          CCASC Administration
        </p>
        <h1 className="truncate text-base font-semibold">{title}</h1>
      </div>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
