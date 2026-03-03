import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import BentoNutrition from "@/components/BentoNutrition";
import Marketplace from "@/components/Marketplace";
import BiomarkerLab from "@/components/BiomarkerLab";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navigation />
      <Hero />
      <BentoNutrition />
      <Marketplace />
      <BiomarkerLab />
      <CTASection />
      <Footer />
    </main>
  );
}
