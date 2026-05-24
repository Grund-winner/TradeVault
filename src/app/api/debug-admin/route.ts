import { NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const results: Record<string, unknown> = {};

  // Step 1: Check auth
  try {
    const user = await getCurrentUser();
    results.auth = user ? { email: user.email, role: user.role } : 'null';
  } catch (e: unknown) {
    results.auth = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Step 2: Check DB connection
  try {
    await ensureDatabase();
    results.db = 'connected';
  } catch (e: unknown) {
    results.db = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Step 3: Test users query
  try {
    const userStats = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE "isActive") as active, COUNT(*) FILTER (WHERE role IN ('admin','host')) as admins FROM users`
    );
    results.usersQuery = userStats[0];
  } catch (e: unknown) {
    results.usersQuery = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Step 4: Test subscriptions query
  try {
    const subStats = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COUNT(*) FILTER (WHERE status = 'active' AND "paymentMethod" != 'trial') as active, COUNT(*) FILTER (WHERE "paymentMethod" = 'trial') as trial, COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) as revenue FROM subscriptions`
    );
    results.subscriptionsQuery = subStats[0];
  } catch (e: unknown) {
    results.subscriptionsQuery = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Step 5: Test trades query
  try {
    const tradeStats = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COUNT(*)::int as total, COALESCE(SUM(pnl), 0) as "totalPnl" FROM trades`
    );
    results.tradesQuery = tradeStats[0];
  } catch (e: unknown) {
    results.tradesQuery = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(results);
}
