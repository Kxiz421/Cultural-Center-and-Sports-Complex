"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Dark-mode switch. Renders as a toggle (sun / moon) so every user — staff and
 * client alike — can flip the theme from the top-right of their header.
 *
 * `mounted` guards the first client render: the theme is only known after
 * hydration, so before that the switch renders in its default (off) position
 * instead of guessing and mismatching the server HTML.
 */
export function ThemeToggle({ className }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Sun className="size-4 text-muted-foreground" aria-hidden />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
      />
      <Moon className="size-4 text-muted-foreground" aria-hidden />
    </div>
  );
}
