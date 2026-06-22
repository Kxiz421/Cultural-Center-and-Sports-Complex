"use client";

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }) {
  return (
    <TooltipProvider>{children}</TooltipProvider>
  );
}
