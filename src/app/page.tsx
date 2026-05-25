'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar, { type TabId } from '@/components/trading/sidebar';
import Header from '@/components/trading/header';
import KpiCards from '@/components/trading/kpi-cards';
import EquityCurve from '@/components/trading/equity-curve';
import PnlChart from '@/components/trading/pnl-chart';
import PnLDistribution from '@/components/trading/pnl-distribution';
import FiltersBar, { type Filters, applyFilters } from '@/components/trading/filters';
import TradeJournal from '@/components/trading/trade-journal';
import DetailedAnalysis from '@/components/trading/detailed-analysis';
import CalendarView from '@/components/trading/calendar-view';
import AddTradeDialog from '@/components/trading/add-trade-dialog';
import SettingsPanel from '@/components/trading/settings-panel';
import AiChatWidget from '@/components/ai/chat-widget';
import AiAnalysis from '@/components/ai/analysis-panel';
import CommunityPanel from '@/components/community/community-panel';
import BacktestPanel from '@/components/trading/backtest-panel';
import ExportPanel from '@/components/trading/export-panel';
import { computeKPIs, type Trade } from '@/lib/mock-data';
import { Plus, TrendingUp, FileText, AlertTriangle, CreditCard } from 'lucide-react';

const defaultFilters: Filters = {
  year: 'Tous',
  month: null,
  direction: 'Tous',
  type: 'Tous',
  strategy: 'Tous',
  instrument: 'Tous',
  timeframe: 'Tous',
};

