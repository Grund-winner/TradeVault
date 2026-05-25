import { NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { requireAdmin, safeJson } from '@/lib/auth';

// GET /api/admin/trades - Get all trades across all users with user emails
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }
    await ensureDatabase();

    const trades = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT t.id, t.date, t.instrument, t.category, t.direction, t.entry, t."stop_loss", t."take_profit",
              t.pnl, t.pnl_r, t.status, t.strategy, t.type, t.timeframe, t.notes, t.tags,
              t."createdAt", u.email as "userEmail"
       FROM trades t
       LEFT JOIN users u ON u.id = t."userId"
       ORDER BY t."createdAt" DESC
       LIMIT 500`
    );

    return NextResponse.json(safeJson(trades));
  } catch (error) {
    console.error('[Admin] Trades GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
