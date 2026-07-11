import { ShieldCheck, TrendingUp } from "lucide-react";

// ─── Shared left decorative panel content ────────────────────────────────────

function AuthLeftPanel() {
  return (
    <div className="hidden lg:flex w-1/2 bg-slate-950 relative overflow-hidden items-center justify-center">
      {/* Glows */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-emerald-900/40 z-10" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/30 rounded-full blur-[100px] z-0" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] z-0" />

      <div className="relative z-20 p-16 text-white max-w-xl w-full">
        {/* Brand */}
        <div className="mb-12">
          <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-white to-white/70">
            Arthmount
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-5xl font-bold mb-6 leading-tight tracking-tight">
          Invest in your
          <br />
          tomorrow,{" "}
          <span className="text-emerald-300">today.</span>
        </h2>

        {/* Subtext */}
        <p className="text-xl text-slate-300 mb-12 font-medium leading-relaxed">
          Join thousands of investors growing their wealth with our secure,
          daily-return investment plans.
        </p>

        {/* Feature bullets */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="text-emerald-400" size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-white">Bank-grade security</h4>
              <p className="text-sm text-slate-400 mt-0.5">
                End-to-end encryption &amp; rigid compliance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <TrendingUp className="text-blue-400" size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-white">Real-time accruals</h4>
              <p className="text-sm text-slate-400 mt-0.5">
                Watch your returns hit your wallet daily.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Layout wrapper ───────────────────────────────────────────────────────────

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-white flex font-sans">
      <AuthLeftPanel />

      {/* Right panel — form content injected here */}
      <div className="flex-1 flex flex-col p-6 sm:p-12 lg:p-24 justify-center relative bg-gray-50/50">
        {/* Mobile brand — shown when left panel is hidden */}
        <div className="lg:hidden mb-10 text-center">
          <span className="text-2xl font-black tracking-tighter text-slate-900">
            Arthmount
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
