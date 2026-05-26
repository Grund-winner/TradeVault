// TradeVault - Types and helper functions

export type Direction = 'Buy' | 'Sell';
export type TradeType = 'Intraday' | 'Multiday';
export type Strategy = 'Breakout' | 'Momentum' | 'Mean Reversion' | 'Range';
export type InstrumentCategory = 'FOREX' | 'COMMODITIES' | 'STOCKS';
export type Timeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1' | 'W1' | 'MN';

export interface Trade {
  id: number;
  date: string;
  instrument: string;
  category: InstrumentCategory;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  pnl: number;
  pnlR: number;
  status: 'Win' | 'Loss';
  strategy: Strategy;
  type: TradeType;
  timeframe: Timeframe;
  notes?: string;
  tags?: string[];
}

export const trades: Trade[] = [];

// Max Drawdown calculation
function calculateMaxDrawdown(tradeList: Trade[]): number {
  if (tradeList.length === 0) return 0;
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;
  for (const t of tradeList) {
    cumulative += t.pnl;
    if (cumulative > peak) peak = cumulative;
    if (peak > 0) {
      const drawdown = (peak - cumulative) / peak * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
  }
  return Math.round(maxDrawdown * 10) / 10;
}

// Sharpe Ratio (simplified)
function calculateSharpe(tradeList: Trade[]): number {
  if (tradeList.length < 2) return 0;
  const returns = tradeList.map(t => t.pnl);
  const avg = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 0;
  return Math.round((avg / stdDev) * Math.sqrt(252) * 100) / 100;
}

// Sortino Ratio (only penalizes downside deviation)
function calculateSortino(tradeList: Trade[]): number {
  if (tradeList.length < 2) return 0;
  const returns = tradeList.map(t => t.pnl);
  const avg = returns.reduce((s, r) => s + r, 0) / returns.length;
  const downsideReturns = returns.filter(r => r < avg);
  if (downsideReturns.length === 0) return avg > 0 ? 99.9 : 0;
  const downsideVariance = downsideReturns.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / downsideReturns.length;
  const downsideDev = Math.sqrt(downsideVariance);
  if (downsideDev === 0) return 0;
  return Math.round((avg / downsideDev) * Math.sqrt(252) * 100) / 100;
}

// Helper functions to compute KPIs from trades
export function computeKPIs(tradeList: Trade[]) {
  const wins = tradeList.filter(t => t.status === 'Win');
  const losses = tradeList.filter(t => t.status === 'Loss');
  const grossPnl = tradeList.reduce((sum, t) => sum + t.pnl, 0);
  const grossWins = wins.reduce((sum, t) => sum + t.pnl, 0);
  const grossLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
  const winRate = tradeList.length > 0 ? (wins.length / tradeList.length) * 100 : 0;

  // Profit Factor: 999 = perfect (no losses), 0 = no trades
  let profitFactor: number;
  if (grossLosses > 0) {
    profitFactor = grossWins / grossLosses;
  } else if (grossWins > 0) {
    profitFactor = 999; // No losses = infinite
  } else {
    profitFactor = 0; // No trades at all
  }

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

  // Risk Reward: if no losses, show avgWinR; otherwise show ratio
  const riskReward = avgLossR !== 0 ? Math.abs(avgWinR / avgLossR) : (avgWinR > 0 ? avgWinR : 0);

  // Advanced KPIs
  const maxDrawdown = calculateMaxDrawdown(tradeList);
  const sharpeRatio = calculateSharpe(tradeList);
  const sortinoRatio = calculateSortino(tradeList);

  return {
    totalTrades: tradeList.length,
    grossPnl,
    netPnl: grossPnl,
    grossWins,
    grossLosses,
    winRate: Math.round(winRate * 10) / 10,
    profitFactor: profitFactor === 999 ? 999 : Math.round(profitFactor * 10) / 10,
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
    maxDrawdown,
    sharpeRatio,
    sortinoRatio,
  };
}

// Equity curve data
export function getEquityCurve(tradeList: Trade[]) {
  let cumulative = 0;
  return tradeList.map((t, i) => {
    cumulative += t.pnl;
    return { trade: i + 1, pnl: cumulative, label: `#${i + 1}` };
  });
}

// P&L per trade data
export function getPnlPerTrade(tradeList: Trade[]) {
  return tradeList.map((t, i) => ({
    trade: i + 1, pnl: t.pnl, label: `#${i + 1}`, status: t.status,
  }));
}

// Monthly P&L data
export function getMonthlyPnl(tradeList: Trade[]) {
  const months: Record<string, number> = {};
  for (const t of tradeList) {
    const key = t.date.substring(0, 7);
    months[key] = (months[key] || 0) + t.pnl;
  }
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, pnl]) => ({
      month, pnl,
      label: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    }));
}

// P&L distribution for histogram
export function getPnlDistribution(tradeList: Trade[]): { range: string; count: number; wins: number; losses: number }[] {
  if (tradeList.length === 0) return [];
  const buckets: Record<string, { count: number; wins: number; losses: number }> = {
    '< -1000': { count: 0, wins: 0, losses: 0 },
    '-1000/-500': { count: 0, wins: 0, losses: 0 },
    '-500/0': { count: 0, wins: 0, losses: 0 },
    '0/500': { count: 0, wins: 0, losses: 0 },
    '500/1000': { count: 0, wins: 0, losses: 0 },
    '> 1000': { count: 0, wins: 0, losses: 0 },
  };
  for (const t of tradeList) {
    let bucket: string;
    if (t.pnl < -1000) bucket = '< -1000';
    else if (t.pnl < -500) bucket = '-1000/-500';
    else if (t.pnl < 0) bucket = '-500/0';
    else if (t.pnl <= 500) bucket = '0/500';
    else if (t.pnl <= 1000) bucket = '500/1000';
    else bucket = '> 1000';
    buckets[bucket].count++;
    if (t.status === 'Win') buckets[bucket].wins++;
    else buckets[bucket].losses++;
  }
  return Object.entries(buckets).map(([range, data]) => ({ range, ...data }));
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
    strategy, ...data,
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
    category, ...data,
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
    direction, ...data,
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
    timeframe, ...data,
    total: data.wins + data.losses,
    winRate: Math.round((data.wins / (data.wins + data.losses)) * 100),
  }));
}
