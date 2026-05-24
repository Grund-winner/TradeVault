import { NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    await ensureDatabase();

    const userStats = await db.$queryRawUnsafe<Array<{ total: number; active: number; admins: number }>>(
      `SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE "isActive") as active, COUNT(*) FILTER (WHERE role IN ('admin','host')) as admins FROM users`
    );

    const subStats = await db.$queryRawUnsafe<Array<{ active: number; trial: number; revenue: number }>>(
      `SELECT COUNT(*) FILTER (WHERE status = 'active' AND "paymentMethod" != 'trial') as active, COUNT(*) FILTER (WHERE "paymentMethod" = 'trial') as trial, COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) as revenue FROM subscriptions`
    );

    const tradeStats = await db.$queryRawUnsafe<Array<{ total: number; totalPnl: number }>>(
      `SELECT COUNT(*)::int as total, COALESCE(SUM(pnl), 0) as "totalPnl" FROM trades`
    );

    return NextResponse.json({
      users: userStats[0],
      subscriptions: subStats[0],
      trades: tradeStats[0],
    });
  } catch (error) {
    console.error('[Admin] Stats error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
