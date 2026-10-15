import { LandingHeaderHero } from "@/components/landing/landing-header";
import { LandingVenues } from "@/components/landing/landing-venues";
import { LandingFacilities } from "@/components/landing/landing-facilities";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingContact } from "@/components/landing/landing-contact";
import { LandingFooter } from "@/components/landing/landing-footer";
import { getPublicFacilities } from "@/lib/public-facilities";

/**
 * The facility list is rendered from the database, so re-render at most every
 * 5 minutes: an edit in the admin panel shows up without a rebuild.
 */
export const revalidate = 300;

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

export default async function LandingPage() {
  // Render the facility list on the server so its names, descriptions and rates
  // are in the HTML crawlers receive. If the database is unreachable the
  // sections fall back to fetching the list in the browser.
  let facilities = [];
  try {
    facilities = await getPublicFacilities();
  } catch (error) {
    console.error("Failed to load the landing facility list:", error);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeaderHero facilities={facilities} />
      <main className="relative z-10 -mt-10 flex-1 rounded-t-[3rem] bg-gradient-to-b from-background via-muted/25 to-background">
        <LandingVenues facilities={facilities} />
        <LandingFacilities facilities={facilities} />
        <LandingHowItWorks />
        <LandingFaq />
        <LandingContact />
      </main>
      <LandingFooter />
    </div>
  );
}