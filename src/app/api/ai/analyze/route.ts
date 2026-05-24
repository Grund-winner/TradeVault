import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, ensureDatabase } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/ai/analyze — AI analyzes user's trading performance
export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { type } = await request.json().catch(() => ({}));
    const analysisType = type || 'full';

    // Fetch user's trades
    const trades = await db.trade.findMany({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
    });

    if (trades.length === 0) {
      return NextResponse.json({
        analysis: null,
        message: 'Ajoutez des trades pour obtenir une analyse IA.',
      });
    }

    // Compute key metrics
    const wins = trades.filter(t => t.status === 'Win');
    const losses = trades.filter(t => t.status === 'Loss');
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
    const winRate = (wins.length / trades.length) * 100;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
    const totalR = trades.reduce((s, t) => s + t.pnlR, 0);
    const grossWins = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLosses = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLosses > 0 ? (grossWins / grossLosses).toFixed(2) : 'Infinity';

    // Strategy breakdown
    const strategies: Record<string, { wins: number; losses: number; pnl: number }> = {};
    for (const t of trades) {
      if (!strategies[t.strategy]) strategies[t.strategy] = { wins: 0, losses: 0, pnl: 0 };
      if (t.status === 'Win') strategies[t.strategy].wins++;
      else strategies[t.strategy].losses++;
      strategies[t.strategy].pnl += t.pnl;
    }

    // Direction breakdown
    const buyTrades = trades.filter(t => t.direction === 'Buy');
    const sellTrades = trades.filter(t => t.direction === 'Sell');
    const buyWinRate = buyTrades.length > 0 ? ((buyTrades.filter(t => t.status === 'Win').length / buyTrades.length) * 100).toFixed(1) : 0;
    const sellWinRate = sellTrades.length > 0 ? ((sellTrades.filter(t => t.status === 'Win').length / sellTrades.length) * 100).toFixed(1) : 0;

    // Instrument breakdown
    const instruments: Record<string, { count: number; pnl: number; wins: number }> = {};
    for (const t of trades) {
      if (!instruments[t.instrument]) instruments[t.instrument] = { count: 0, pnl: 0, wins: 0 };
      instruments[t.instrument].count++;
      instruments[t.instrument].pnl += t.pnl;
      if (t.status === 'Win') instruments[t.instrument].wins++;
    }

    // Consecutive streaks
    let maxConsWins = 0, maxConsLosses = 0, consW = 0, consL = 0;
    for (const t of trades) {
      if (t.status === 'Win') { consW++; consL = 0; maxConsWins = Math.max(maxConsWins, consW); }
      else { consL++; consW = 0; maxConsLosses = Math.max(maxConsLosses, consL); }
    }

    // Build analysis prompt
    const prompt = `Tu es un coach expert en trading. Analyse les statistiques de trading suivantes et fournis une analyse détaillée en français avec des recommandations concrètes.

STATISTIQUES DU TRADER:
- Total trades: ${trades.length}
- Win Rate: ${winRate.toFixed(1)}%
- Gains: ${wins.length} / Pertes: ${losses.length}
- P&L Net: $${totalPnl.toFixed(2)}
- Total R: ${totalR.toFixed(1)}R
- Profit Factor: ${profitFactor}
- Gain moyen: $${avgWin.toFixed(2)} / Perte moyenne: $${avgLoss.toFixed(2)}
- Max series gagnantes: ${maxConsWins} / Max series perdantes: ${maxConsLosses}

PAR STRATEGIE:
${Object.entries(strategies).map(([s, d]) => `- ${s}: ${d.wins + d.losses} trades, P&L: $${d.pnl.toFixed(2)}`).join('\n')}

PAR DIRECTION:
- Buy: ${buyTrades.length} trades, Win Rate: ${buyWinRate}%
- Sell: ${sellTrades.length} trades, Win Rate: ${sellWinRate}%

PAR INSTRUMENT (top 5):
${Object.entries(instruments).sort((a, b) => b[1].count - a[1].count).slice(0, 5).map(([i, d]) => `- ${i}: ${d.count} trades, WR: ${((d.wins/d.count)*100).toFixed(0)}%, P&L: $${d.pnl.toFixed(2)}`).join('\n')}

${analysisType === 'quick'
  ? 'Donne une analyse rapide en 3-5 points clés avec des recommandations.'
  : 'Donne une analyse complète avec: 1) Forces et faiblesses 2) Recommandations par stratégie 3) Gestion du risque 4) Plan d\'action concret. Sois spécifique et actionnable.'}

Formate ta réponse en markdown avec des titres (##), des puces (-) et met les chiffres importants en **gras**.`;

    // Call AI
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Tu es un coach de trading professionnel et analyste quantitatif. Tu analyses les statistiques de trading avec précision et donnes des recommandations concrètes et actionnables. Tu réponds toujours en français.'
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const analysis = completion.choices[0]?.message?.content || 'Analyse indisponible.';

    // Save to conversation history
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO ai_conversations ("userId", messages, "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW())`,
        user.id,
        JSON.stringify([
          { role: 'system', content: 'Analyse de performance' },
          { role: 'user', content: `Analyse ${analysisType} demandée` },
          { role: 'assistant', content: analysis },
        ])
      );
    } catch (e) {
      console.error('[AI] Failed to save conversation:', e);
    }

    return NextResponse.json({
      analysis,
      metrics: {
        totalTrades: trades.length,
        winRate: winRate.toFixed(1),
        totalPnl: totalPnl.toFixed(2),
        profitFactor,
        totalR: totalR.toFixed(1),
      },
    });

  } catch (error) {
    console.error('[TradeVault] AI analyze error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'analyse IA' }, { status: 500 });
  }
}
