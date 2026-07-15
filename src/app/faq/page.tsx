import Navbar from "@/components/layout/Navbar";
import FAQHero from "@/components/faq/FAQHero";
import FAQAccordion from "@/components/faq/FAQAccordion";
import FAQCTA from "@/components/faq/FAQCTA";
import Footer from "@/components/layout/Footer";

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <FAQHero />
      <FAQAccordion />
      <FAQCTA />
      <Footer />
    </main>
  );
}
