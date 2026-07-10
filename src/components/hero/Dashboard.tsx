export default function Dashboard() {
  return (
    <div className="relative w-[680px] h-[720px]">

      {/* Glow */}
      <div className="absolute -inset-12 rounded-[48px] bg-[#D4AF37]/15 blur-[120px]" />

      {/* Container */}
      <div className="relative h-full rounded-[38px] border border-[#D4AF37]/10 bg-[#111111]/95 backdrop-blur-xl shadow-[0_40px_120px_rgba(0,0,0,.65)]">

        <div className="flex items-center justify-between px-10 pt-10">

          <div>

            <p className="text-sm tracking-wide text-zinc-500">
              Account Balance
            </p>

            <h2 className="mt-3 text-5xl font-bold tracking-tight text-white">
              ₦3,000,000
            </h2>

          </div>

          <div className="flex items-center gap-3 rounded-full border border-green-500/20 bg-green-500/10 px-5 py-3">

            <span className="h-3 w-3 rounded-full bg-green-400"></span>

            <span className="font-semibold text-green-400">
              Active
            </span>

          </div>

        </div>

      </div>

    </div>
  );
}
