'use client';

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-[#0e0e14]/80 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-30">
      {/* Left - Title */}
      <div className="flex items-center gap-4">
        <div className="lg:hidden w-8" />
        <h2 className="text-xl font-bold text-white tracking-tight">TradeVault</h2>
        <span className="hidden sm:inline-flex text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#ff6b2b]/10 text-[#ff6b2b] border border-[#ff6b2b]/20">
          PRO
        </span>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        {/* User Avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff6b2b] to-[#ff4500] flex items-center justify-center text-sm font-bold text-white cursor-pointer hover:shadow-lg hover:shadow-orange-500/20 transition-shadow">
          TV
        </div>
      </div>
    </header>
  );
}
