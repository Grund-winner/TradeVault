'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, BookOpen, BarChart3, CalendarDays, Menu, X, TrendingUp } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { getEquityCurve, type Trade } from '@/lib/mock-data';

export type TabId = 'dashboard' | 'journal' | 'detailed' | 'calendar';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  allTrades?: Trade[];
  siteName?: string;
  siteSubtitle?: string;
}

const navItems: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: 'journal', label: 'Journal', icon: <BookOpen className="h-5 w-5" /> },
  { id: 'detailed', label: 'Detaille', icon: <BarChart3 className="h-5 w-5" /> },
  { id: 'calendar', label: 'Calendrier', icon: <CalendarDays className="h-5 w-5" /> },
];

export default function Sidebar({ activeTab, onTabChange, allTrades = [], siteName = 'TradeVault', siteSubtitle = 'Analytics Pro' }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sparklineData = useMemo(() => {
    const curve = getEquityCurve(allTrades);
    return curve.map((d, i) => ({ value: d.pnl, index: i }));
  }, [allTrades]);

  const totalPnl = allTrades.reduce((sum, t) => sum + t.pnl, 0);

  const handleTabChange = (tab: TabId) => {
    onTabChange(tab);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6b2b] to-[#ff4500] flex items-center justify-center shadow-lg shadow-orange-500/20">
          <img src="/logo.png" alt={siteName} className="w-6 h-6 object-contain" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">{siteName}</h1>
          <p className="text-[10px] text-[#94a3b8] uppercase tracking-widest">{siteSubtitle}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => handleTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === item.id
                ? 'sidebar-active bg-gradient-to-r from-[#ff6b2b]/15 to-transparent text-[#ff6b2b]'
                : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
            }`}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className={activeTab === item.id ? 'text-[#ff6b2b]' : ''}>{item.icon}</span>
            <span>{item.label}</span>
            {activeTab === item.id && (
              <motion.div
                layoutId="activeIndicator"
                className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ff6b2b]"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Mini equity curve */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-3.5 w-3.5 text-[#ff6b2b]" />
          <span className="text-xs text-[#94a3b8] font-medium">P&L cumule</span>
        </div>
        <p className={`text-lg font-bold mb-3 ${totalPnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString()}$
        </p>
        <div className="h-12 rounded-lg overflow-hidden">
          {sparklineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff6b2b" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ff6b2b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#ff6b2b"
                  strokeWidth={1.5}
                  fill="url(#sparkGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[10px] text-[#94a3b8]/40">
              Aucune donnee
            </div>
          )}
        </div>
        <p className="text-[11px] text-[#94a3b8] mt-2">{allTrades.length} trade{allTrades.length > 1 ? 's' : ''} enregistre{allTrades.length > 1 ? 's' : ''}</p>
      </div>

      {/* Bottom branding */}
      <div className="px-6 py-4 border-t border-white/5">
        <p className="text-[10px] text-[#94a3b8]/60 uppercase tracking-wider">{siteName} v2.0</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 min-h-screen bg-[#0e0e14] border-r border-white/[0.06] flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-[#111118] border border-white/10 text-white"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-[#0e0e14] border-r border-white/[0.06] z-50"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
