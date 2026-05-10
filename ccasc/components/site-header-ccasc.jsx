"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function SiteHeaderCCASC({ title }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-2 h-4" />
      <div className="flex flex-col gap-0.5">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          CCASC Administration
        </p>
        <h1 className="text-base font-semibold">{title}</h1>
      </div>
    </header>
  );
}
