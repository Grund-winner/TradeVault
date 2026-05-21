// TradeVault - Types and helper functions

export type Direction = 'Buy' | 'Sell';
export type TradeType = 'Intraday' | 'Multiday';
export type Strategy = 'Breakout' | 'Momentum' | 'Mean Reversion' | 'Range';
export type InstrumentCategory = 'FOREX' | 'COMMODITIES' | 'STOCKS';
export type Timeframe = '1h' | '2h' | '4h';

export interface Trade {
  id: number;
  date: string; // YYYY-MM-DD
  instrument: string;
  category: InstrumentCategory;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  pnl: number; // dollar P&L
  pnlR: number; // R-multiple
  status: 'Win' | 'Loss';
  strategy: Strategy;
  type: TradeType;
  timeframe: Timeframe;
}

// No pre-populated data - start empty, user adds their own trades
export const trades: Trade[] = [];

// localStorage persistence
const STORAGE_KEY = 'tradevault_trades';

export function loadTrades(): Trade[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveTrades(tradeList: Trade[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tradeList));
  } catch {
    // Storage full or unavailable
  }
}

// Helper functions to compute KPIs from trades
export function computeKPIs(tradeList: Trade[]) {
  const wins = tradeList.filter(t => t.status === 'Win');
  const losses = tradeList.filter(t => t.status === 'Loss');
  const grossPnl = tradeList.reduce((sum, t) => sum + t.pnl, 0);
  const grossWins = wins.reduce((sum, t) => sum + t.pnl, 0);
  const grossLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
  const winRate = tradeList.length > 0 ? (wins.length / tradeList.length) * 100 : 0;
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : 0;
  const totalR = tradeList.reduce((sum, t) => sum + t.pnlR, 0);
  const avgWinR = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnlR, 0) / wins.length : 0;
  const avgLossR = losses.length > 0 ? losses.reduce((sum, t) => sum + t.pnlR, 0) / losses.length : 0;
  const avgWinPnl = wins.length > 0 ? grossWins / wins.length : 0;
  const avgLossPnl = losses.length > 0 ? grossLosses / losses.length : 0;
  const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnlR)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnlR)) : 0;

  // Consecutive wins/losses
  let maxConsWins = 0, maxConsLosses = 0;
  let consWins = 0, consLosses = 0;
  for (const t of tradeList) {
    if (t.status === 'Win') { consWins++; consLosses = 0; maxConsWins = Math.max(maxConsWins, consWins); }
    else { consLosses++; consWins = 0; maxConsLosses = Math.max(maxConsLosses, consLosses); }
  }

  // Risk reward ratio
  const avgRisk = tradeList.reduce((sum, t) => sum + Math.abs(t.pnlR), 0) / tradeList.length;
  const riskReward = avgLossR !== 0 ? Math.abs(avgWinR / avgLossR) : 0;

  return {
    totalTrades: tradeList.length,
    grossPnl,
    netPnl: grossPnl, // Same as gross in this case
    grossWins,
    grossLosses,
    winRate: Math.round(winRate * 10) / 10,
    profitFactor: Math.round(profitFactor * 10) / 10,
    totalR: Math.round(totalR * 10) / 10,
    avgWinR: Math.round(avgWinR * 10) / 10,
    avgLossR: Math.round(avgLossR * 10) / 10,
    avgWinPnl: Math.round(avgWinPnl),
    avgLossPnl: Math.round(avgLossPnl),
    largestWin: Math.round(largestWin * 10) / 10,
    largestLoss: Math.round(largestLoss * 10) / 10,
    maxConsWins,
    maxConsLosses,
    riskReward: Math.round(riskReward * 10) / 10,
  };
}

// Equity curve data (cumulative P&L)
export function getEquityCurve(tradeList: Trade[]) {
  let cumulative = 0;
  return tradeList.map((t, i) => {
    cumulative += t.pnl;
    return {
      trade: i + 1,
      pnl: cumulative,
      label: `#${i + 1}`,
    };
  });
}

// P&L per trade data
export function getPnlPerTrade(tradeList: Trade[]) {
  return tradeList.map((t, i) => ({
    trade: i + 1,
    pnl: t.pnl,
    label: `#${i + 1}`,
    status: t.status,
  }));
}

// Monthly P&L data
export function getMonthlyPnl(tradeList: Trade[]) {
  const months: Record<string, number> = {};
  for (const t of tradeList) {
    const key = t.date.substring(0, 7); // YYYY-MM
    months[key] = (months[key] || 0) + t.pnl;
  }
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, pnl]) => ({
      month,
      pnl,
      label: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    }));
}

// Strategy breakdown
export function getStrategyBreakdown(tradeList: Trade[]) {
  const strategies: Record<string, { wins: number; losses: number; pnl: number; totalR: number }> = {};
  for (const t of tradeList) {
    if (!strategies[t.strategy]) strategies[t.strategy] = { wins: 0, losses: 0, pnl: 0, totalR: 0 };
    if (t.status === 'Win') strategies[t.strategy].wins++;
    else strategies[t.strategy].losses++;
    strategies[t.strategy].pnl += t.pnl;
    strategies[t.strategy].totalR += t.pnlR;
  }
  return Object.entries(strategies).map(([strategy, data]) => ({
    strategy,
    ...data,
    total: data.wins + data.losses,
    winRate: Math.round((data.wins / (data.wins + data.losses)) * 100),
  }));
}

// Instrument breakdown
export function getInstrumentBreakdown(tradeList: Trade[]) {
  const categories: Record<string, { wins: number; losses: number; pnl: number }> = {};
  for (const t of tradeList) {
    if (!categories[t.category]) categories[t.category] = { wins: 0, losses: 0, pnl: 0 };
    if (t.status === 'Win') categories[t.category].wins++;
    else categories[t.category].losses++;
    categories[t.category].pnl += t.pnl;
  }
  return Object.entries(categories).map(([category, data]) => ({
    category,
    ...data,
    total: data.wins + data.losses,
    winRate: Math.round((data.wins / (data.wins + data.losses)) * 100),
  }));
}

// Direction breakdown
export function getDirectionBreakdown(tradeList: Trade[]) {
  const dirs: Record<string, { wins: number; losses: number; pnl: number; totalR: number }> = {};
  for (const t of tradeList) {
    if (!dirs[t.direction]) dirs[t.direction] = { wins: 0, losses: 0, pnl: 0, totalR: 0 };
    if (t.status === 'Win') dirs[t.direction].wins++;
    else dirs[t.direction].losses++;
    dirs[t.direction].pnl += t.pnl;
    dirs[t.direction].totalR += t.pnlR;
  }
  return Object.entries(dirs).map(([direction, data]) => ({
    direction,
    ...data,
    total: data.wins + data.losses,
    winRate: Math.round((data.wins / (data.wins + data.losses)) * 100),
  }));
}

// Timeframe breakdown
export function getTimeframeBreakdown(tradeList: Trade[]) {
  const tf: Record<string, { wins: number; losses: number; pnl: number; totalR: number }> = {};
  for (const t of tradeList) {
    if (!tf[t.timeframe]) tf[t.timeframe] = { wins: 0, losses: 0, pnl: 0, totalR: 0 };
    if (t.status === 'Win') tf[t.timeframe].wins++;
    else tf[t.timeframe].losses++;
    tf[t.timeframe].pnl += t.pnl;
    tf[t.timeframe].totalR += t.pnlR;
  }
  return Object.entries(tf).map(([timeframe, data]) => ({
    timeframe,
    ...data,
    total: data.wins + data.losses,
    winRate: Math.round((data.wins / (data.wins + data.losses)) * 100),
  }));
}
