import { NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';

export async function GET() {
  const results: Record<string, unknown> = {};

  await ensureDatabase();

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
}
