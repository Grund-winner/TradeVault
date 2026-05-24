import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';

// Webhook endpoint for MT4/MT5 Expert Advisor to push trades
// Authentication: uses API key from user's profile (mtApiKey field)
export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();

    const body = await request.json();
    const { apiKey, ticket, symbol, direction, entry, stopLoss, takeProfit, pnl, pips, lotSize, comment, magicNumber, openTime, closeTime } = body;

    // Validate API key
    if (!apiKey) {
      return NextResponse.json({ error: 'API key requise' }, { status: 401 });
    }

    // Find user by API key
    const users = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM users WHERE "mtApiKey" = $1 AND "isActive" = true`,
      apiKey
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'Cle API invalide' }, { status: 401 });
    }

    const userId = users[0].id;

    // Determine instrument category
    const sym = (symbol || '').toUpperCase();
    let category = 'FOREX';
    if (sym.includes('XAU') || sym.includes('XAG') || sym.includes('OIL') || sym.includes('NATGAS')) {
      category = 'COMMODITIES';
    } else if (sym.includes('.US') || sym.includes('AAPL') || sym.includes('TSLA') || sym.includes('AMZN')) {
      category = 'STOCKS';
    }

    // Determine direction
    const dir = (direction || 'BUY').toUpperCase() === 'BUY' ? 'Buy' : 'Sell';

    // Determine status
    const isWin = (pnl || 0) >= 0;
    const status = isWin ? 'Win' : 'Loss';

    // Calculate R-multiple
    const slDistance = entry && stopLoss ? Math.abs(entry - stopLoss) : 0;
    const pnlR = slDistance > 0 ? parseFloat(((pnl || 0) / slDistance).toFixed(2)) : (isWin ? 1.0 : -1.0);

    // Calculate pips based on instrument
    const calculatedPips = pips || calculatePips(symbol, entry, stopLoss, takeProfit, dir);

    // Format date
    const tradeDate = closeTime || openTime || new Date().toISOString().split('T')[0];

    await db.$executeRawUnsafe(
      `INSERT INTO trades (date, instrument, category, direction, entry, stop_loss, take_profit, pnl, pnl_r, status, strategy, type, timeframe, notes, tags, "userId", source, pips, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'mt4', $17, NOW(), NOW())`,
      tradeDate,
      symbol || 'UNKNOWN',
      category,
      dir,
      entry || 0,
      stopLoss || 0,
      takeProfit || 0,
      pnl || 0,
      pnlR,
      status,
      comment && comment !== '' ? comment.substring(0, 50) : 'MT Auto',
      'Intraday',
      'H1',
      comment || null,
      magicNumber ? `magic:${magicNumber}` : 'mt4',
      userId,
      calculatedPips || 0
    );

    // Update last sync timestamp on user
    await db.$executeRawUnsafe(
      `UPDATE users SET "mtLastSync" = NOW(), "updatedAt" = NOW() WHERE id = $1`,
      userId
    );

    return NextResponse.json({
      success: true,
      message: 'Trade synchronise avec succes',
    }, { status: 201 });

  } catch (error) {
    console.error('[TradeVault] MT4/MT5 Webhook error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Calculate pips for various instruments
function calculatePips(symbol: string, entry: number, sl: number, tp: number, direction: string): number {
  if (!symbol || !entry) return 0;

  const sym = symbol.toUpperCase();
  const pipSize = getPipSize(sym);
  const price = entry;

  if (direction === 'Buy') {
    if (tp) return Math.round(Math.abs(tp - price) / pipSize);
    if (sl) return -Math.round(Math.abs(sl - price) / pipSize);
  } else {
    if (tp) return Math.round(Math.abs(price - tp) / pipSize);
    if (sl) return -Math.round(Math.abs(price - sl) / pipSize);
  }

  return 0;
}

function getPipSize(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes('JPY')) return 0.01;
  if (s.includes('XAU')) return 0.1;
  if (s.includes('XAG')) return 0.01;
  if (s.includes('OIL') || s.includes('WTI') || s.includes('BRENT')) return 0.01;
  return 0.0001;
}
