import { NextResponse } from 'next/server';

export async function GET() {
  const results: Record<string, unknown> = {};

  try {
    results.step1 = 'handler reached';
    const { db, ensureDatabase } = await import('@/lib/db');
    results.step2 = 'db imported';
    await ensureDatabase();
    results.step3 = 'db ensured';
    const tables = await db.$queryRawUnsafe<Array<{tablename: string}>>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );
    results.step4 = 'tables queried';
    results.tables = tables.map(t => t.tablename);
  } catch (e: unknown) {
    results.error = e instanceof Error ? { message: e.message, stack: e.stack } : String(e);
  }

  return NextResponse.json(results);
}
