import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

interface TradeRow {
  pnl: number;
  pnl_r: number;
  strategy: string;
}

interface BacktestRequest {
  startingCapital: number;
  riskPerTrade: number;
  numberOfTrades: number;
  strategy: string;
  targetRr: number;
}

// Box-Muller transform for normal distribution using Math.random()
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + stdDev * z;
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const body: BacktestRequest = await request.json();

    const {
      startingCapital = 10000,
      riskPerTrade = 2,
      numberOfTrades = 100,
      strategy = 'all',
      targetRr = 2.0,
    } = body;

    // Validate inputs
    if (startingCapital <= 0) {
      return NextResponse.json({ error: 'Le capital de depart doit etre positif' }, { status: 400 });
    }
    if (riskPerTrade < 0.5 || riskPerTrade > 10) {
      return NextResponse.json({ error: 'Le risque par trade doit etre entre 0.5% et 10%' }, { status: 400 });
    }
    if (numberOfTrades < 10 || numberOfTrades > 500) {
      return NextResponse.json({ error: 'Le nombre de trades doit etre entre 10 et 500' }, { status: 400 });
    }

    // Fetch user's existing trades using raw SQL
    let trades: TradeRow[];
    if (strategy === 'all') {
      trades = await db.$queryRawUnsafe<TradeRow[]>(
        `SELECT pnl, pnl_r, strategy FROM trades WHERE "userId" = $1 AND status IN ('Win', 'Loss')`,
        currentUser.id
      );
    } else {
      trades = await db.$queryRawUnsafe<TradeRow[]>(
        `SELECT pnl, pnl_r, strategy FROM trades WHERE "userId" = $1 AND status IN ('Win', 'Loss') AND strategy = $2`,
        currentUser.id,
        strategy
      );
    }

    // Check if user has enough historical data
    if (trades.length < 1) {
      return NextResponse.json(
        { error: 'Pas assez de donnees historiques. Ajoutez au moins 1 trade ferme pour lancer une simulation.' },
        { status: 400 }
      );
    }

    // Compute actual stats from historical trades
    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl <= 0);

    const winRate = trades.length > 0 ? wins.length / trades.length : 0.5;

    // Compute R-multiple stats
    const winRs = wins.map((t) => t.pnl_r).filter((r) => r > 0);
    const avgWinR = winRs.length > 0 ? winRs.reduce((a, b) => a + b, 0) / winRs.length : targetRr;
    const avgLossR = 1; // Always assume 1R loss

    // Compute average dollar wins/losses for context
    const avgWinDollar = wins.length > 0
      ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length
      : 0;
    const avgLossDollar = losses.length > 0
      ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length)
      : 0;

    // Compute standard deviation of win R-multiples for realistic simulation
    const winRStdDev = winRs.length > 1
      ? Math.sqrt(winRs.reduce((sum, r) => sum + Math.pow(r - avgWinR, 2), 0) / (winRs.length - 1))
      : avgWinR * 0.3; // Default to 30% of avg if not enough data

    // Strategy distribution from user's trades
    const strategyCounts: Record<string, number> = {};
    for (const t of trades) {
      strategyCounts[t.strategy] = (strategyCounts[t.strategy] || 0) + 1;
    }

    // ========== Monte Carlo Simulation ==========
    const equityCurve: Array<{ trade: number; equity: number }> = [];
    let capital = startingCapital;
    let peak = startingCapital;
    let maxDrawdown = 0;
    let totalR = 0;
    let simWins = 0;
    const tradeReturns: number[] = [];

    for (let i = 1; i <= numberOfTrades; i++) {
      const riskAmount = capital * (riskPerTrade / 100);

      // Determine win/loss based on actual win rate
      const isWin = Math.random() < winRate;

      let pnl: number;
      if (isWin) {
        simWins++;
        // Use normal distribution for realistic win R-multiples
        // Clamp to a minimum of 0.1R to avoid negative wins
        const winR = Math.max(0.1, randomNormal(avgWinR, winRStdDev));
        pnl = winR * riskAmount;
        totalR += winR;
      } else {
        // Loss is always 1R (fixed stop loss)
        pnl = -avgLossR * riskAmount;
        totalR -= avgLossR;
      }

      capital += pnl;
      tradeReturns.push(pnl / (capital - pnl) * 100); // percentage return per trade

      // Track max drawdown
      if (capital > peak) {
        peak = capital;
      }
      const drawdown = ((peak - capital) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      equityCurve.push({
        trade: i,
        equity: Math.round(capital * 100) / 100,
      });
    }

    // Compute summary stats
    const finalCapital = capital;
    const totalReturn = ((finalCapital - startingCapital) / startingCapital) * 100;
    const simWinRate = numberOfTrades > 0 ? (simWins / numberOfTrades) * 100 : 0;

    // Compute Sharpe Ratio (simplified)
    // Sharpe = mean(return%) / std(return%) * sqrt(N)
    let sharpeRatio = 0;
    if (tradeReturns.length > 1) {
      const meanReturn = tradeReturns.reduce((a, b) => a + b, 0) / tradeReturns.length;
      const variance = tradeReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (tradeReturns.length - 1);
      const stdReturn = Math.sqrt(variance);
      sharpeRatio = stdReturn > 0 ? (meanReturn / stdReturn) * Math.sqrt(tradeReturns.length) : 0;
      sharpeRatio = Math.round(Math.max(-3, Math.min(3, sharpeRatio)) * 100) / 100;
    }

    // Compute monthly returns (distribute trades evenly across 12 months)
    const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
    const tradesPerMonth = Math.ceil(numberOfTrades / 12);
    const monthlyReturns: Array<{ month: string; return: number }> = [];

    for (let m = 0; m < 12; m++) {
      const startIdx = m * tradesPerMonth;
      const endIdx = Math.min(startIdx + tradesPerMonth, numberOfTrades);
      if (startIdx >= numberOfTrades) break;

      const startEquity = startIdx === 0
        ? startingCapital
        : equityCurve[startIdx - 1]?.equity ?? startingCapital;
      const endEquity = equityCurve[endIdx - 1]?.equity ?? capital;
      const monthReturn = startEquity > 0
        ? ((endEquity - startEquity) / startEquity) * 100
        : 0;

      monthlyReturns.push({
        month: monthNames[m],
        return: Math.round(monthReturn * 100) / 100,
      });
    }

    return NextResponse.json({
      summary: {
        finalCapital: Math.round(finalCapital * 100) / 100,
        totalReturn: Math.round(totalReturn * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        sharpeRatio,
        winRate: Math.round(simWinRate * 10) / 10,
        totalR: Math.round(totalR * 100) / 100,
      },
      equityCurve,
      monthlyReturns,
      simulationCount: numberOfTrades,
      stats: {
        historicalWinRate: Math.round(winRate * 1000) / 10,
        historicalTrades: trades.length,
        avgWinR: Math.round(avgWinR * 100) / 100,
        avgLossR,
        avgWinDollar: Math.round(avgWinDollar * 100) / 100,
        avgLossDollar: Math.round(avgLossDollar * 100) / 100,
        strategyDistribution: strategyCounts,
      },
    });
  } catch (error) {
    console.error('[Backtest] Error running simulation:', error);
    return NextResponse.json({ error: 'Erreur lors de la simulation' }, { status: 500 });
  }
}
