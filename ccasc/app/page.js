import { LandingHeaderHero } from "@/components/landing/landing-header";
import { LandingVenues } from "@/components/landing/landing-venues";
import { LandingFacilities } from "@/components/landing/landing-facilities";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingContact } from "@/components/landing/landing-contact";
import { LandingFooter } from "@/components/landing/landing-footer";

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