'use client';

import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getPnlDistribution, type Trade } from '@/lib/mock-data';
import { BarChart3 } from 'lucide-react';

interface PnLDistributionProps {
  trades: Trade[];
}

interface DistributionEntry {
  range: string;
  count: number;
  wins: number;
  losses: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DistributionEntry }> }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="text-xs text-[#94a3b8] mb-1">{data.range}</p>
        <p className="text-sm font-bold text-white">{data.count} trades</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-[#22c55e]">{data.wins} gains</span>
          <span className="text-[10px] text-[#ef4444]">{data.losses} pertes</span>
        </div>
      </div>
    );
  }
  return null;
}

function isNegativeBucket(range: string): boolean {
  return range.startsWith('<') || range.startsWith('-');
}

export default function PnLDistribution({ trades }: PnLDistributionProps) {
  const data = getPnlDistribution(trades);
  const totalTrades = trades.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-white">Distribution des P&L</h3>
          <p className="text-xs text-[#94a3b8] mt-0.5">Repartition des gains et pertes</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]" />
              <span className="text-xs text-[#94a3b8]">Gain</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" />
              <span className="text-xs text-[#94a3b8]">Perte</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <BarChart3 className="h-3.5 w-3.5 text-[#94a3b8]" />
            <span className="text-xs font-medium text-[#94a3b8]">{totalTrades} trades</span>
          </div>
        </div>
      </div>

      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis
              dataKey="range"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={50}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={isNegativeBucket(entry.range) ? '#ef4444' : '#22c55e'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
