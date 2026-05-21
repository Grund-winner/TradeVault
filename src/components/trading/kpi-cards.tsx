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
} from 'lucide-react';
import { computeKPIs, type Trade } from '@/lib/mock-data';

interface KpiCardsProps {
  trades: Trade[];
}

export default function KpiCards({ trades }: KpiCardsProps) {
  const kpis = computeKPIs(trades);

  const cards = [
    {
      label: 'P&L Brut',
      value: `$${kpis.grossWins.toLocaleString()}`,
      subtitle: `+${((kpis.grossWins / (kpis.grossWins + kpis.grossLosses)) * 100).toFixed(1)}% gains`,
      icon: <DollarSign className="h-4 w-4" />,
      positive: true,
      isHex: false,
    },
    {
      label: 'P&L Net',
      value: `$${kpis.netPnl.toLocaleString()}`,
      subtitle: `${kpis.netPnl >= 0 ? '+' : ''}${((kpis.netPnl / (kpis.grossWins + kpis.grossLosses)) * 100).toFixed(1)}% du brut`,
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
      value: kpis.riskReward.toString(),
      subtitle: 'Ratio moyen',
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
      value: kpis.profitFactor.toString(),
      subtitle: `${kpis.profitFactor >= 2 ? 'Excellent' : kpis.profitFactor >= 1.5 ? 'Bon' : 'Moyen'}`,
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
      value: `${((kpis.netPnl / (kpis.grossWins + kpis.grossLosses)) * 100).toFixed(1)}%`,
      subtitle: 'Rendement',
      icon: <Percent className="h-4 w-4" />,
      positive: true,
      isHex: false,
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
      className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      {cards.map((card) => (
        <motion.div
          key={card.label}
          variants={item}
          className="glass-card rounded-2xl p-5 relative overflow-hidden group cursor-default"
        >
          {/* Icon */}
          <div className="absolute top-4 right-4 text-[#94a3b8]/40 group-hover:text-[#ff6b2b]/40 transition-colors">
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
                className="hex-badge w-16 h-16 bg-gradient-to-br from-[#ff6b2b] to-[#ff4500] flex items-center justify-center"
              >
                <span className="text-sm font-bold text-white">{card.value}</span>
              </div>
            </div>
          )}

          {/* Content */}
          {!card.isWinRate && !card.isHex && (
            <div className="mb-2">
              <motion.p
                className="text-2xl font-bold text-white animate-count-up"
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

          <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wider">{card.label}</p>
          <p className={`text-xs mt-1 font-medium ${card.positive ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            {card.subtitle}
          </p>

          {/* Subtle glow on hover */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-[#ff6b2b]/5 to-transparent" />
        </motion.div>
      ))}
    </motion.div>
  );
}
