import { Sparkles } from "lucide-react";

export default function CustomerComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/5">
        <Sparkles className="h-6 w-6 text-[#D4AF37]" strokeWidth={1.75} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">This section is coming soon — we're building it out properly rather than rushing something half-finished.</p>
    </div>
  );
}
