'use client';

import { Settings } from 'lucide-react';

interface HeaderProps {
  siteName?: string;
  onSettingsClick?: () => void;
}

export default function Header({ siteName = 'TradeVault', onSettingsClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-[#0e0e14]/80 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-30">
      {/* Left - Title */}
      <div className="flex items-center gap-4">
        <div className="lg:hidden w-8" />
        <h2 className="text-xl font-bold text-white tracking-tight">{siteName}</h2>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        {/* Settings Button */}
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#94a3b8] hover:text-[#ff6b2b] hover:border-[#ff6b2b]/20 hover:bg-[#ff6b2b]/5 transition-all"
            aria-label="Parametres"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}

        {/* User Avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff6b2b] to-[#ff4500] flex items-center justify-center text-sm font-bold text-white cursor-pointer hover:shadow-lg hover:shadow-orange-500/20 transition-shadow">
          TV
        </div>
      </div>
    </header>
  );
}
