import { NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser, safeJson } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'host') {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    await ensureDatabase();

    const userStats = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE "isActive")::int as active, COUNT(*) FILTER (WHERE role IN ('admin','host'))::int as admins FROM users`
    );

    const subStats = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COUNT(*) FILTER (WHERE status = 'active' AND "paymentMethod" != 'trial')::int as active, COUNT(*) FILTER (WHERE "paymentMethod" = 'trial')::int as trial, COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0)::float as revenue FROM subscriptions`
    );

    const tradeStats = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COUNT(*)::int as total, COALESCE(SUM(pnl), 0)::float as "totalPnl" FROM trades`
    );

    return NextResponse.json(safeJson({
      users: userStats[0],
      subscriptions: subStats[0],
      trades: tradeStats[0],
    }));
  } catch (error) {
    console.error('[Admin] Stats error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
