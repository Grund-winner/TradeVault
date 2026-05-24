'use client';

import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  ArrowRightLeft,
  Hexagon,
  Target,
  Flame,
  Sigma,
  Percent,
  TrendingDown,
  Activity,
  BarChart3,
} from 'lucide-react';
import { computeKPIs, type Trade } from '@/lib/mock-data';

interface KpiCardsProps {
  trades: Trade[];
  initialBalance?: number;
}

export default function KpiCards({ trades, initialBalance }: KpiCardsProps) {
  const kpis = computeKPIs(trades);
  const hasInitialBalance = initialBalance && initialBalance > 0;

  const safeDiv = (a: number, b: number, fallback = 0): number => (b === 0 ? fallback : a / b);
  const hasTrades = kpis.totalTrades > 0;

  // ROI based on initial balance when available
  const roiValue = hasInitialBalance
    ? ((kpis.netPnl / initialBalance) * 100).toFixed(1)
    : `${(safeDiv(kpis.netPnl, kpis.grossWins + kpis.grossLosses) * 100).toFixed(1)}`;
  const roiLabel = hasInitialBalance ? 'ROI (solde initial)' : 'Rendement';

  // Drawdown based on initial balance when available
  const drawdownValue = hasInitialBalance
    ? ((kpis.maxDrawdown * initialBalance) / 100).toFixed(0)
    : kpis.maxDrawdown.toFixed(1);
  const drawdownUnit = hasInitialBalance ? '$' : '%';
  const drawdownSuffix = hasInitialBalance ? '' : '%';
  const drawdownTooltip = hasInitialBalance
    ? `${kpis.maxDrawdown}% de ${initialBalance.toLocaleString()}$`
    : 'Perte maximale';

  const cards = [
    {
      label: 'P&L Brut',
      value: `$${kpis.grossWins.toLocaleString()}`,
      subtitle: hasTrades ? `+${(safeDiv(kpis.grossWins, kpis.grossWins + kpis.grossLosses) * 100).toFixed(1)}% gains` : 'N/A',
      icon: <DollarSign className="h-4 w-4" />,
      positive: true,
      isHex: false,
    },
    {
      label: 'P&L Net',
      value: `$${kpis.netPnl.toLocaleString()}`,
      subtitle: hasTrades ? `${kpis.netPnl >= 0 ? '+' : ''}${(safeDiv(kpis.netPnl, kpis.grossWins + kpis.grossLosses) * 100).toFixed(1)}% du brut` : 'N/A',
      icon: <TrendingUp className="h-4 w-4" />,
      positive: kpis.netPnl >= 0,
      isHex: false,
    },
    {
      label: 'Trades',
      value: kpis.totalTrades.toString(),
      subtitle: `${kpis.totalR > 0 ? '+' : ''}${kpis.totalR}R total`,
      icon: <ArrowRightLeft className="h-4 w-4" />,
      positive: true,
      isHex: false,
    },
    {
      label: 'Risk Reward',
      value: hasTrades ? kpis.riskReward.toString() : 'N/A',
      subtitle: hasTrades ? 'Ratio moyen' : 'Aucun trade',
      icon: <Hexagon className="h-4 w-4" />,
      positive: true,
      isHex: true,
    },
    {
      label: 'Win Rate',
      value: `${kpis.winRate}%`,
      subtitle: 'Taux de réussite',
      icon: <Target className="h-4 w-4" />,
      positive: kpis.winRate >= 50,
      isWinRate: true,
    },
    {
      label: 'Profit Factor',
      value: kpis.profitFactor === 999 ? '∞' : hasTrades ? kpis.profitFactor.toString() : 'N/A',
      subtitle: kpis.profitFactor === 999 ? 'Parfait (0 perte)' : hasTrades ? `${kpis.profitFactor >= 2 ? 'Excellent' : kpis.profitFactor >= 1.5 ? 'Bon' : 'Moyen'}` : 'Aucun trade',
      icon: <Flame className="h-4 w-4" />,
      positive: kpis.profitFactor >= 1,
      isHex: true,
    },
    {
      label: 'Total R',
      value: kpis.totalR.toString(),
      subtitle: 'R-multiple',
      icon: <Sigma className="h-4 w-4" />,
      positive: kpis.totalR >= 0,
      isHex: false,
    },
    {
      label: 'ROI',
      value: hasTrades ? `${roiValue}%` : 'N/A',
      subtitle: roiLabel,
      icon: <Percent className="h-4 w-4" />,
      positive: hasInitialBalance ? kpis.netPnl >= 0 : true,
      isHex: false,
    },
    {
      label: 'Drawdown Max',
      value: `-${drawdownValue}${drawdownSuffix}`,
      subtitle: drawdownTooltip,
      icon: <TrendingDown className="h-4 w-4" />,
      positive: false,
      isHex: true,
      hexGradient: 'from-[#ef4444] to-[#dc2626]',
      valueColor: '#ef4444',
    },
    {
      label: 'Ratio de Sharpe',
      value: kpis.sharpeRatio.toString(),
      subtitle: kpis.sharpeRatio > 2 ? 'Excellent' : kpis.sharpeRatio > 1 ? 'Bon' : kpis.sharpeRatio > 0 ? 'Faible' : 'N/A',
      icon: <Activity className="h-4 w-4" />,
      positive: kpis.sharpeRatio > 1,
      isHex: true,
      hexGradient: kpis.sharpeRatio > 2 ? 'from-[#22c55e] to-[#16a34a]' : kpis.sharpeRatio > 1 ? 'from-[#f59e0b] to-[#d97706]' : kpis.sharpeRatio > 0 ? 'from-[#ff6b2b] to-[#ff4500]' : 'from-[#94a3b8] to-[#64748b]',
      valueColor: kpis.sharpeRatio > 2 ? '#22c55e' : kpis.sharpeRatio > 1 ? '#f59e0b' : kpis.sharpeRatio > 0 ? '#ff6b2b' : '#94a3b8',
    },
    {
      label: 'Ratio de Sortino',
      value: kpis.sortinoRatio.toString(),
      subtitle: kpis.sortinoRatio > 2 ? 'Excellent' : kpis.sortinoRatio > 1 ? 'Bon' : kpis.sortinoRatio > 0 ? 'Faible' : 'N/A',
      icon: <BarChart3 className="h-4 w-4" />,
      positive: kpis.sortinoRatio > 1,
      isHex: true,
      hexGradient: kpis.sortinoRatio > 2 ? 'from-[#22c55e] to-[#16a34a]' : kpis.sortinoRatio > 1 ? 'from-[#f59e0b] to-[#d97706]' : kpis.sortinoRatio > 0 ? 'from-[#ff6b2b] to-[#ff4500]' : 'from-[#94a3b8] to-[#64748b]',
      valueColor: kpis.sortinoRatio > 2 ? '#22c55e' : kpis.sortinoRatio > 1 ? '#f59e0b' : kpis.sortinoRatio > 0 ? '#ff6b2b' : '#94a3b8',
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 20 } },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
    >
      {cards.map((card) => (
        <motion.div
          key={card.label}
          variants={item}
          className="glass-card rounded-2xl p-5 relative overflow-hidden group cursor-default"
        >
          {/* Icon */}
          <div className="absolute top-4 right-4 text-muted-foreground/40 group-hover:text-[#ff6b2b]/40 transition-colors">
            {card.icon}
          </div>

          {/* Win Rate Ring */}
          {card.isWinRate && (
            <div className="mb-3 relative w-16 h-16">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="3"
                />
                <motion.path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#ff6b2b"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${kpis.winRate}, 100`}
                  initial={{ strokeDasharray: '0, 100' }}
                  animate={{ strokeDasharray: `${kpis.winRate}, 100` }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-[#ff6b2b]">{kpis.winRate}%</span>
              </div>
            </div>
          )}

          {/* Hex Badge */}
          {card.isHex && (
            <div className="mb-3 relative w-16 h-16 flex items-center justify-center">
              <div
                className={`hex-badge w-16 h-16 bg-gradient-to-br ${'hexGradient' in card ? card.hexGradient : 'from-[#ff6b2b] to-[#ff4500]'} flex items-center justify-center`}
              >
                <span className="text-sm font-bold text-white">{card.value}</span>
              </div>
            </div>
          )}

          {/* Content */}
          {!card.isWinRate && !card.isHex && (
            <div className="mb-2">
              <motion.p
                className="text-2xl font-bold text-foreground animate-count-up"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {card.value}
                {card.positive && !card.label.includes('Risk') && !card.label.includes('Profit') && (
                  <span className="ml-2 text-sm">↑</span>
                )}
              </motion.p>
            </div>
          )}

          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{card.label}</p>
          <p className={`text-xs mt-1 font-medium ${'valueColor' in card ? '' : card.positive ? 'text-[#22c55e]' : 'text-[#ef4444]'}`} style={'valueColor' in card ? { color: card.valueColor } : undefined}>
            {card.subtitle}
          </p>

          {/* Subtle glow on hover */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-[#ff6b2b]/5 to-transparent" />
        </motion.div>
      ))}
    </motion.div>
  );
}
