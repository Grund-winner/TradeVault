'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  Play,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Settings2,
  DollarSign,
  Target,
  Activity,
  Sigma,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BacktestSummary {
  finalCapital: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalR: number;
}

interface BacktestStats {
  historicalWinRate: number;
  historicalTrades: number;
  avgWinR: number;
  avgLossR: number;
  avgWinDollar: number;
  avgLossDollar: number;
  strategyDistribution: Record<string, number>;
}

interface BacktestResult {
  summary: BacktestSummary;
  equityCurve: Array<{ trade: number; equity: number }>;
  monthlyReturns: Array<{ month: string; return: number }>;
  simulationCount: number;
  stats: BacktestStats;
}

// ─── Chart Tooltips ──────────────────────────────────────────────────────────

function EquityTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="text-xs text-muted-foreground mb-1">Trade {label}</p>
        <p className={`text-sm font-bold ${payload[0].value >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {payload[0].value >= 0 ? '+' : ''}${payload[0].value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
}

function MonthlyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-sm font-bold ${payload[0].value >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {payload[0].value >= 0 ? '+' : ''}{payload[0].value.toFixed(2)}%
        </p>
      </div>
    );
  }
  return null;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BacktestPanel() {
  // Config state
  const [startingCapital, setStartingCapital] = useState(10000);
  const [riskPerTrade, setRiskPerTrade] = useState(2);
  const [numberOfTrades, setNumberOfTrades] = useState(100);
  const [strategy, setStrategy] = useState('all');
  const [targetRr, setTargetRr] = useState(2.0);
  const [strategies, setStrategies] = useState<string[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStrategies, setShowStrategies] = useState(false);

  // Fetch user strategies from trades
  const fetchStrategies = useCallback(async () => {
    try {
      const res = await fetch('/api/trades');
      if (res.ok) {
        const trades = await res.json();
        const uniqueStrategies = [...new Set(trades.map((t: { strategy: string }) => t.strategy).filter(Boolean))] as string[];
        setStrategies(uniqueStrategies);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  // Run backtest simulation
  const runSimulation = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startingCapital,
          riskPerTrade,
          numberOfTrades,
          strategy,
          targetRr,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la simulation');
        return;
      }

      setResult(data);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset
  const handleReset = () => {
    setResult(null);
    setError(null);
    setStartingCapital(10000);
    setRiskPerTrade(2);
    setNumberOfTrades(100);
    setStrategy('all');
    setTargetRr(2.0);
  };

  // Summary cards data
  const summaryCards = result
    ? [
        {
          label: 'Capital Final',
          value: `$${result.summary.finalCapital.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
          subtitle: `+${((result.summary.finalCapital - startingCapital)).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$ vs depart`,
          icon: <DollarSign className="h-4 w-4" />,
          positive: result.summary.finalCapital >= startingCapital,
          color: result.summary.finalCapital >= startingCapital ? '#22c55e' : '#ef4444',
        },
        {
          label: 'Rendement',
          value: `${result.summary.totalReturn >= 0 ? '+' : ''}${result.summary.totalReturn.toFixed(1)}%`,
          subtitle: `${numberOfTrades} trades simules`,
          icon: <TrendingUp className="h-4 w-4" />,
          positive: result.summary.totalReturn >= 0,
          color: result.summary.totalReturn >= 0 ? '#22c55e' : '#ef4444',
        },
        {
          label: 'Drawdown Max',
          value: `-${result.summary.maxDrawdown.toFixed(1)}%`,
          subtitle: result.summary.maxDrawdown > 20 ? 'Risque eleve' : result.summary.maxDrawdown > 10 ? 'Acceptable' : 'Faible',
          icon: <TrendingDown className="h-4 w-4" />,
          positive: false,
          color: result.summary.maxDrawdown > 20 ? '#ef4444' : result.summary.maxDrawdown > 10 ? '#f59e0b' : '#22c55e',
        },
        {
          label: 'Sharpe Ratio',
          value: result.summary.sharpeRatio.toFixed(2),
          subtitle: result.summary.sharpeRatio > 2 ? 'Excellent' : result.summary.sharpeRatio > 1 ? 'Bon' : result.summary.sharpeRatio > 0 ? 'Faible' : 'Negatif',
          icon: <Activity className="h-4 w-4" />,
          positive: result.summary.sharpeRatio > 1,
          color: result.summary.sharpeRatio > 2 ? '#22c55e' : result.summary.sharpeRatio > 1 ? '#f59e0b' : '#94a3b8',
        },
        {
          label: 'Win Rate',
          value: `${result.summary.winRate.toFixed(1)}%`,
          subtitle: `Taux de reussite simule`,
          icon: <Target className="h-4 w-4" />,
          positive: result.summary.winRate >= 50,
          color: result.summary.winRate >= 50 ? '#22c55e' : '#ef4444',
        },
        {
          label: 'Total R',
          value: `${result.summary.totalR >= 0 ? '+' : ''}${result.summary.totalR.toFixed(1)}R`,
          subtitle: 'R-multiple cumule',
          icon: <Sigma className="h-4 w-4" />,
          positive: result.summary.totalR >= 0,
          color: result.summary.totalR >= 0 ? '#22c55e' : '#ef4444',
        },
      ]
    : [];

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } },
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6b2b]/20 to-[#ff4500]/10 border border-[#ff6b2b]/20 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-[#ff6b2b]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Backtesting</h2>
            <p className="text-xs text-muted-foreground">Simulez vos strategies avant de trader</p>
          </div>
        </div>
        {result && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-xs font-medium"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Nouvelle simulation
          </motion.button>
        )}
      </motion.div>

      {/* ─── Configuration Panel ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-5">
          <Settings2 className="h-4 w-4 text-[#ff6b2b]" />
          <h3 className="text-sm font-semibold text-foreground">Configuration</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Starting Capital */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Capital de depart
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <input
                type="number"
                value={startingCapital}
                onChange={(e) => setStartingCapital(Math.max(100, Number(e.target.value)))}
                className="w-full bg-muted border border-border rounded-xl pl-7 pr-3 py-2 text-foreground text-sm focus:outline-none focus:border-[#ff6b2b]/40 transition-colors"
                min={100}
                step={1000}
              />
            </div>
          </div>

          {/* Risk Per Trade */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Risque par trade
              </label>
              <span className="text-xs font-bold text-[#ff6b2b]">{riskPerTrade}%</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={riskPerTrade}
              onChange={(e) => setRiskPerTrade(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-[#ff6b2b]"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/60">
              <span>0.5%</span>
              <span>10%</span>
            </div>
          </div>

          {/* Number of Trades */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Nombre de trades
            </label>
            <input
              type="number"
              value={numberOfTrades}
              onChange={(e) => setNumberOfTrades(Math.max(10, Math.min(500, Number(e.target.value))))}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[#ff6b2b]/40 transition-colors"
              min={10}
              max={500}
              step={10}
            />
            <p className="text-[10px] text-muted-foreground/60">Entre 10 et 500 trades</p>
          </div>

          {/* Strategy Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Strategie
            </label>
            <div className="relative">
              <button
                onClick={() => setShowStrategies(!showStrategies)}
                className="w-full flex items-center justify-between bg-muted border border-border rounded-xl px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[#ff6b2b]/40 transition-colors hover:border-[#ff6b2b]/30"
              >
                <span>{strategy === 'all' ? 'Toutes' : strategy}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showStrategies ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showStrategies && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl overflow-hidden z-50 shadow-lg"
                  >
                    <button
                      onClick={() => { setStrategy('all'); setShowStrategies(false); }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${strategy === 'all' ? 'bg-[#ff6b2b]/10 text-[#ff6b2b]' : 'text-foreground hover:bg-muted'}`}
                    >
                      Toutes les strategies
                    </button>
                    {strategies.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setStrategy(s); setShowStrategies(false); }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${strategy === s ? 'bg-[#ff6b2b]/10 text-[#ff6b2b]' : 'text-foreground hover:bg-muted'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Target R:R */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Target R:R
            </label>
            <input
              type="number"
              value={targetRr}
              onChange={(e) => setTargetRr(Math.max(0.5, Math.min(5.0, Number(e.target.value))))}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[#ff6b2b]/40 transition-colors"
              min={0.5}
              max={5.0}
              step={0.1}
            />
            <p className="text-[10px] text-muted-foreground/60">Ratio risque/rendement cible</p>
          </div>

          {/* Launch Button */}
          <div className="flex items-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={runSimulation}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#ff6b2b] to-[#ff4500] text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Simulation en cours...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Lancer la simulation
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ─── Error ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="glass-card rounded-2xl p-5 border-[#ef4444]/20"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#ef4444]/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-[#ef4444]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#ef4444]">Erreur de simulation</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Empty State ────────────────────────────────────────────────── */}
      {!result && !isLoading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff6b2b]/10 to-[#ff4500]/5 border border-[#ff6b2b]/10 flex items-center justify-center mb-4">
            <FlaskConical className="h-8 w-8 text-[#ff6b2b]/50" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">Aucune simulation</p>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            Configurez vos parametres ci-dessus et lancez une simulation pour voir les resultats projete
          </p>
        </motion.div>
      )}

      {/* ─── Loading State ──────────────────────────────────────────────── */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center"
        >
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-muted" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#ff6b2b] animate-spin" />
          </div>
          <p className="text-sm font-medium text-foreground">Simulation Monte Carlo en cours...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Analyse de {numberOfTrades} trades simules
          </p>
        </motion.div>
      )}

      {/* ─── Results ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Historical Stats Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl px-5 py-3"
            >
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>
                  Base sur <span className="font-semibold text-foreground">{result.stats.historicalTrades}</span> trades reels
                </span>
                <span className="w-px h-3 bg-border" />
                <span>
                  Win rate reel: <span className="font-semibold text-foreground">{result.stats.historicalWinRate}%</span>
                </span>
                <span className="w-px h-3 bg-border" />
                <span>
                  Avg Win R: <span className="font-semibold text-[#22c55e]">{result.stats.avgWinR}R</span>
                </span>
                <span className="w-px h-3 bg-border" />
                <span>
                  Avg Loss R: <span className="font-semibold text-[#ef4444]">{result.stats.avgLossR}R</span>
                </span>
              </div>
            </motion.div>

            {/* Summary Cards Grid */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
            >
              {summaryCards.map((card) => (
                <motion.div
                  key={card.label}
                  variants={item}
                  className="glass-card rounded-2xl p-4 relative overflow-hidden group cursor-default"
                >
                  <div className="absolute top-3 right-3 text-muted-foreground/30 group-hover:text-[#ff6b2b]/40 transition-colors">
                    {card.icon}
                  </div>
                  <p className="text-xl font-bold text-foreground mb-1">{card.value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{card.label}</p>
                  <p className="text-[11px] mt-1 font-medium" style={{ color: card.color }}>
                    {card.subtitle}
                  </p>
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-[#ff6b2b]/5 to-transparent" />
                </motion.div>
              ))}
            </motion.div>

            {/* Equity Curve Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Courbe de capital simulee</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Evolution du capital sur {result.simulationCount} trades
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b2b]" />
                    <span className="text-xs text-muted-foreground">Capital</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-0.5 bg-muted-foreground/30" />
                    <span className="text-xs text-muted-foreground">Depart: ${startingCapital.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.equityCurve} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="backtestEquityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff6b2b" stopOpacity={0.3} />
                        <stop offset="50%" stopColor="#ff6b2b" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#ff6b2b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="trade"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      domain={['dataMin - 500', 'dataMax + 500']}
                    />
                    <Tooltip content={<EquityTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="#ff6b2b"
                      strokeWidth={2.5}
                      fill="url(#backtestEquityGradient)"
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Monthly Returns Chart */}
            {result.monthlyReturns.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="glass-card rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Rendements mensuels</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Performance projete par mois
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground/40" />
                    <span className="text-xs text-muted-foreground">Mois</span>
                  </div>
                </div>

                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.monthlyReturns} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickFormatter={(v) => `${v.toFixed(0)}%`}
                      />
                      <Tooltip content={<MonthlyTooltip />} />
                      <Bar dataKey="return" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {result.monthlyReturns.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.return >= 0 ? '#22c55e' : '#ef4444'}
                            fillOpacity={0.8}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
