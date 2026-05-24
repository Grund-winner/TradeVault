'use client';

import { motion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getEquityCurve, type Trade } from '@/lib/mock-data';

interface EquityCurveProps {
  trades: Trade[];
  initialBalance?: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="text-xs text-muted-foreground mb-1">Trade {label}</p>
        <p className={`text-sm font-bold ${payload[0].value >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          ${payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
}

export default function EquityCurve({ trades, initialBalance }: EquityCurveProps) {
  const data = getEquityCurve(trades);
  // When initialBalance is set, show actual balance instead of just P&L
  const chartData = initialBalance && initialBalance > 0
    ? data.map(d => ({ ...d, pnl: initialBalance + d.pnl }))
    : data;
  const showBalance = initialBalance && initialBalance > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Courbe de rendement</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{showBalance ? 'Solde (capital + P&L)' : 'P&L cumulé par trade'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b2b]" />
          <span className="text-xs text-muted-foreground">{showBalance ? 'Solde' : 'Cumulatif'}</span>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
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
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke="#ff6b2b"
              strokeWidth={2.5}
              fill="url(#equityGradient)"
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
