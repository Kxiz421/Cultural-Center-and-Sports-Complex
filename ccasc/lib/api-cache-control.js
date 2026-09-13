/**
 * API Route Cache-Control Helpers
 *
 * These helpers ensure GET API responses include no-cache headers so that
 * browsers do NOT serve stale data from disk cache when the user navigates
 * back, switches tabs, or refreshes.
 *
 * Without these headers different browsers cache GET responses differently,
 * causing the exact problem described:
 *   - Data visible in Firefox but not in Chrome (or vice versa)
 *   - Stale form data (prices, particulars, packages) after submission
 *   - "Ghost" entries that show in one browser but not another
 *
 * Usage:
 *
 *   import { noCacheJson } from "@/lib/api-cache-control";
 *
 *   // Replace `return NextResponse.json(data)` with:
 *   return noCacheJson(data);
 *
 *   // Or for error responses:
 *   return noCacheJson({ error: "..." }, { status: 500 });
 */

import { NextResponse } from "next/server";

/**
 * Returns a NextResponse.json with Cache-Control headers that prevent
 * the browser from caching the response.
 */
export function noCacheJson(data, init = {}) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    },
  });
};
