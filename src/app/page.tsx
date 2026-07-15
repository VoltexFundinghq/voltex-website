import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/hero/Hero";
import WhyVoltex from "@/components/WhyVoltex";
import CoreRules from "@/components/CoreRules";
import HowItWorks from "@/components/how-it-works/HowItWorks";
import Challenges from "@/components/Challenges";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <Hero />
      <WhyVoltex />
      <CoreRules />
      <HowItWorks />
      <Challenges />
      <FinalCTA />
      <Footer />
    </main>
  );
}
