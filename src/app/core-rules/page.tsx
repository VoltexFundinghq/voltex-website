import Navbar from "@/components/layout/Navbar";
import CoreRulesHero from "@/components/core-rules/CoreRulesHero";
import CoreRulesDetailed from "@/components/core-rules/CoreRulesDetailed";
import CoreRulesCTA from "@/components/core-rules/CoreRulesCTA";
import Footer from "@/components/layout/Footer";

export default function CoreRulesPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <CoreRulesHero />
      <CoreRulesDetailed />
      <CoreRulesCTA />
      <Footer />
    </main>
  );
}