// Empty state when no trades
function EmptyState({ onAddTrade }: { onAddTrade: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff6b2b]/20 to-[#ff4500]/10 border border-[#ff6b2b]/20 flex items-center justify-center mb-6">
        <TrendingUp className="h-9 w-9 text-[#ff6b2b]" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">Bienvenue sur TradeVault</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        Votre journal de trading est vide. Ajoutez votre premier trade pour commencer à suivre vos performances et analyser vos résultats.
      </p>
      <button
        onClick={onAddTrade}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ff6b2b] hover:bg-[#ff4500] text-white font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all hover:scale-105 active:scale-95"
      >
        <Plus className="h-5 w-5" />
        Ajouter votre premier trade
      </button>
      <div className="flex items-center gap-6 mt-10 text-muted-foreground/60">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="text-xs">Journal de trades</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs">Analyse de performance</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [allTradeData, setAllTradeData] = useState<Trade[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Settings state
  const [siteName, setSiteName] = useState('TradeVault');
  const [siteSubtitle, setSiteSubtitle] = useState('Analytics Pro');
  const [showSettings, setShowSettings] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [initialBalance, setInitialBalance] = useState(0);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');

  // Load user settings from session
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.siteName) setSiteName(data.siteName);
        if (data.siteSubtitle) setSiteSubtitle(data.siteSubtitle);
        if (data.role) setUserRole(data.role);
        if (data.initialBalance) setInitialBalance(Number(data.initialBalance) || 0);
        if (data.subscription) setSubscription(data.subscription);
        if (data.email) setUserEmail(data.email);
        if (data.avatarUrl) setUserAvatarUrl(data.avatarUrl);
        // Apply theme from saved settings
        if (data.theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
        }
        // Subscription check: redirect to pricing if expired and not admin/host
        if (data.subscription && !data.subscription.active && data.role && data.role === 'user') {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('from') !== 'pricing') {
            setRedirectingToPricing(true);
            window.location.href = '/pricing?expired=true';
            return;
          }
        }
      }
    } catch {
      // Use defaults
    }
  }, []);

  // Load trades from database API on mount
  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch('/api/trades');
      if (res.ok) {
        const data = await res.json();
        setAllTradeData(data);
      }
    } catch {
      // API not available yet, start empty
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchSession();
    fetchTrades();
  }, [fetchSession, fetchTrades]);

  const filteredTrades = useMemo(() => applyFilters(allTradeData, filters, searchQuery), [allTradeData, filters, searchQuery]);
  const kpis = useMemo(() => computeKPIs(filteredTrades), [filteredTrades]);

  const handleAddTrade = async (trade: Trade) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trade),
      });
      if (res.ok) {
        const created = await res.json();
        setAllTradeData(prev => [created, ...prev].sort((a, b) => a.date.localeCompare(b.date)));
        setShowAddDialog(false);
        setActiveTab('journal');
      }
    } catch {
      // Fallback: add locally
      setAllTradeData(prev => [trade, ...prev].sort((a, b) => a.date.localeCompare(b.date)));
      setShowAddDialog(false);
      setActiveTab('journal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTrade = async (tradeId: number) => {
    try {
      const res = await fetch(`/api/trades?id=${tradeId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAllTradeData(prev => prev.filter(t => t.id !== tradeId));
      }
    } catch {
      // Fallback: remove locally
      setAllTradeData(prev => prev.filter(t => t.id !== tradeId));
    }
  };

  // Subscription state
  const [subscription, setSubscription] = useState<{ active: boolean; endDate: string | null } | null>(null);
  const [redirectingToPricing, setRedirectingToPricing] = useState(false);

  // Logout: call API to clear httpOnly cookie then redirect
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    window.location.href = '/login';
  };

  // Handle settings saved
  const handleSettingsSaved = (settings: { siteName: string; siteSubtitle: string; theme: string }) => {
    setSiteName(settings.siteName);
    setSiteSubtitle(settings.siteSubtitle);
    // Apply theme immediately
    if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  // Handle avatar saved
  const handleAvatarSaved = (newAvatarUrl: string | null) => {
    setUserAvatarUrl(newAvatarUrl);
  };

  const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.15 } },
  };

  // Show loading state briefly
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff6b2b] to-[#ff4500] flex items-center justify-center animate-pulse">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm text-muted-foreground">Chargement...</span>
        </div>
      </div>
    );
  }

  // Show redirecting state if subscription expired
  if (redirectingToPricing) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff6b2b] to-[#ff4500] flex items-center justify-center animate-pulse">
            <CreditCard className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm text-muted-foreground">Redirection vers la page d'abonnement...</span>
        </div>
      </div>
    );
  }

  const hasTrades = allTradeData.length > 0;
  const hasFilteredTrades = filteredTrades.length > 0;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        allTrades={allTradeData}
        siteName={siteName}
        siteSubtitle={siteSubtitle}
      />

      <main className="flex-1 min-h-screen grid-bg">
        <Header
          siteName={siteName}
          onSettingsClick={() => setShowSettings(true)}
          avatarUrl={userAvatarUrl}
          userEmail={userEmail}
        />

        <div className="px-4 md:px-6 py-6 max-w-[1600px] mx-auto">
          {/* Subscription expiring soon banner */}
          {subscription?.active && subscription.endDate && (() => {
            const daysLeft = Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 3 && daysLeft > 0) {
              return (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-200">
                      Votre abonnement expire dans <span className="font-bold">{daysLeft} jour{daysLeft > 1 ? 's' : ''}</span>. Renouvelez pour ne pas perdre l&apos;accès.
                    </p>
                  </div>
                  <a href="/pricing" className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap ml-4">
                    Renouveler
                  </a>
                </motion.div>
              );
            }
            return null;
          })()}
          {/* Filters */}
          <FiltersBar
            filters={filters}
            onFiltersChange={setFilters}
            trades={allTradeData}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* No trades at all - show welcome */}
          {!hasTrades && (
            <EmptyState onAddTrade={() => setShowAddDialog(true)} />
          )}

          {/* Has trades but filters return nothing */}
          {hasTrades && !hasFilteredTrades && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
                <svg className="h-7 w-7 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Aucun résultat</h3>
              <p className="text-sm text-muted-foreground mb-4">Aucun trade ne correspond à vos filtres actuels.</p>
              <button
                onClick={() => {
                  setFilters(defaultFilters);
                  setSearchQuery('');
                }}
                className="text-xs text-[#ff6b2b] hover:text-[#ff8f5e] transition-colors font-medium"
              >
                Réinitialiser les filtres
              </button>
            </motion.div>
          )}

          {/* Tab Content - only show when there are filtered trades */}
          {hasFilteredTrades && (
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <KpiCards trades={filteredTrades} initialBalance={initialBalance} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <EquityCurve trades={filteredTrades} initialBalance={initialBalance} />
                    <PnlChart trades={filteredTrades} />
                  </div>
                  <PnLDistribution trades={filteredTrades} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="glass-card rounded-2xl p-6"
                    >
                      <h3 className="text-sm font-semibold text-foreground mb-4">Statistiques Gains / Pertes</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gain moyen</p>
                          <p className="text-xl font-bold text-[#22c55e]">+{kpis.avgWinR}R</p>
                          <p className="text-xs text-muted-foreground">${kpis.avgWinPnl.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Perte moyenne</p>
                          <p className="text-xl font-bold text-[#ef4444]">{kpis.avgLossR}R</p>
                          <p className="text-xs text-muted-foreground">-${kpis.avgLossPnl.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Plus grand gain</p>
                          <p className="text-xl font-bold text-foreground">+{kpis.largestWin}R</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Plus grande perte</p>
                          <p className="text-xl font-bold text-foreground">{kpis.largestLoss}R</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Series gagnantes</p>
                          <p className="text-xl font-bold text-[#ff6b2b]">{kpis.maxConsWins}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Series perdantes</p>
                          <p className="text-xl font-bold text-[#ff6b2b]">{kpis.maxConsLosses}</p>
                        </div>
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="glass-card rounded-2xl p-6"
                    >
                      <h3 className="text-sm font-semibold text-foreground mb-4">Résumé de Performance</h3>
                      <div className="space-y-4">
                        {[
                          { label: 'P&L Brut', value: `$${kpis.grossWins.toLocaleString()}`, sub: 'Total des gains', color: 'text-[#22c55e]' },
                          { label: 'P&L Pertes', value: `$${kpis.grossLosses.toLocaleString()}`, sub: 'Total des pertes', color: 'text-[#ef4444]' },
                          { label: 'P&L Net', value: `${kpis.netPnl >= 0 ? '+' : ''}$${kpis.netPnl.toLocaleString()}`, sub: 'Résultat net', color: kpis.netPnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]' },
                          { label: 'Total R', value: `${kpis.totalR > 0 ? '+' : ''}${kpis.totalR}R`, sub: 'R-multiples cumulés', color: kpis.totalR >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]' },
                          { label: 'Profit Factor', value: kpis.profitFactor === 999 ? 'Parfait' : kpis.profitFactor.toString(), sub: kpis.profitFactor === 999 ? 'Parfait (0 perte)' : kpis.profitFactor >= 2 ? 'Excellent' : kpis.profitFactor >= 1.5 ? 'Bon' : 'À améliorer', color: 'text-[#ff6b2b]' },
                          { label: 'Risk Reward', value: kpis.riskReward.toString(), sub: 'Ratio moyen', color: 'text-[#ff6b2b]' },
                        ].map((stat) => (
                          <div key={stat.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div>
                              <p className="text-xs text-muted-foreground">{stat.label}</p>
                              <p className="text-[10px] text-muted-foreground/60">{stat.sub}</p>
                            </div>
                            <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'journal' && (
                <motion.div key="journal" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <TradeJournal trades={filteredTrades} onDeleteTrade={handleDeleteTrade} onAddClick={() => setShowAddDialog(true)} />
                </motion.div>
              )}

              {activeTab === 'detailed' && (
                <motion.div key="detailed" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <DetailedAnalysis trades={filteredTrades} />
                </motion.div>
              )}

              {activeTab === 'calendar' && (
                <motion.div key="calendar" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <CalendarView trades={filteredTrades} />
                </motion.div>
              )}

              {activeTab === 'ai' && (
                <motion.div key="ai" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <AiAnalysis trades={filteredTrades} />
                </motion.div>
              )}

              {activeTab === 'community' && (
                <motion.div key="community" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <CommunityPanel userRole={userRole} hasSubscription={!!subscription?.active} />
                </motion.div>
              )}

              {activeTab === 'backtest' && (
                <motion.div key="backtest" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <BacktestPanel />
                </motion.div>
              )}

              {activeTab === 'export' && (
                <motion.div key="export" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <ExportPanel trades={filteredTrades} />
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Floating Add Button (mobile-friendly) */}
          {hasTrades && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => setShowAddDialog(true)}
              className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-[#ff6b2b] hover:bg-[#ff4500] text-white shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all z-40 flex items-center justify-center lg:hidden"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Plus className="h-6 w-6" />
            </motion.button>
          )}
        </div>
      </main>

      {/* AI Chat Widget - always visible */}
      <AiChatWidget />

      {/* AddTradeDialog at page level */}
      <AddTradeDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddTrade}
      />

      {/* Settings Panel */}
      <SettingsPanel
        open={showSettings}
        onOpenChange={setShowSettings}
        onLogout={handleLogout}
        onSettingsSaved={handleSettingsSaved}
        onAvatarSaved={handleAvatarSaved}
      />
    </div>
  );
}
