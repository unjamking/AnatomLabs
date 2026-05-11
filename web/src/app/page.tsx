import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import NutritionShowcase from "@/components/NutritionShowcase";
import Marketplace from "@/components/Marketplace";
import BiomarkerLab from "@/components/BiomarkerLab";
import Reports from "@/components/Reports";
import WorkoutTracker from "@/components/WorkoutTracker";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navigation />
      <Hero />
      <Features />
      <NutritionShowcase />
      <WorkoutTracker />
      <Marketplace />
      <BiomarkerLab />
      <Reports />
      <CTASection />
      <Footer />
    </main>
  );
}
