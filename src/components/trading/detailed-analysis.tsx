'use client';

import { motion } from 'framer-motion';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import {
  getStrategyBreakdown,
  getInstrumentBreakdown,
  getDirectionBreakdown,
  getTimeframeBreakdown,
  getMonthlyPnl,
  computeKPIs,
  type Trade,
} from '@/lib/mock-data';
import { TrendingUp, TrendingDown, Award, Zap, BarChart3, Target } from 'lucide-react';

interface DetailedAnalysisProps {
  trades: Trade[];
}

const COLORS = ['#ff6b2b', '#ff8f5e', '#22c55e', '#f59e0b', '#8b5cf6'];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-bold" style={{ color: entry.color || '#fff' }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function DetailedAnalysis({ trades }: DetailedAnalysisProps) {
  const kpis = computeKPIs(trades);
  const strategyData = getStrategyBreakdown(trades);
  const instrumentData = getInstrumentBreakdown(trades);
  const directionData = getDirectionBreakdown(trades);
  const timeframeData = getTimeframeBreakdown(trades);
  const monthlyData = getMonthlyPnl(trades);

  // Best/worst months
  const bestMonth = monthlyData.length > 0
    ? monthlyData.reduce((a, b) => a.pnl > b.pnl ? a : b, monthlyData[0])
    : null;
  const losingMonths = monthlyData.filter(m => m.pnl < 0);
  const worstMonth = losingMonths.length > 0
    ? losingMonths.reduce((a, b) => a.pnl < b.pnl ? a : b, losingMonths[0])
    : null;

  // Monthly heatmap data
  const allMonths = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthMap: Record<string, number> = {};
  monthlyData.forEach(m => {
    const monthLabel = new Date(m.month + '-01').toLocaleDateString('fr-FR', { month: 'short' });
    monthMap[monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)] = m.pnl;
  });

  const getHeatColor = (value: number | undefined) => {
    if (value === undefined) return 'bg-muted';
    if (value > 3000) return 'bg-[#22c55e]/60';
    if (value > 1000) return 'bg-[#22c55e]/35';
    if (value > 0) return 'bg-[#22c55e]/18';
    if (value > -1000) return 'bg-[#ef4444]/18';
    return 'bg-[#ef4444]/40';
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h3 className="text-lg font-bold text-foreground">Analyse Détaillée</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Découpage complet de vos performances par catégorie</p>
      </motion.div>

      {/* Top Stats Row */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-[#22c55e]" />
            <span className="text-xs text-muted-foreground">Meilleur mois</span>
          </div>
          <p className="text-lg font-bold text-[#22c55e]">{bestMonth ? `+$${bestMonth.pnl.toLocaleString()}` : 'N/A'}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{bestMonth?.label || 'Aucune donnée'}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-[#ef4444]" />
            <span className="text-xs text-muted-foreground">Pire mois</span>
          </div>
          <p className="text-lg font-bold text-[#ef4444]">{worstMonth ? `$${worstMonth.pnl.toLocaleString()}` : '$0'}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{worstMonth?.label || 'Aucune perte'}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-4 w-4 text-[#ff6b2b]" />
            <span className="text-xs text-muted-foreground">Max Gain</span>
          </div>
          <p className="text-lg font-bold text-foreground">+{kpis.largestWin}R</p>
          <p className="text-[10px] text-muted-foreground mt-1">Meilleur trade</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-[#f59e0b]" />
            <span className="text-xs text-muted-foreground">Max Perte</span>
          </div>
          <p className="text-lg font-bold text-foreground">{kpis.largestLoss}R</p>
          <p className="text-[10px] text-muted-foreground mt-1">Pire trade</p>
        </div>
      </motion.div>

      {/* Charts Row 1: Strategy + Instrument */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Strategy Performance */}
        <motion.div variants={item} className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-[#ff6b2b]" />
            <h4 className="text-sm font-semibold text-foreground">Performance par Strategie</h4>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={strategyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="strategy" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="wins" name="Gains" fill="#22c55e" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                <Bar dataKey="losses" name="Pertes" fill="#ef4444" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Instrument Breakdown */}
        <motion.div variants={item} className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-[#ff6b2b]" />
            <h4 className="text-sm font-semibold text-foreground">Repartition par Instrument</h4>
          </div>
          <div className="h-[260px] flex items-center">
            <div className="w-1/2">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={instrumentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="total"
                    nameKey="category"
                  >
                    {instrumentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-3">
              {instrumentData.map((d, i) => (
                <div key={d.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-muted-foreground">{d.category}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground">{d.total} trades</p>
                    <p className={`text-[10px] font-medium ${d.pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {d.pnl >= 0 ? '+' : ''}${d.pnl.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row 2: Direction + Timeframe */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Direction Analysis */}
        <motion.div variants={item} className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-[#ff6b2b]" />
            <h4 className="text-sm font-semibold text-foreground">Buy vs Sell</h4>
          </div>
          <div className="space-y-4">
            {directionData.map(d => (
              <div key={d.direction} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      d.direction === 'Buy'
                        ? 'bg-[#22c55e]/15 text-[#22c55e]'
                        : 'bg-[#ef4444]/15 text-[#ef4444]'
                    }`}>
                      {d.direction}
                    </span>
                    <span className="text-xs text-muted-foreground">{d.total} trades</span>
                  </div>
                  <span className={`text-sm font-bold ${d.pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                    {d.pnl >= 0 ? '+' : ''}${d.pnl.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${d.direction === 'Buy' ? 'bg-gradient-to-r from-[#22c55e] to-[#4ade80]' : 'bg-gradient-to-r from-[#ef4444] to-[#f87171]'}`}
                      style={{ width: `${d.winRate}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground min-w-[36px] text-right">{d.winRate}%</span>
                </div>
                <div className="flex gap-4 text-[10px] text-muted-foreground">
                  <span>Gains moyens: <span className="text-foreground font-medium">{(d.totalR > 0 ? '+' : '')}{(d.totalR / Math.max(d.total, 1)).toFixed(1)}R</span></span>
                  <span>Taux de réussite: <span className="text-foreground font-medium">{d.winRate}%</span></span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Timeframe Analysis */}
        <motion.div variants={item} className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-[#ff6b2b]" />
            <h4 className="text-sm font-semibold text-foreground">Analyse par Timeframe</h4>
          </div>
          <div className="space-y-3">
            {timeframeData.map((tf, i) => (
              <div key={tf.timeframe} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold" style={{
                  backgroundColor: `${COLORS[i % COLORS.length]}20`,
                  color: COLORS[i % COLORS.length],
                }}>
                  {tf.timeframe}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground font-medium">{tf.total} trades</span>
                    <span className={`text-xs font-bold ${tf.pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {tf.pnl >= 0 ? '+' : ''}${tf.pnl.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#ff6b2b] transition-all duration-700"
                      style={{ width: `${tf.winRate}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-[#ff6b2b] min-w-[36px] text-right">{tf.winRate}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Monthly Heatmap */}
      <motion.div variants={item} className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-4 w-4 text-[#ff6b2b]" />
          <h4 className="text-sm font-semibold text-foreground">Calendrier de Performance</h4>
        </div>
        <div className="grid grid-cols-12 gap-1.5">
          {allMonths.map(month => {
            const pnl = monthMap[month];
            return (
              <div
                key={month}
                className={`heatmap-cell aspect-square rounded-lg flex flex-col items-center justify-center cursor-default ${getHeatColor(pnl)}`}
              >
                <span className="text-[10px] text-muted-foreground font-medium">{month}</span>
                {pnl !== undefined && (
                  <span className={`text-[10px] font-bold mt-0.5 ${pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                    {pnl >= 0 ? '+' : ''}${(pnl / 1000).toFixed(1)}k
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#ef4444]/40" />
            <span className="text-[10px] text-muted-foreground">Perte</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#22c55e]/18" />
            <span className="text-[10px] text-muted-foreground">Petit gain</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#22c55e]/60" />
            <span className="text-[10px] text-muted-foreground">Fort gain</span>
          </div>
        </div>
      </motion.div>

      {/* Win/Loss Stats */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Gain moyen</p>
          <p className="text-2xl font-bold text-[#22c55e]">+{kpis.avgWinR}R</p>
          <p className="text-xs text-muted-foreground mt-1">${kpis.avgWinPnl.toLocaleString()}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Perte moyenne</p>
          <p className="text-2xl font-bold text-[#ef4444]">{kpis.avgLossR}R</p>
          <p className="text-xs text-muted-foreground mt-1">-${kpis.avgLossPnl.toLocaleString()}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center col-span-2 md:col-span-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Series gagnantes</p>
          <p className="text-2xl font-bold text-[#ff6b2b]">{kpis.maxConsWins}</p>
          <p className="text-xs text-muted-foreground mt-1">Consécutifs max</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
