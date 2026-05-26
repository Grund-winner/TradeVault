import { NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

interface TradeRow {
  id: number;
  date: string;
  instrument: string;
  category: string;
  direction: string;
  entry: number;
  stop_loss: number;
  take_profit: number;
  pnl: number;
  pnl_r: number;
  status: string;
  strategy: string;
  type: string;
  timeframe: string;
  pips: number;
  notes: string | null;
}

function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  try {
    await ensureDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const trades = await db.$queryRawUnsafe<TradeRow[]>(
      `SELECT id, date, instrument, category, direction, entry, stop_loss, take_profit,
              pnl, pnl_r, status, strategy, type, timeframe, pips, notes
       FROM trades
       WHERE "userId" = $1
       ORDER BY date DESC`,
      currentUser.id
    );

    const headers = [
      'Date',
      'Instrument',
      'Categorie',
      'Direction',
      'Entree',
      'StopLoss',
      'TakeProfit',
      'PnL',
      'PnL(R)',
      'Statut',
      'Strategie',
      'Type',
      'Timeframe',
      'Pips',
      'Notes',
    ];

    const rows = trades.map((t) =>
      [
        t.date,
        t.instrument,
        t.category,
        t.direction,
        t.entry,
        t.stop_loss,
        t.take_profit,
        t.pnl,
        t.pnl_r,
        t.status,
        t.strategy,
        t.type,
        t.timeframe,
        t.pips,
        t.notes ?? '',
      ]
        .map(escapeCsvField)
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');

    const today = new Date().toISOString().slice(0, 10);
    const filename = `tradevault_export_${today}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Export CSV] Erreur:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'export CSV' }, { status: 500 });
  }
}
