"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function NavMain({ items, unreadBadgeCount = 0 }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const badgeCount =
              typeof item.badgeCount === "number"
                ? item.badgeCount
                : item.showBadge
                  ? unreadBadgeCount
                  : 0;
            const showBadge = item.showBadge && badgeCount > 0;
            return (
              <SidebarMenuItem key={item.title}>
                <Link href={item.url} className="w-full">
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={cn(
                      "relative flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
                      pathname === item.url && "bg-muted text-primary font-semibold"
                    )}
                  >
                    {item.icon && <item.icon className="h-5 w-5 shrink-0" />}
                    <span>{item.title}</span>
                    {showBadge && (
                      <span
                        className="absolute right-2 flex size-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white"
                        aria-label={`${badgeCount} pending items`}
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
