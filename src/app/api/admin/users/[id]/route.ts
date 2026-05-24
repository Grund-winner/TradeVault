import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    await ensureDatabase();

    const users = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, email, role, phone, locale, "initialBalance", "isActive", "siteName", "siteSubtitle", "createdAt" FROM users WHERE id = $1`, id
    );
    if (users.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const stats = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COUNT(*)::int as total_trades, COALESCE(SUM(pnl), 0) as total_pnl FROM trades WHERE "userId" = $1`, id
    );

    const subs = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM subscriptions WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 5`, id
    );

    return NextResponse.json({ user: users[0], stats: stats[0], subscriptions: subs });
  } catch (error) {
    console.error('[Admin] User detail error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    await ensureDatabase();

    const body = await request.json();
    const updates: string[] = [];
    const values: unknown[] = [];
    let pIdx = 1;

    if (body.role !== undefined) { updates.push(`role = $${pIdx}`); values.push(body.role); pIdx++; }
    if (body.isActive !== undefined) { updates.push(`"isActive" = $${pIdx}`); values.push(body.isActive); pIdx++; }
    if (body.phone !== undefined) { updates.push(`phone = $${pIdx}`); values.push(body.phone); pIdx++; }
    if (body.initialBalance !== undefined) { updates.push(`"initialBalance" = $${pIdx}`); values.push(Number(body.initialBalance)); pIdx++; }

    if (updates.length === 0) return NextResponse.json({ error: 'No updates' }, { status: 400 });

    updates.push(`"updatedAt" = NOW()`);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING id, email, role`;
    values.push(id);

    const result = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(query, ...values);
    return NextResponse.json({ user: result[0] });
  } catch (error) {
    console.error('[Admin] Update user error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
