import { Cta } from "@/components/cta";
import { Faq } from "@/components/faq";
import { FeaturesCarousel } from "@/components/features-carousel";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { HowItWorksIntro } from "@/components/how-it-works-intro";
import { Infographic } from "@/components/infographic";
import { Locations } from "@/components/locations";
import { NavProvider } from "@/components/nav-context";
import { SiteNav } from "@/components/site-nav";
import { SmoothScroll } from "@/components/smooth-scroll";
import { StaticFeatures } from "@/components/static-features";
import { StructuredData } from "@/components/structured-data";

export default function Home() {
  return (
    <NavProvider>
      <StructuredData />
      <SiteNav />
      <SmoothScroll>
        <main className="relative z-[1] bg-background-primary">
          <Hero />
          <section
            aria-label="How Medlyn works"
            className="mb-[10rem] bg-background-primary pt-[10rem] tablet:mb-0 tablet:pt-[15rem] desktop:pt-[27rem]"
          >
            <HowItWorksIntro />
            <FeaturesCarousel />
          </section>
          <Infographic />
          <Locations />
          <StaticFeatures />
          <Faq />
          <Cta />
        </main>
        <Footer />
      </SmoothScroll>
    </NavProvider>
  );
}
