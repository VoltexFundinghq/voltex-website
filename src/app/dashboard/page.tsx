import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="relative overflow-hidden bg-black py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_55%)]" />
        <div className="relative mx-auto max-w-2xl px-5 text-center sm:px-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10">
            <LayoutDashboard className="h-8 w-8 text-[#D4AF37]" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold text-white sm:text-4xl">Your Dashboard Is Coming Soon</h1>
          <p className="mx-auto mt-4 max-w-lg text-zinc-400">
            We're building a real-time view of your challenge progress, balance, and rule status — right here, for every trader.
            In the meantime, you'll continue receiving updates by email exactly as you do now.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
