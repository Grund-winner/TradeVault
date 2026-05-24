import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const results: Record<string, unknown> = {};

    results.step1 = 'handler reached';

    const { db, ensureDatabase } = await import('@/lib/db');
    results.step2 = 'db imported';

    await ensureDatabase();
    results.step3 = 'db ensured';

    // Query 1: Users
    try {
      const userStats = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE "isActive") as active, COUNT(*) FILTER (WHERE role IN ('admin','host')) as admins FROM users`
      );
      results.users = userStats[0];
    } catch (e: unknown) {
      results.users_error = e instanceof Error ? e.message : String(e);
    }

    // Query 2: Subscriptions
    try {
      const subStats = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT COUNT(*) FILTER (WHERE status = 'active' AND "paymentMethod" != 'trial') as active, COUNT(*) FILTER (WHERE "paymentMethod" = 'trial') as trial, COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) as revenue FROM subscriptions`
      );
      results.subscriptions = subStats[0];
    } catch (e: unknown) {
      results.subscriptions_error = e instanceof Error ? e.message : String(e);
    }

    // Query 3: Trades
    try {
      const tradeStats = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT COUNT(*)::int as total, COALESCE(SUM(pnl), 0) as "totalPnl" FROM trades`
      );
      results.trades = tradeStats[0];
    } catch (e: unknown) {
      results.trades_error = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json(results);
  } catch (e: unknown) {
    return NextResponse.json({
      fatal: true,
      error: e instanceof Error ? { message: e.message, stack: e.stack } : String(e)
    }, { status: 500 });
  }
}
