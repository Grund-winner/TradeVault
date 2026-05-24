'use client';

import { Settings, Shield } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  siteName?: string;
  onSettingsClick?: () => void;
  userRole?: string;
}

export default function Header({ siteName = 'TradeVault', onSettingsClick, userRole }: HeaderProps) {
  const isAdmin = userRole === 'admin' || userRole === 'host';

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border sticky top-0 z-30">
      {/* Left - Title */}
      <div className="flex items-center gap-4">
        <div className="lg:hidden w-8" />
        <h2 className="text-xl font-bold text-foreground tracking-tight">{siteName}</h2>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        {/* Admin Button */}
        {isAdmin && (
          <Link
            href="/admin"
            className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-all"
            aria-label="Admin Panel"
          >
            <Shield className="h-4 w-4" />
          </Link>
        )}

        {/* Settings Button */}
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all"
            aria-label="Parametres"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}

        {/* User Avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-sm font-bold text-white cursor-pointer hover:shadow-lg hover:shadow-primary/20 transition-shadow">
          TV
        </div>
      </div>
    </header>
  );
}
