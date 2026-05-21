'use client';

import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Trade, Direction, TradeType, Strategy, InstrumentCategory, Timeframe } from '@/lib/mock-data';

export interface Filters {
  year: number | 'Tous';
  month: string | null;
  direction: Direction | 'Tous';
  type: TradeType | 'Tous';
  strategy: Strategy | 'Tous';
  instrument: InstrumentCategory | 'Tous';
  timeframe: Timeframe | 'Tous';
}

export interface FiltersBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  trades: Trade[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function applyFilters(trades: Trade[], filters: Filters, searchQuery: string): Trade[] {
  return trades.filter(t => {
    if (filters.year !== 'Tous' && t.date.substring(0, 4) !== filters.year.toString()) return false;
    if (filters.month && t.date.substring(5, 7) !== filters.month.padStart(2, '0')) return false;
    if (filters.direction !== 'Tous' && t.direction !== filters.direction) return false;
    if (filters.type !== 'Tous' && t.type !== filters.type) return false;
    if (filters.strategy !== 'Tous' && t.strategy !== filters.strategy) return false;
    if (filters.instrument !== 'Tous' && t.category !== filters.instrument) return false;
    if (filters.timeframe !== 'Tous' && t.timeframe !== filters.timeframe) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const searchable = `${t.instrument} ${t.direction} ${t.strategy} ${t.category} ${t.type} ${t.timeframe} ${t.date}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });
}

const months = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Fevrier' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Aout' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Decembre' },
];

const strategies: Array<Strategy | 'Tous'> = ['Tous', 'Breakout', 'Momentum', 'Mean Reversion', 'Range'];
const instruments: Array<InstrumentCategory | 'Tous'> = ['Tous', 'FOREX', 'COMMODITIES', 'STOCKS'];
const directions: Array<Direction | 'Tous'> = ['Tous', 'Buy', 'Sell'];
const tradeTypes: Array<TradeType | 'Tous'> = ['Tous', 'Intraday', 'Multiday'];
const timeframes: Array<Timeframe | 'Tous'> = ['Tous', 'M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];

function FilterSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Tous',
  className = '',
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[130px] h-9 text-xs font-medium bg-muted border-border text-foreground hover:bg-muted/80 hover:border-border focus:border-[#ff6b2b]/40 focus:ring-[#ff6b2b]/20 rounded-xl transition-all">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border rounded-xl">
          {options.map(opt => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="text-xs text-foreground hover:bg-muted rounded-lg cursor-pointer focus:bg-muted focus:text-[#ff6b2b]"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function FiltersBar({ filters, onFiltersChange, trades, searchQuery, onSearchChange }: FiltersBarProps) {
  const update = (partial: Partial<Filters>) => onFiltersChange({ ...filters, ...partial });

  // Dynamic years from data
  const uniqueYears = [...new Set(trades.map(t => parseInt(t.date.substring(0, 4))))].sort((a, b) => b - a);

  const yearOptions = [
    { value: 'Tous', label: 'Toutes les annees' },
    ...uniqueYears.map(y => ({ value: y.toString(), label: y.toString() })),
  ];

  const monthOptions = [
    { value: '__all__', label: 'Tous les mois' },
    ...months.map(m => ({ value: m.value, label: m.label })),
  ];

  const directionOptions = directions.map(d => ({ value: d, label: d }));
  const typeOptions = tradeTypes.map(t => ({ value: t, label: t }));
  const strategyOptions = strategies.map(s => ({ value: s, label: s }));
  const instrumentOptions = instruments.map(i => ({ value: i, label: i }));
  const timeframeOptions = timeframes.map(tf => ({ value: tf, label: tf }));

  const activeFilterCount = [
    filters.year !== 'Tous',
    filters.month !== null,
    filters.direction !== 'Tous',
    filters.type !== 'Tous',
    filters.strategy !== 'Tous',
    filters.instrument !== 'Tous',
    filters.timeframe !== 'Tous',
    searchQuery !== '',
  ].filter(Boolean).length;

  const resetAll = () => {
    onFiltersChange({
      year: 'Tous',
      month: null,
      direction: 'Tous',
      type: 'Tous',
      strategy: 'Tous',
      instrument: 'Tous',
      timeframe: 'Tous',
    });
    onSearchChange('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-card rounded-2xl p-4 mb-6"
    >
      {/* Search Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border focus-within:border-[#ff6b2b]/30 transition-colors">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Rechercher un instrument, strategie, date..."
            className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/50 w-full"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')} className="text-muted-foreground hover:text-foreground transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={resetAll}
            className="px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground bg-muted border border-border hover:border-[#ef4444]/30 hover:text-[#ef4444] transition-all whitespace-nowrap"
          >
            Reinitialiser ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Filter Dropdowns - Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <FilterSelect
          label="Annee"
          value={filters.year === 'Tous' ? 'Tous' : filters.year.toString()}
          options={yearOptions}
          onChange={v => update({ year: v === 'Tous' ? 'Tous' : parseInt(v), month: null })}
        />
        <FilterSelect
          label="Mois"
          value={filters.month || '__all__'}
          options={monthOptions}
          onChange={v => update({ month: v === '__all__' ? null : v })}
        />
        <FilterSelect
          label="Direction"
          value={filters.direction}
          options={directionOptions}
          onChange={v => update({ direction: v as Direction | 'Tous' })}
        />
        <FilterSelect
          label="Type"
          value={filters.type}
          options={typeOptions}
          onChange={v => update({ type: v as TradeType | 'Tous' })}
        />
        <FilterSelect
          label="Strategie"
          value={filters.strategy}
          options={strategyOptions}
          onChange={v => update({ strategy: v as Strategy | 'Tous' })}
        />
        <FilterSelect
          label="Instrument"
          value={filters.instrument}
          options={instrumentOptions}
          onChange={v => update({ instrument: v as InstrumentCategory | 'Tous' })}
        />
        <FilterSelect
          label="Timeframe"
          value={filters.timeframe}
          options={timeframeOptions}
          onChange={v => update({ timeframe: v as Timeframe | 'Tous' })}
        />
      </div>
    </motion.div>
  );
}
