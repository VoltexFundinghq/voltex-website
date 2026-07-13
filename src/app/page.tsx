import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/hero/Hero";
import CoreRules from "@/components/CoreRules";
import HowItWorks from "@/components/how-it-works/HowItWorks";
import Challenges from "@/components/Challenges";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <Hero />
      <CoreRules />
      <HowItWorks />
      <Challenges />
    </main>
  );
}
