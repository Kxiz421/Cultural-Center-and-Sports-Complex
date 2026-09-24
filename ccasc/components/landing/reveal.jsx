"use client";

import { useEffect, useRef } from "react";

/**
 * Reveals its children as they scroll into view.
 *
 * The hidden state lives in CSS under `html.js [data-reveal]`, and
 * `app/layout.js` adds the `js` class to <html> before the first paint. That
 * keeps every case correct:
 *
 * - no JavaScript      -> `js` never lands, so content is simply visible
 * - reduced motion     -> the CSS media query never applies, so no motion
 * - everyone else      -> the element travels in from a direction and fades
 *                         in once, then the observer stops watching it
 *
 * `Reveal` renders its own wrapper element on purpose: the 700ms reveal
 * transition must not sit on the same node as a card's 300ms hover
 * transition, or one would override the other.
 *
 * `direction` picks how the element travels into place ("up" | "left" |
 * "right" | "fade" | "zoom") and `blur` layers a soft focus pull on top of it.
 */

/**
 * Where each direction starts from. `left` / `right` name the edge the element
 * comes *from*, so `left` slides in rightward.
 */
const VARIANTS = {
  up: { x: "0px", y: "24px", scale: "1" },
  left: { x: "-40px", y: "0px", scale: "1" },
  right: { x: "40px", y: "0px", scale: "1" },
  fade: { x: "0px", y: "0px", scale: "1" },
  zoom: { x: "0px", y: "0px", scale: "0.95" },
};

export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  direction = "up",
  blur = false,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      node.setAttribute("data-reveal", "in");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "in");
          observer.unobserve(entry.target);
        }
      },
      // Start slightly before the element is fully on screen so the motion
      // reads as a response to scrolling rather than a late pop-in.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const variant = VARIANTS[direction] ?? VARIANTS.up;

  return (
    <Tag
      ref={ref}
      className={className}
      data-reveal="out"
      style={{
        "--reveal-x": variant.x,
        "--reveal-y": variant.y,
        "--reveal-scale": variant.scale,
        "--reveal-blur": blur ? "10px" : "0px",
        ...(delay ? { transitionDelay: `${delay}ms` } : null),
      }}
    >
      {children}
    </Tag>
  );
}