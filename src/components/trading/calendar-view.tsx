'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { computeKPIs, type Trade } from '@/lib/mock-data';

interface CalendarViewProps {
  trades: Trade[];
}

export default function CalendarView({ trades }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 0, 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const kpis = computeKPIs(trades);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
  ];
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Group trades by date
  const tradesByDate = useMemo(() => {
    const map: Record<string, Trade[]> = {};
    trades.forEach(t => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return map;
  }, [trades]);

  // Calendar grid data
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = lastDay.getDate();

    const days: Array<{ date: string; day: number; inMonth: boolean }> = [];

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonth.getDate() - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      days.push({
        date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        inMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        inMonth: true,
      });
    }

    // Next month days (fill to 42 cells = 6 rows)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      days.push({
        date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        inMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // Month P&L summary
  const monthTrades = trades.filter(t => t.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`));
  const monthPnl = monthTrades.reduce((sum, t) => sum + t.pnl, 0);
  const monthWins = monthTrades.filter(t => t.status === 'Win').length;
  const monthLosses = monthTrades.filter(t => t.status === 'Loss').length;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedDayTrades = selectedDay ? (tradesByDate[selectedDay] || []) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Calendrier de Trading</h3>
          <p className="text-xs text-[#94a3b8] mt-0.5">Visualisez vos trades jour par jour</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl bg-white/5 border border-white/[0.06] text-[#94a3b8] hover:text-white hover:border-[#ff6b2b]/20 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <h4 className="text-base font-bold text-white">{monthNames[month]} {year}</h4>
              <div className="flex items-center justify-center gap-3 mt-1">
                <span className={`text-xs font-medium ${monthPnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {monthPnl >= 0 ? '+' : ''}${monthPnl.toLocaleString()}
                </span>
                <span className="text-[10px] text-[#94a3b8]">
                  {monthWins}W / {monthLosses}L
                </span>
              </div>
            </div>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl bg-white/5 border border-white/[0.06] text-[#94a3b8] hover:text-white hover:border-[#ff6b2b]/20 transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(d => (
              <div key={d} className="text-center text-[10px] text-[#94a3b8] font-semibold uppercase tracking-wider py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const dayTrades = tradesByDate[day.date] || [];
              const hasTrades = dayTrades.length > 0;
              const isSelected = selectedDay === day.date;
              const isToday = day.date === new Date().toISOString().split('T')[0];

              return (
                <motion.button
                  key={i}
                  onClick={() => hasTrades ? setSelectedDay(isSelected ? null : day.date) : null}
                  whileHover={hasTrades ? { scale: 1.05 } : {}}
                  whileTap={hasTrades ? { scale: 0.95 } : {}}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
                    !day.inMonth
                      ? 'opacity-20'
                      : isSelected
                        ? 'bg-[#ff6b2b]/20 border border-[#ff6b2b]/40 shadow-lg shadow-orange-500/10'
                        : hasTrades
                          ? 'bg-white/[0.04] hover:bg-white/[0.08] border border-transparent hover:border-white/[0.08] cursor-pointer'
                          : 'hover:bg-white/[0.02]'
                  } ${isToday ? 'ring-1 ring-[#ff6b2b]/30' : ''}`}
                >
                  <span className={`text-xs ${day.inMonth ? 'text-white' : 'text-[#94a3b8]'} font-medium`}>
                    {day.day}
                  </span>
                  {hasTrades && day.inMonth && (
                    <div className="flex gap-0.5">
                      {dayTrades.slice(0, 4).map((t, j) => (
                        <div
                          key={j}
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.status === 'Win' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'
                          }`}
                        />
                      ))}
                      {dayTrades.length > 4 && (
                        <span className="text-[8px] text-[#94a3b8]">+</span>
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        <div className="glass-card rounded-2xl p-6 h-fit">
          <h4 className="text-sm font-semibold text-white mb-4">
            {selectedDay
              ? `Trades du ${new Date(selectedDay + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`
              : 'Selectionnez un jour'
            }
          </h4>

          <AnimatePresence mode="wait">
            {selectedDay && selectedDayTrades.length > 0 ? (
              <motion.div
                key={selectedDay}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {selectedDayTrades.map(trade => (
                  <div
                    key={trade.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">{trade.instrument}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        trade.direction === 'Long'
                          ? 'bg-[#22c55e]/15 text-[#22c55e]'
                          : 'bg-[#ef4444]/15 text-[#ef4444]'
                      }`}>
                        {trade.direction}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#94a3b8]">{trade.strategy} · {trade.timeframe}</span>
                      <span className={`text-sm font-bold ${trade.pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#94a3b8]">Total du jour</span>
                    <span className={`text-sm font-bold ${
                      selectedDayTrades.reduce((s, t) => s + t.pnl, 0) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                    }`}>
                      {selectedDayTrades.reduce((s, t) => s + t.pnl, 0) >= 0 ? '+' : ''}$
                      {selectedDayTrades.reduce((s, t) => s + t.pnl, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : selectedDay ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <p className="text-sm text-[#94a3b8]">Aucun trade ce jour</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="w-12 h-12 rounded-xl bg-[#ff6b2b]/10 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-5 w-5 text-[#ff6b2b]" />
                </div>
                <p className="text-sm text-[#94a3b8]">Cliquez sur un jour avec des trades pour voir les details</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Monthly Legend */}
          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <h5 className="text-[10px] text-[#94a3b8] uppercase tracking-wider font-semibold mb-3">Resume du mois</h5>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-[#22c55e]" />
                <div>
                  <p className="text-[10px] text-[#94a3b8]">Gains</p>
                  <p className="text-sm font-bold text-[#22c55e]">{monthWins}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-3.5 w-3.5 text-[#ef4444]" />
                <div>
                  <p className="text-[10px] text-[#94a3b8]">Pertes</p>
                  <p className="text-sm font-bold text-[#ef4444]">{monthLosses}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
