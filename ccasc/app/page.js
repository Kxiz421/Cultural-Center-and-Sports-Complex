import { LandingHeaderHero } from "@/components/landing/landing-header";
import { LandingVenues } from "@/components/landing/landing-venues";
import { LandingFacilities } from "@/components/landing/landing-facilities";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingContact } from "@/components/landing/landing-contact";
import { LandingFooter } from "@/components/landing/landing-footer";

/**
 * The only page search engines should index, so it opts in to crawling
 * (the root layout sets `robots.index: false` for everything else).
 */
export const metadata = {
  title:
    "Venue Booking — South Cotabato Gymnasium & Cultural Center / Sports Complex",
  description:
    "Reserve the South Cotabato Gymnasium and Cultural Center or the Sports Complex: browse facilities, rates and packages, and file your booking online.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeaderHero />
      <main className="relative z-10 -mt-10 flex-1 rounded-t-[3rem] bg-gradient-to-b from-background via-muted/25 to-background">
        <LandingVenues />
        <LandingFacilities />
        <LandingHowItWorks />
        <LandingFaq />
        <LandingContact />
      </main>
      <LandingFooter />
    </div>
  );
}