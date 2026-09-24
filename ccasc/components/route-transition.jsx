"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PAGE_LOGO } from "@/lib/constants";

/**
 * Route transition "curtain".
 *
 * Next.js already swaps the page instantly on a client-side navigation, which
 * makes moving between the landing page and the auth pages feel like a hard
 * cut. This module wraps that swap in a short branded transition:
 *
 *   1. A link or button calls `start(href)`
 *   2. The curtain fades in over `COVER_MS`
 *   3. The route is pushed *while the screen is covered*
 *   4. `usePathname()` notices the arrival and the curtain fades back out
 *
 * The curtain is rendered by `RouteTransitionProvider`, which lives in
 * `app/layout.js`. Layouts are preserved across client-side navigations, so
 * the curtain (and its opacity state) survives the push — a curtain rendered
 * inside a page would unmount halfway through the transition.
 *
 * Motion is opt-out: with `prefers-reduced-motion: reduce` the provider skips
 * the curtain altogether and navigates immediately.
 */

/** Curtain fade-in duration. Keep in sync with `.route-curtain` in globals.css. */
const COVER_MS = 420;
/** Brief pause on the new route before the curtain lifts, so the fade reads. */
const HOLD_MS = 160;
/** Absolute ceiling: never leave the curtain up if a navigation stalls. */
const SAFETY_MS = 4000;
/**
 * Longer ceiling for full-page (`hard`) navigations. The curtain there stays
 * painted until the browser swaps documents, so it must survive a slow load
 * without leaving a user stuck behind an opaque overlay.
 */
const SAFETY_HARD_MS = 8000;
/**
 * How long the overlay stays mounted after `active` flips back to false, so
 * the exit fade still has time to play before it leaves the DOM. Keep just
 * above the exit transition in globals.css (460ms).
 */
const EXIT_MS = 560;

/** Human-readable copy per destination, used when a caller passes no label. */
const ROUTE_LABELS = {
  "/": "Returning to the homepage…",
  "/login": "Signing you in…",
  "/register": "Preparing the registration form…",
  "/resubmit": "Opening your resubmission form…",
};

const RouteTransitionContext = React.createContext(null);

const FALLBACK = { start: () => false, active: false };

/**
 * Access the route transition from any client component.
 *
 * Safe to call outside the provider (isolated previews): it degrades to a
 * no-op, so `start()` returning `false` never blocks a normal navigation.
 */
