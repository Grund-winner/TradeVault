import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    await ensureDatabase();

    const trades = await db.trade.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(trades);
  } catch (error) {
    console.error('[Admin] User trades error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
