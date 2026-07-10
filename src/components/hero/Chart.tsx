export default function Chart() {
  const candles = [
    { x: 30, o: 170, c: 150, h: 140, l: 180, up: true },
    { x: 70, o: 150, c: 165, h: 145, l: 175, up: false },
    { x: 110, o: 165, c: 130, h: 120, l: 175, up: true },
    { x: 150, o: 130, c: 145, h: 125, l: 155, up: false },
    { x: 190, o: 145, c: 110, h: 100, l: 155, up: true },
    { x: 230, o: 110, c: 125, h: 105, l: 140, up: false },
    { x: 270, o: 125, c: 90, h: 80, l: 135, up: true },
    { x: 310, o: 90, c: 105, h: 85, l: 120, up: false },
    { x: 350, o: 105, c: 70, h: 60, l: 115, up: true },
    { x: 390, o: 70, c: 82, h: 65, l: 95, up: false },
    { x: 430, o: 82, c: 52, h: 45, l: 90, up: true },
    { x: 470, o: 52, c: 68, h: 48, l: 80, up: false },
    { x: 510, o: 68, c: 35, h: 25, l: 75, up: true },
  ];

  return (
    <div className="relative mb-6 h-60 overflow-hidden rounded-2xl border border-zinc-800 bg-[#0A0A0A]">

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:40px_40px] opacity-30"></div>

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 560 240">

        {candles.map((c, i) => (
          <g key={i}>
            <line
              x1={c.x}
              x2={c.x}
              y1={c.h}
              y2={c.l}
              stroke={c.up ? "#22c55e" : "#ef4444"}
              strokeWidth="2"
            />

            <rect
              x={c.x - 6}
              y={Math.min(c.o, c.c)}
              width="12"
              height={Math.abs(c.o - c.c)}
              rx="2"
              fill={c.up ? "#22c55e" : "#ef4444"}
            />
          </g>
        ))}

      </svg>

      <div className="absolute left-5 top-5 rounded-lg bg-zinc-900/80 px-3 py-1 text-xs text-zinc-300">
        BTCUSD
      </div>

      <div className="absolute bottom-5 right-5 rounded-lg bg-green-500/20 px-3 py-1 text-sm font-semibold text-green-400">
        + ₦48,250 Today
      </div>

    </div>
  );
}