export function useRouteTransition() {
  return React.useContext(RouteTransitionContext) ?? FALLBACK;
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Strip query/hash so a destination can be compared to `usePathname()`. */
function toPathname(href) {
  return href.split(/[?#]/)[0];
}

/** Run `fn` after the next paint, so CSS has a starting value to animate from. */
function onNextFrame(fn) {
  if (typeof window === "undefined") return;
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(fn);
    return;
  }
  setTimeout(fn, 16);
}

export function RouteTransitionProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = React.useState(false);
  /**
   * The overlay is only in the DOM while a transition is (or just was)
   * running. Keeping a full-screen fixed layer mounted at all times means its
   * visibility depends entirely on CSS arriving — and if that CSS does not
   * (a stale stylesheet, a cached asset), the seal sits centred over the
   * whole app with no way to hide it. Mounting on demand removes that failure
   * mode: with no transition running there is nothing to hide.
   */
  const [rendered, setRendered] = React.useState(false);
  const [label, setLabel] = React.useState("");

  // Kept in refs so the callbacks and timers always read fresh values without
  // being re-created (and re-registered) on every render.
  const fromRef = React.useRef(null);
  const destinationRef = React.useRef(null);
  const hardRef = React.useRef(false);
  const timersRef = React.useRef([]);
  const exitTimerRef = React.useRef(null);

  const clearTimers = React.useCallback(() => {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current = [];
  }, []);

  const clearExitTimer = React.useCallback(() => {
    if (exitTimerRef.current !== null) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  React.useEffect(
    () => () => {
      clearTimers();
      clearExitTimer();
    },
    [clearTimers, clearExitTimer],
  );

  const hide = React.useCallback(() => {
    clearTimers();
    fromRef.current = null;
    destinationRef.current = null;
    hardRef.current = false;
    setActive(false);
    // Unmount only once the exit fade has played out.
    clearExitTimer();
    exitTimerRef.current = setTimeout(() => {
      exitTimerRef.current = null;
      setRendered(false);
    }, EXIT_MS);
  }, [clearExitTimer, clearTimers]);

  /**
   * Raise the curtain and navigate.
   *
   * @param {string} href          In-app path to move to.
   * @param {string} [customLabel] Copy shown under the seal.
   * @param {{hard?: boolean}} [options]
   *   `hard: true` performs a full-page load instead of a client-side push.
   *   Use it when the destination needs a fresh document (e.g. a new session
   *   for `SessionProvider` after signing in) — the curtain still covers the
   *   gap, because the browser keeps painting the old page until the next
   *   document is ready.
   *
   * @returns {boolean} `true` when this call owns the navigation (callers
   *   should then `preventDefault()`); `false` when the caller should navigate
   *   normally instead.
   */
  const start = React.useCallback(
    (href, customLabel, options) => {
      if (typeof href !== "string" || !href.startsWith("/")) return false;

      const target = toPathname(href);
      const hard = Boolean(options?.hard);
      // Already there, or already covering the screen: decline so the caller
      // navigates on its own instead of animating a no-op.
      if (destinationRef.current || target === pathname) return false;

      // Reduced motion: stay instant, no curtain.
      if (prefersReducedMotion()) {
        if (hard) window.location.assign(href);
        else router.push(href);
        return true;
      }

      fromRef.current = pathname;
      destinationRef.current = target;
      hardRef.current = hard;
      clearExitTimer();
      setLabel(customLabel ?? ROUTE_LABELS[target] ?? "Loading…");
      // Mount the overlay in its hidden state, then flip it active on the next
      // frame: an element that *starts* active has no opacity to transition
      // from, so the veil would pop in instead of fading.
      setRendered(true);
      let activated = false;
      const activate = () => {
        if (activated) return;
        activated = true;
        setActive(true);
        timersRef.current.push(
          setTimeout(() => {
            if (hard) window.location.assign(href);
            else router.push(href);
          }, COVER_MS),
          setTimeout(hide, hard ? SAFETY_HARD_MS : SAFETY_MS),
        );
      };
      onNextFrame(activate);
      // Safety net: frames are throttled while a tab is in the background, and
      // a click that silently never navigates would look like a dead link.
      timersRef.current.push(setTimeout(activate, 80));
      return true;
    },
    [clearExitTimer, hide, pathname, router],
  );

  // The route arrived — hold the curtain just long enough for the new page to
  // paint, then lift it. Any pathname change counts as arrival, so a guard
  // redirecting somewhere other than the original destination still clears it.
  //
  // Hard navigations are excluded: there the document is replaced, and a
  // pathname change before that belongs to *something else* (signing out, the
  // panel's own session guard pushing /login). Lifting the veil for it would
  // expose that intermediate screen.
  React.useEffect(() => {
    if (!active || hardRef.current) return;
    if (pathname === fromRef.current) return;
    const id = setTimeout(hide, HOLD_MS);
    return () => clearTimeout(id);
  }, [active, hide, pathname]);

  const value = React.useMemo(() => ({ start, active }), [start, active]);

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}

      {rendered ? (
        <div
          className="route-curtain fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-neutral-950/60"
          data-state={active ? "active" : "idle"}
          aria-hidden={!active}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/3 size-[30rem] -translate-x-1/2 rounded-full bg-blue-500/25 blur-[130px]"
          />

          <div className="route-curtain__content relative flex flex-col items-center gap-5 px-6 text-center">
            <span className="relative flex items-center justify-center">
              <span
                aria-hidden
                className="route-curtain__halo absolute inset-0 border border-blue-300/50"
              />
              <Image
                src={PAGE_LOGO}
                alt=""
                width={96}
                height={96}
                className="relative size-20 drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)] md:size-24"
              />
            </span>

            <p role="status" className="text-base font-medium text-white/80">
              {active ? label : ""}
            </p>

            {/* Indeterminate light sweep instead of a spinner: the overlay is a
                hand-off, not a loading screen, and a bar that never fills says
                that better than a rotating ring. */}
            <span aria-hidden className="route-curtain__track h-[3px] w-40">
              <span className="route-curtain__track-bar" />
            </span>
          </div>
        </div>
      ) : null}
    </RouteTransitionContext.Provider>
  );
}

/**
 * `next/link` that raises the transition curtain before navigating.
 *
 * The rendered markup is still a real anchor, so prefetching, right-click →
 * "open in a new tab", middle-clicks and modifier-clicks keep working
 * untouched: only a plain primary-button click on an in-app path is
 * intercepted.
 */
export function TransitionLink({
  href,
  label,
  onClick,
  target,
  ref,
  ...props
}) {
  const { start } = useRouteTransition();

  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    // Anything the browser should own: modifier/middle clicks, new tabs,
    // external origins.
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (target && target !== "_self") return;
    if (typeof href !== "string" || !href.startsWith("/")) return;

    // `start` returns false when it declines (already on that route), in which
    // case `Link` performs its normal navigation.
    if (!start(href, label)) return;
    event.preventDefault();
  };

  return (
    <Link
      ref={ref}
      href={href}
      target={target}
      onClick={handleClick}
      {...props}
    />
  );
}

