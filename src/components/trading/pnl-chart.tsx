'use client';

import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getPnlPerTrade, type Trade } from '@/lib/mock-data';

interface PnlChartProps {
  trades: Trade[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: { status: string; pnl: number } }>; label?: string }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="text-xs text-[#94a3b8] mb-1">Trade {label}</p>
        <p className={`text-sm font-bold ${data.pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {data.pnl >= 0 ? '+' : ''}${data.pnl.toLocaleString()}
        </p>
        <p className={`text-[10px] mt-0.5 ${data.status === 'Win' ? 'text-[#22c55e]/70' : 'text-[#ef4444]/70'}`}>
          {data.status}
        </p>
      </div>
    );
  }
  return null;
}

export default function PnlChart({ trades }: PnlChartProps) {
  const data = getPnlPerTrade(trades);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-white">P&L par Trade</h3>
          <p className="text-xs text-[#94a3b8] mt-0.5">Performance individuelle</p>
        </div>
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
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
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
              tickFormatter={(v) => `$${v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="pnl"
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'}
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
