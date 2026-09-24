"use client";

import { ChevronDown } from "lucide-react";
import { FAQS } from "@/lib/landing-content";
import { Reveal } from "@/components/landing/reveal";

/**
 * FAQ uses native <details>/<summary> instead of an Accordion component:
 * no extra dependency, works without JavaScript, and is keyboard accessible
 * out of the box.
 */
export function LandingFaq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Reveal direction="left" className="text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
              FAQ
            </p>
            <h2
              id="faq-title"
              className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Frequently asked questions
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              The rules that apply to every reservation.
            </p>
          </Reveal>

          <div className="mt-10 space-y-3">
            {FAQS.map((faq, index) => (
              <Reveal
                key={faq.question}
                delay={Math.min(index * 60, 240)}
                direction="left"
              >
              <details
                className="group rounded-3xl bg-card px-5 py-4 shadow-sm ring-1 ring-foreground/10 transition-all duration-300 open:shadow-md open:ring-foreground/20"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}