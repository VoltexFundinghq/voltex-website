import {
  Zap,
  Home,
  BarChart3,
  Wallet,
  User,
  Settings,
  Bell,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

export default function Dashboard() {
  return (
    <div className="relative w-[840px] h-[880px] -translate-y-[70px] translate-x-[-10px] rotate-[7deg]">

      {/* Ambient glow — outer soft wash */}
      <div className="absolute -inset-28 rounded-[72px] bg-[#D4AF37]/25 blur-[150px]" />
      {/* Ambient glow — inner tighter, brighter */}
      <div className="absolute -inset-12 rounded-[56px] bg-[#D4AF37]/30 blur-[90px]" />

      {/* Large curved gold light streak behind the dashboard */}
      <svg
        className="pointer-events-none absolute -inset-40 h-[calc(100%+20rem)] w-[calc(100%+20rem)] overflow-visible"
        viewBox="0 0 1400 1400"
        fill="none"
      >
        <defs>
          <linearGradient id="streakGradPrimary" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
            <stop offset="45%" stopColor="#D4AF37" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F5D573" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="streakGradSecondary" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
            <stop offset="50%" stopColor="#F5D573" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>
          <filter id="streakBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <path
          d="M120,1300 C450,1050 550,750 780,520 C950,350 1050,220 1260,90"
          stroke="url(#streakGradPrimary)"
          strokeWidth="7"
          strokeLinecap="round"
          filter="url(#streakBlur)"
        />
        <path
          d="M180,1340 C500,1090 600,800 830,560"
          stroke="url(#streakGradSecondary)"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.6"
          filter="url(#streakBlur)"
        />
      </svg>

      {/* Container */}
      <div className="relative flex h-full overflow-hidden rounded-[38px] border-2 border-[#D4AF37]/40 bg-[#111111]/95 backdrop-blur-xl shadow-[0_40px_120px_rgba(0,0,0,.65),0_0_90px_rgba(212,175,55,.25)]">

        {/* Sidebar */}
        <div className="flex w-[64px] flex-shrink-0 flex-col items-center gap-8 border-r border-white/5 py-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]">
            <Zap className="h-5 w-5 fill-black text-black" />
          </div>

          <div className="flex flex-col items-center gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37] text-black shadow-[0_8px_20px_rgba(212,175,55,.35)]">
              <Home className="h-5 w-5" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300">
              <BarChart3 className="h-5 w-5" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300">
              <Wallet className="h-5 w-5" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300">
              <User className="h-5 w-5" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col gap-5 p-7">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Overview</h2>

            <div className="flex items-center gap-2.5">
              <button className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-zinc-300">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                MT5
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
              </button>

              <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
              </button>

              <button className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300">
                <User className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-[11px] text-zinc-500">Account Balance</p>
              <p className="mt-2 text-base font-bold text-white">₦3,000,000</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-[11px] text-zinc-500">Equity</p>
              <p className="mt-2 text-base font-bold text-white">₦3,487,250</p>
              <p className="mt-1 flex items-center gap-0.5 text-[11px] font-medium text-emerald-400">
                <ArrowUpRight className="h-3 w-3" />
                4.87%
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-[11px] text-zinc-500">Profit</p>
              <p className="mt-2 text-base font-bold text-white">₦487,250</p>
              <p className="mt-1 flex items-center gap-0.5 text-[11px] font-medium text-emerald-400">
                <ArrowUpRight className="h-3 w-3" />
                4.87%
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-[11px] text-zinc-500">Profit Split</p>
              <p className="mt-2 text-lg font-bold text-[#D4AF37]">90%</p>
              <p className="mt-1 text-[11px] text-zinc-500">Up to 90%</p>
            </div>
          </div>

          {/* Equity curve */}
          <div className="relative flex flex-1 flex-col rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-300">Equity Curve</p>
              <button className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] text-zinc-400">
                This Month
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            <div className="relative mt-4 flex flex-1">
              {/* Y labels */}
              <div className="flex flex-col justify-between pr-3 text-[10px] text-zinc-600">
                <span>3.6M</span>
                <span>3.2M</span>
                <span>2.8M</span>
                <span>2.4M</span>
                <span>2.0M</span>
              </div>

              {/* Chart */}
              <div className="relative flex-1">
                <svg
                  viewBox="0 0 520 150"
                  preserveAspectRatio="none"
                  className="h-full w-full overflow-visible"
                >
                  <defs>
                    <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <path
                    d="M0,150 L0,128 L37,132 L74,110 L111,118 L148,95 L185,102 L222,78 L259,86 L296,60 L333,68 L370,42 L407,48 L444,22 L481,26 L520,8 L520,150 Z"
                    fill="url(#equityFill)"
                  />

                  <path
                    d="M0,128 L37,132 L74,110 L111,118 L148,95 L185,102 L222,78 L259,86 L296,60 L333,68 L370,42 L407,48 L444,22 L481,26 L520,8"
                    fill="none"
                    stroke="#D4AF37"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <line
                    x1="520"
                    y1="8"
                    x2="520"
                    y2="150"
                    stroke="#D4AF37"
                    strokeOpacity="0.25"
                    strokeDasharray="3 3"
                  />
                  <circle cx="520" cy="8" r="4.5" fill="#D4AF37" stroke="#111111" strokeWidth="2" />
                </svg>

                {/* Tooltip */}
                <div className="absolute -top-2 right-0 rounded-xl border border-[#D4AF37]/30 bg-[#1a1a1a] px-3 py-2 shadow-lg">
                  <p className="text-xs font-bold text-white">₦3,487,250</p>
                  <p className="text-[10px] text-zinc-500">May 29, 2024</p>
                </div>
              </div>
            </div>

            {/* X labels */}
            <div className="ml-8 mt-2 flex justify-between text-[10px] text-zinc-600">
              <span>May 1</span>
              <span>May 8</span>
              <span>May 15</span>
              <span>May 22</span>
              <span>May 29</span>
            </div>
          </div>

          {/* Bottom panels */}
          <div className="grid grid-cols-2 gap-4">

            {/* Trading Objectives */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-300">Trading Objectives</p>
                <button className="text-[11px] font-medium text-[#D4AF37]">View All</button>
              </div>

              <div className="mt-3 space-y-3">
                {[
                  { label: "Profit Target", value: "10%", fill: 82 },
                  { label: "Daily Drawdown (Max)", value: "10%", fill: 35 },
                  { label: "Max Drawdown (Overall)", value: "20%", fill: 48 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        {item.label}
                      </span>
                      <span className="font-medium text-zinc-400">{item.value}</span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F5D573]"
                        style={{ width: `${item.fill}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Rules */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-300">Account Rules</p>
                <button className="text-[11px] font-medium text-[#D4AF37]">View All</button>
              </div>

              <div