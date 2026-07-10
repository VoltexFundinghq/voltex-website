import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#D4AF37]/20 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4AF37] text-3xl font-black text-black">
            ⚡
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-wide">
              VOLTEX
            </h1>

            <p className="-mt-1 text-xs tracking-[0.4em] text-[#D4AF37]">
              FUNDING
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-10">
          <a href="#" className="text-[#D4AF37]">Home</a>
          <a href="#" className="hover:text-[#D4AF37] transition">Challenges</a>
          <a href="#" className="hover:text-[#D4AF37] transition">Pricing</a>
          <a href="#" className="hover:text-[#D4AF37] transition">Rules</a>
          <a href="#" className="hover:text-[#D4AF37] transition">FAQ</a>
        </nav>

        <div className="flex items-center gap-4">
          <Button variant="ghost" className="text-white hover:text-[#D4AF37] hover:bg-transparent">
            Login
          </Button>

          <Button className="bg-[#D4AF37] text-black hover:bg-yellow-400">
            Start Challenge
          </Button>
        </div>

      </div>
    </header>
  );
}
